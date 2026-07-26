"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Crown, Shield, Languages, Youtube, Reply, Heart, ThumbsUp, Laugh, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    channel_id: string;
    parent_id?: string;
    is_deleted?: boolean;
    sender?: {
        full_name: string;
        avatar_url?: string;
        is_admin?: boolean;
        is_translator?: boolean;
        is_youtuber?: boolean;
    };
    reactions?: any[];
    reply_to?: Message;
}

interface MessageListProps {
    channelId: string;
    currentUserId: string;
}

export function MessageList({ channelId, currentUserId, onReply }: MessageListProps & { onReply?: (msg: Message) => void }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [typingUsers, setTypingUsers] = useState<any[]>([]);
    const [seenUsers, setSeenUsers] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topObserverRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>([]);

    // Keep ref in sync
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        fetchMessages(true);
        markAsSeen();

        // 1. Subscribe to new messages & updates
        const messagesChannel = supabase
            .channel(`chat:messages:${channelId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channelId}` },
                async (payload) => {
                    console.log('New message payload received:', payload);
                    const newMsg = payload.new as Message;
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url, is_admin, is_translator, is_youtuber')
                        .eq('id', newMsg.user_id)
                        .single();

                    const msgWithSender = { ...newMsg, sender: profile || { full_name: 'Unknown' }, reactions: [] };
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, msgWithSender];
                    });
                    markAsSeen();
                }
            )
            .subscribe((status) => {
                console.log(`Messages channel status (${channelId}):`, status);
            });

        // 2. Subscribe to typing indicators
        const typingChannel = supabase.channel(`typing:${channelId}`);
        typingChannel
            .on('presence', { event: 'sync' }, () => {
                const state = typingChannel.presenceState();
                console.log('Typing presence sync:', state);
                const users = Object.values(state).flat().filter((u: any) => u.user_id !== currentUserId);
                setTypingUsers(users);
            })
            .subscribe((status) => {
                console.log(`Typing channel status (${channelId}):`, status);
            });

        // 3. Subscribe to reactions & seen receipts
        const updatesChannel = supabase
            .channel(`chat:updates:${channelId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'community_reactions' },
                () => refreshMetadata()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'community_seen_receipts', filter: `channel_id=eq.${channelId}` },
                () => fetchSeenUsers()
            )
            .subscribe((status) => {
                console.log(`Updates channel status for ${channelId}:`, status);
            });

        return () => {
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(typingChannel);
            supabase.removeChannel(updatesChannel);
        };
    }, [channelId]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!topObserverRef.current || !hasMore || loading) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loadingMore) {
                fetchMessages(false);
            }
        }, { threshold: 0.5 });

        observer.observe(topObserverRef.current);
        return () => observer.disconnect();
    }, [topObserverRef.current, hasMore, loadingMore, messages]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchMessages = async (isInitial = false) => {
        if (isInitial) {
            console.log(`[fetchMessages] Initial fetch started for channel: ${channelId}`);
            setLoading(true);
        }
        else {
            console.log(`[fetchMessages] Loading more messages for channel: ${channelId}, current oldest: ${messages.length > 0 ? messages[0].created_at : 'N/A'}`);
            setLoadingMore(true);
        }

        try {
            let query = supabase
                .from('community_messages')
                .select('*')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false }) // Fetch latest first for pagination
                .limit(20);

            if (!isInitial && messages.length > 0) {
                const oldestCreatedAt = messages[0].created_at;
                query = query.lt('created_at', oldestCreatedAt);
                console.log(`[fetchMessages] Applying cursor: messages created before ${oldestCreatedAt}`);
            }

            const { data: msgs, error } = await query;
            if (error) {
                console.error("[fetchMessages] Fetch messages error:", error);
                throw error;
            }

            console.log(`[fetchMessages] Fetched ${msgs?.length || 0} messages. Is initial: ${isInitial}`);

            if (msgs && msgs.length > 0) {
                // Reverse for display (ascending)
                const sortedMsgs = msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                const userIds = Array.from(new Set(msgs.map(m => m.user_id)));
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, is_admin, is_translator, is_youtuber')
                    .in('id', userIds);

                const profileMap = (profiles || []).reduce((acc: any, p: any) => {
                    acc[p.id] = p;
                    return acc;
                }, {});

                const joined = sortedMsgs.map(m => ({
                    ...m,
                    sender: profileMap[m.user_id]
                }));

                if (isInitial) {
                    setMessages(joined);
                    fetchSeenUsers();
                    refreshMetadata(joined);
                    console.log(`[fetchMessages] Initial messages set, count: ${joined.length}`);
                } else {
                    setMessages(prev => [...joined, ...prev]);
                    refreshMetadata([...joined, ...messages]);
                    console.log(`[fetchMessages] Appended ${joined.length} older messages, total: ${messages.length + joined.length}`);
                }

                if (msgs.length < 20) {
                    setHasMore(false);
                    console.log("[fetchMessages] No more messages to load.");
                }
            } else {
                if (isInitial) setMessages([]);
                setHasMore(false);
                console.log("[fetchMessages] No messages found or no more messages.");
            }
        } catch (err) {
            console.error("[fetchMessages] Error during message fetch:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            console.log("[fetchMessages] Fetch operation completed.");
        }
    };

    const refreshMetadata = async (currentMsgs = messagesRef.current) => {
        if (currentMsgs.length === 0) return;

        const { data: reactions } = await supabase
            .from('community_reactions')
            .select('*')
            .in('message_id', currentMsgs.map(m => m.id));

        const reactionMap = (reactions || []).reduce((acc: any, r: any) => {
            if (!acc[r.message_id]) acc[r.message_id] = [];
            acc[r.message_id].push(r);
            return acc;
        }, {});

        setMessages(prev => prev.map(m => ({
            ...m,
            reactions: reactionMap[m.id] || [],
            reply_to: m.parent_id ? prev.find(p => p.id === m.parent_id) : undefined
        })));
    };

    const fetchSeenUsers = async () => {
        const { data: seenReceipts } = await supabase
            .from('community_seen_receipts')
            .select(`
                *,
                profiles (
                    full_name,
                    avatar_url
                )
            `)
            .eq('channel_id', channelId);
        setSeenUsers(seenReceipts || []);
    };

    const markAsSeen = async () => {
        if (messages.length === 0) return;
        const lastMsgId = messages[messages.length - 1].id;

        await supabase
            .from('community_seen_receipts')
            .upsert({
                channel_id: channelId,
                user_id: currentUserId,
                message_id: lastMsgId,
                seen_at: new Date().toISOString()
            }, { onConflict: 'channel_id, user_id' });
    };

    if (loading) {
        return <div className="flex-1 flex items-center justify-center text-muted text-sm">Уншиж байна...</div>;
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted/50 p-8 text-center">
                <p>Зурвас алга</p>
                <p className="text-xs">Та анхны зурвасыг бичээрэй!</p>
            </div>
        );
    }

    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            console.log('Handling reaction:', { messageId, emoji });
            const existing = messagesRef.current.find(m => m.id === messageId)?.reactions?.find(r => r.user_id === currentUserId && r.emoji === emoji);

            if (existing) {
                const { error } = await supabase.from('community_reactions').delete().eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('community_reactions').insert({
                    message_id: messageId,
                    user_id: currentUserId,
                    emoji
                });
                if (error) throw error;
            }
            // Optimistically refresh or wait for realtime
            refreshMetadata();
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar scroll-smooth">
            {/* Top Observer for Infinite Scroll */}
            <div ref={topObserverRef} className="h-4 w-full flex items-center justify-center">
                {loadingMore && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </div>

            {messages.map((msg, index) => {
                const isMe = msg.user_id === currentUserId;
                const nextMsg = messages[index + 1];
                const prevMsg = messages[index - 1];

                // Continuity logic
                const isSameNextUser = nextMsg?.user_id === msg.user_id;
                const isSamePrevUser = prevMsg?.user_id === msg.user_id;

                // Show avatar/name only if it's the start or end of a group as appropriate
                const showAvatar = !isMe && !isSameNextUser;
                const showName = !isMe && !isSamePrevUser;
                const isLast = index === messages.length - 1;

                const readers = seenUsers
                    .filter(s => s.message_id === msg.id && s.user_id !== currentUserId)
                    .map(s => s.profiles);

                const reactionCounts = msg.reactions?.reduce((acc: Record<string, number>, r: any) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                }, {});

                // Messenger style rounding
                const getRounding = () => {
                    const base = "rounded-2xl";
                    if (isMe) {
                        if (!isSamePrevUser && !isSameNextUser) return `${base} rounded-tr-sm`;
                        if (!isSamePrevUser) return `${base} rounded-tr-sm rounded-br-sm`;
                        if (!isSameNextUser) return `${base} rounded-tr-sm`;
                        return `${base} rounded-tr-sm rounded-br-sm`;
                    } else {
                        if (!isSamePrevUser && !isSameNextUser) return `${base} rounded-tl-sm`;
                        if (!isSamePrevUser) return `${base} rounded-tl-sm rounded-bl-sm`;
                        if (!isSameNextUser) return `${base} rounded-tl-sm`;
                        return `${base} rounded-tl-sm rounded-bl-sm`;
                    }
                };

                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={cn(
                            "flex gap-2 relative group/msg items-end",
                            isMe ? "flex-row-reverse" : "flex-row",
                            !isSameNextUser && "mb-4" // Gap between groups
                        )}
                    >
                        {/* Avatar */}
                        {!isMe && (
                            <div className="w-8 h-8 flex-shrink-0">
                                {showAvatar ? (
                                    <div className="relative group">
                                        <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-white/5">
                                            <img
                                                src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender?.full_name || 'U'}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                ) : <div className="w-7" />}
                            </div>
                        )}

                        <div className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "items-end" : "items-start")}>
                            {/* Reply Indicator - Show only once per group or specific message */}
                            {msg.reply_to && (
                                <div className="flex items-center gap-2 mb-0.5 opacity-40 text-[9px] italic px-2">
                                    <Reply className="w-2.5 h-2.5" />
                                    <span>{msg.reply_to.sender?.full_name}: {msg.reply_to.content.substring(0, 15)}...</span>
                                </div>
                            )}

                            {showName && (
                                <span className="text-[10px] text-muted/60 mb-1 ml-2 font-medium">
                                    {msg.sender?.full_name || 'Anonymous'}
                                </span>
                            )}

                            <div className="relative group/bubble">
                                <div className={cn(
                                    "px-3 py-1.5 text-sm leading-relaxed relative transition-all duration-200",
                                    getRounding(),
                                    isMe
                                        ? "bg-primary text-white"
                                        : msg.content.match(/@everyone/i)
                                            ? isMe
                                                ? "bg-primary text-white" // Keep text white on primary
                                                : "bg-yellow-500/10 border-yellow-500/30 text-zinc-200"
                                            : "bg-surface-lighter border border-white/5 text-zinc-200"
                                )}>
                                    {msg.content.match(/@everyone/i) ? (
                                        <span>
                                            {msg.content.split(/(@everyone)/gi).map((part, i) =>
                                                part.match(/^@everyone$/i) ? (
                                                    <span
                                                        key={i}
                                                        className={cn(
                                                            "font-bold px-1 rounded-md border",
                                                            isMe
                                                                ? "bg-white/20 border-white/30 text-white"
                                                                : "text-primary bg-primary/10 border-primary/20"
                                                        )}
                                                    >
                                                        {part}
                                                    </span>
                                                ) : part
                                            )}
                                        </span>
                                    ) : (
                                        msg.content
                                    )}

                                    {/* Quick Actions (Reply, React) */}
                                    <div className={cn(
                                        "absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1",
                                        isMe ? "right-full mr-2" : "left-full ml-2"
                                    )}>
                                        <button
                                            onClick={() => onReply?.(msg)}
                                            className="p-1.5 hover:bg-white/10 rounded-full text-muted hover:text-white"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-md rounded-full px-1 py-0.5 border border-white/5">
                                            {['❤️', '👍', '😂'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleReaction(msg.id, emoji)}
                                                    className="p-1 hover:bg-white/10 rounded-full text-xs"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Reaction Badges */}
                                {msg.reactions && msg.reactions.length > 0 && (
                                    <div className={cn(
                                        "flex items-center gap-1 mt-1 bg-surface-lighter border border-white/5 rounded-full px-1.5 py-0.5 shadow-lg",
                                        isMe ? "mr-1" : "ml-1"
                                    )}>
                                        {Object.entries(reactionCounts || {}).map(([emoji, count]) => (
                                            <span key={emoji} className="text-[10px] flex items-center gap-0.5">
                                                {emoji} <span className="opacity-50">{count as number}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Timestamp - show on hover or for last of group */}
                            <span className={cn(
                                "text-[8px] text-muted/30 mt-0.5 px-2 transition-opacity",
                                !isLast && "opacity-0 group-hover/msg:opacity-100"
                            )}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Seen Indicators */}
                            {isLast && readers.length > 0 && (
                                <div className="flex -space-x-1 mt-1 opacity-70">
                                    {readers.map((p: any, i) => (
                                        <div key={i} className="w-3 h-3 rounded-full border border-black overflow-hidden bg-white/10" title={`Seen by ${p.full_name}`}>
                                            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}

            {/* Typing Indicator UI */}
            <AnimatePresence>
                {typingUsers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-2 ml-10 text-[10px] text-muted/60"
                    >
                        <div className="flex gap-1">
                            <span className="w-1 h-1 bg-muted rounded-full animate-bounce" />
                            <span className="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span>{String(typingUsers[0]?.full_name || "Someone")} {typingUsers.length > 1 ? `and ${typingUsers.length - 1} others ` : ""}typing...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
        </div>
    );
}
