"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Send, User, MessageCircle, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isThisYear } from "date-fns";

import { toast } from "sonner";

interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface Conversation {
    id: string;
    user_id: string;
    last_message: string | null;
    updated_at: string;
    unread_count?: number;
    profiles: Profile;
}

interface Message {
    id: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    read_at: string | null;
    reactions?: Record<string, string[]>;
}

const EMOJIS = ["👋", "👍", "👎", "❤️", "😂", "😭", "😡", "🤔", "🎉", "🔥", "✨", "🙏", "👀", "💯"];

const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Өнөөдөр";
    if (isYesterday(date)) return "Өчигдөр";
    if (isThisYear(date)) return format(date, "M сарын d");
    return format(date, "yyyy оны M сарын d");
};

const formatSidebarTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Өчигдөр";
    if (isThisYear(date)) return format(date, "M/d");
    return format(date, "yyyy/M/d");
};

const formatMessageDetailTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm");
};

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [inputText, setInputText] = useState("");
    const [reconnectKey, setReconnectKey] = useState(0);
    const channelRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const messagesCache = useRef<Record<string, Message[]>>({});
    const convChannelRef = useRef<any>(null);
    const globalChannelRef = useRef<any>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const selectedConvIdRef = useRef<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
        fetchConversations();

        // Subscribe to new conversations or updates
        const channel = supabase
            .channel('admin_conversations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chat_conversations' },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Fetch the new conversation with profiles
                        const { data } = await supabase
                            .from('chat_conversations')
                            .select('*, profiles(id, email, full_name, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();
                        
                        if (data) {
                            setConversations(prev => [data as Conversation, ...prev]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setConversations(prev => {
                            const index = prev.findIndex(c => c.id === payload.new.id);
                            if (index === -1) return prev;
                            
                            const isNewUserMessage = (payload.new.unread_count || 0) > (prev[index].unread_count || 0);
                            if (isNewUserMessage && selectedConvId !== payload.new.id) {
                                // Dynamic notification effects
                                playNotificationSound();
                                blinkTitle();
                            }

                            const updated = { ...prev[index], ...payload.new };
                            const filtered = prev.filter(c => c.id !== payload.new.id);
                            return [updated, ...filtered];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (globalChannelRef.current) {
                supabase.removeChannel(globalChannelRef.current);
            }
        };
    }, []);

    // Facebook-style: 3-layer real-time reliability
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const convId = selectedConvIdRef.current;
                if (!convId) return;

                // Layer 1: Immediately fetch missed messages (fill gaps)
                const { data } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('conversation_id', convId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (data) {
                    const sorted = data.reverse();
                    messagesCache.current[convId] = sorted;
                    setMessages(sorted);
                }

                // Layer 2: Check if channel is alive, reconnect if not
                const channelState = convChannelRef.current?.state;
                if (!channelState || channelState === 'closed' || channelState === 'errored') {
                    setReconnectKey(k => k + 1);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Layer 3: 30s polling fallback (Facebook-style background sync)
    useEffect(() => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        if (selectedConvId) {
            selectedConvIdRef.current = selectedConvId;
            pollingIntervalRef.current = setInterval(async () => {
                if (document.visibilityState !== 'visible') return;
                const { data } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('conversation_id', selectedConvId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (data) {
                    const sorted = data.reverse();
                    // Only update if new messages arrived
                    const currentIds = new Set(messagesCache.current[selectedConvId]?.map(m => m.id) || []);
                    const hasNew = sorted.some(m => !currentIds.has(m.id));
                    if (hasNew) {
                        messagesCache.current[selectedConvId] = sorted;
                        setMessages(sorted);
                        scrollToBottom();
                    }
                }
            }, 60000); // every 60 seconds (Facebook-style background sync)
        } else {
            selectedConvIdRef.current = null;
        }

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [selectedConvId]);

    // Intersection Observer: prefetch as soon as conv is visible in viewport
    useEffect(() => {
        if (!conversations.length) return;
        const queue: string[] = [];
        let processing = false;

        const processQueue = async () => {
            if (processing) return;
            processing = true;
            while (queue.length > 0) {
                const convId = queue.shift()!;
                await prefetchSingle(convId);
                await new Promise(r => setTimeout(r, 400));
            }
            processing = false;
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const convId = entry.target.getAttribute('data-conv-id');
                    if (convId && !messagesCache.current[convId] && !queue.includes(convId)) {
                        queue.push(convId);
                        processQueue();
                    }
                }
            });
        }, { threshold: 0.1 });

        const targets = document.querySelectorAll('[data-conv-id]');
        targets.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [conversations]);

    useEffect(() => {
        if (selectedConvId) {
            // 1. Show cached messages instantly (Messenger style)
            if (messagesCache.current[selectedConvId]) {
                setMessages(messagesCache.current[selectedConvId]);
                setMessagesLoading(false);
                scrollToBottom();
            } else {
                setMessages([]);
                setMessagesLoading(true);
            }

            const hasCached = !!messagesCache.current[selectedConvId];
            fetchMessages(selectedConvId, !hasCached); // silent refresh if cached
            markAsRead(selectedConvId);

            // 2. Clean up old channel before creating new one
            if (convChannelRef.current) {
                supabase.removeChannel(convChannelRef.current);
                convChannelRef.current = null;
            }

            const convId = selectedConvId;
            const channel = supabase
                .channel(`admin_chat:${convId}:${Date.now()}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` },
                    (payload) => {
                        const newMessage = payload.new as Message;
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            const newMsgs = [...prev, newMessage].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                            messagesCache.current[convId] = newMsgs;
                            return newMsgs;
                        });
                        scrollToBottom();
                        if (!newMessage.is_admin) {
                            markAsRead(convId);
                            setOtherUserTyping(false);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` },
                    (payload) => {
                        setMessages(prev => {
                            const updated = prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m);
                            messagesCache.current[convId] = updated;
                            return updated;
                        });
                    }
                )
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.user_id !== currentUser?.id) {
                        setOtherUserTyping(payload.payload.is_typing);
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        convChannelRef.current = channel;
                    }
                });

            channelRef.current = channel;

            return () => {
                supabase.removeChannel(channel);
                convChannelRef.current = null;
                channelRef.current = null;
            };
        }
    }, [selectedConvId, reconnectKey]); // reconnectKey forces re-subscribe on tab return

    // Broadcast typing status
    useEffect(() => {
        if (selectedConvId && channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser.id, is_typing: inputText.length > 0 }
            });
        }
    }, [inputText, selectedConvId, currentUser]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://cdn.artmongolian.site/notification.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Browsers might block it
        } catch (e) {}
    };

    const blinkTitle = () => {
        const originalTitle = document.title;
        let count = 0;
        const interval = setInterval(() => {
            document.title = count % 2 === 0 ? "🔔 Зурвас ирлээ!" : originalTitle;
            count++;
            if (count > 6) {
                clearInterval(interval);
                document.title = originalTitle;
            }
        }, 1000);
    };

    const markAsRead = (convId: string) => {
        // Fire-and-forget: don't await, don't block UI
        supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', convId)
            .eq('is_admin', false)
            .is('read_at', null)
            .then(() => {
                // Also reset unread count, but only if that column exists
                supabase
                    .from('chat_conversations')
                    .update({ unread_count: 0 })
                    .eq('id', convId)
                    .then(() => {});
            });

        // Update local state immediately
        setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, unread_count: 0 } : c
        ));
    };

    const fetchConversations = async () => {
        const { data, error } = await supabase
            .from('chat_conversations')
            .select(`
                *,
                profiles (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Failed to load conversations');
        } else {
            setConversations(data || []);
            setLoading(false);
            // No background prefetch - hover prefetch handles on-demand caching
        }
    };

    // Hover prefetch: called when admin hovers over a conversation
    const prefetchSingle = async (convId: string) => {
        if (messagesCache.current[convId]) return; // already cached
        const { data } = await supabase
            .from('chat_messages')
            .select('id, content, is_admin, created_at, read_at, reactions')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (data) {
            messagesCache.current[convId] = data.reverse();
        }
    };

    const fetchMessages = async (convId: string, showLoader = true) => {
        if (showLoader) setMessagesLoading(true);
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            const sorted = (data || []).reverse();
            // Save to cache
            messagesCache.current[convId] = sorted;
            setMessages(sorted);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Зурвас ачаалахад алдаа гарлаа');
        } finally {
            setMessagesLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleReaction = async (message: Message, emoji: string) => {
        if (!currentUser) return;

        const currentReactions = message.reactions || {};
        const userReactions = currentReactions[emoji] || [];
        
        let newReactions;
        if (userReactions.includes(currentUser.id)) {
            // Remove reaction
            const filtered = userReactions.filter(id => id !== currentUser.id);
            if (filtered.length === 0) {
                const { [emoji]: _, ...rest } = currentReactions;
                newReactions = rest;
            } else {
                newReactions = { ...currentReactions, [emoji]: filtered };
            }
        } else {
            // Add reaction
            newReactions = { ...currentReactions, [emoji]: [...userReactions, currentUser.id] };
        }

        // Optimistic UI
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: newReactions } : m));

        const { error } = await supabase
            .from('chat_messages')
            .update({ reactions: newReactions })
            .eq('id', message.id);

        if (error) {
            console.error('Error updating reaction:', error.message || error);
            toast.error('Failed to react. Please check database permissions.');
            // Revert on error
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: message.reactions } : m));
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedConvId || !currentUser) return;

        const content = inputText.trim();
        setInputText("");

        const tempId = crypto.randomUUID();
        const newMessage: Message = {
            id: tempId,
            content: content,
            is_admin: true,
            created_at: new Date().toISOString(),
            read_at: null
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    id: tempId,
                    conversation_id: selectedConvId,
                    sender_id: currentUser.id,
                    content: content,
                    is_admin: true
                });

            if (error) throw error;

            await supabase
                .from('chat_conversations')
                .update({
                    updated_at: new Date().toISOString(),
                    last_message: content
                })
                .eq('id', selectedConvId);

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setInputText(content);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedConv = conversations.find(c => c.id === selectedConvId);

    return (
        <div className="flex h-[calc(100vh-120px)] bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-80 border-r border-white/5 flex flex-col bg-black/20",
                selectedConvId ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-white/5 space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Зурвасууд
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Хэрэглэгч хайх..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">Loading...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">Conversation not found</div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                data-conv-id={conv.id}
                                onClick={() => {
                                    setSelectedConvId(conv.id);
                                    prefetchSingle(conv.id);
                                }}
                                onMouseEnter={() => prefetchSingle(conv.id)}
                                className={cn(
                                    "w-full text-left p-4 hover:bg-white/5 transition-colors border-b border-white/5 flex gap-3",
                                    selectedConvId === conv.id ? "bg-white/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                                )}
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                    {conv.profiles?.avatar_url ? (
                                        <img src={conv.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h3 className="text-sm font-bold text-white truncate">
                                            {conv.profiles?.full_name || conv.profiles?.email || "Unknown User"}
                                        </h3>
                                        <span className="text-[10px] text-zinc-500">
                                            {formatSidebarTime(conv.updated_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={cn(
                                            "text-xs truncate flex-1",
                                            conv.unread_count && selectedConvId !== conv.id ? "text-white font-bold" : "text-zinc-400"
                                        )}>
                                            {conv.last_message || "No messages yet"}
                                        </p>
                                        {conv.unread_count && selectedConvId !== conv.id ? (
                                            <div className="w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/40 shrink-0" />
                                        ) : null}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-surface",
                !selectedConvId ? "hidden md:flex" : "flex"
            )}>
                {!selectedConvId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                        <MessageCircle className="w-16 h-16 opacity-20" />
                        <p>Зурвас сонгож харилцана уу</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConvId(null)}
                                    className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg text-zinc-400"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                    {selectedConv?.profiles?.avatar_url ? (
                                        <img src={selectedConv.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">
                                        {selectedConv?.profiles?.full_name || selectedConv?.profiles?.email}
                                    </h3>
                                    <p className="text-[10px] text-zinc-400">
                                        {selectedConv?.profiles?.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Actions like Delete conversation could go here */}
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                            {messagesLoading ? (
                                <div className="flex flex-col gap-4 py-2">
                                    {/* Skeleton messages - Messenger style */}
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={cn("flex gap-3 max-w-[70%]", i % 2 === 0 ? "" : "ml-auto flex-row-reverse")}>
                                            {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />}
                                            <div className="flex flex-col gap-1">
                                                <div className={cn(
                                                    "h-9 rounded-2xl animate-pulse bg-white/10",
                                                    i % 2 === 0 ? "rounded-tl-sm" : "rounded-tr-sm",
                                                    i === 0 ? "w-48" : i === 1 ? "w-32" : i === 2 ? "w-56" : i === 3 ? "w-40" : "w-36"
                                                )} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            
                            {messages.map((msg, index) => {
                                const isMe = msg.is_admin;
                                const showAvatar = !isMe && (index === 0 || messages[index - 1].is_admin);
                                const isNewDay = index === 0 ||
                                    new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();

                                return (
                                    <Fragment key={msg.id}>
                                        {isNewDay && (
                                            <div className="flex justify-center my-8 first:mt-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-sm">
                                                    {formatDateLabel(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "flex gap-3 max-w-[80%]",
                                                isMe ? "ml-auto flex-row-reverse" : ""
                                            )}
                                        >
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 mt-1 opacity-0 md:opacity-100">
                                                    {/* Repeated avatar logic or just empty/invisible for cleaner look on continuous messages */}
                                                    {showAvatar && (selectedConv?.profiles?.avatar_url ? (
                                                        <img src={selectedConv.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : <User className="w-4 h-4 text-zinc-500 m-2" />)}
                                                </div>
                                            )}

                                            <div className={cn(
                                                "group relative flex flex-col",
                                                isMe ? "items-end" : "items-start"
                                            )}>
                                                {/* Reaction Picker Trigger */}
                                                <div className={cn(
                                                    "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex bg-[#1a1a1a] border border-white/10 rounded-full px-1 py-0.5 z-20 shadow-xl",
                                                    isMe ? "right-full mr-2" : "left-full ml-2"
                                                )}>
                                                    {EMOJIS.slice(0, 6).map(emoji => (
                                                        <button 
                                                            key={emoji}
                                                            onClick={() => handleReaction(msg, emoji)}
                                                            className="hover:scale-125 transition-transform p-1 text-sm"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className={cn(
                                                    "px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed",
                                                    isMe
                                                        ? "bg-[#0084ff] text-white rounded-tr-[4px]"
                                                        : "bg-[#3e4042] text-white rounded-tl-[4px]"
                                                )}>
                                                    {msg.content}
                                                </div>

                                                {/* Display Reactions */}
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className={cn(
                                                        "flex flex-wrap gap-1 mt-1 bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-0.5 shadow-sm min-h-[22px] items-center",
                                                        isMe ? "self-end mr-1" : "self-start ml-1"
                                                    )}>
                                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => handleReaction(msg, emoji)}
                                                                className={cn(
                                                                    "flex items-center gap-1 text-[11px] font-bold px-1 rounded hover:bg-white/5 transition-colors",
                                                                    users.includes(currentUser?.id) ? "text-primary" : "text-zinc-400"
                                                                )}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span>{users.length}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                                    <span className="text-[10px] text-zinc-500">
                                                        {formatMessageDetailTime(msg.created_at)}
                                                    </span>
                                                    {isMe && index === messages.length - 1 && (
                                                        <span className="text-[10px] text-zinc-500 font-medium">
                                                            {msg.read_at ? "• Уншсан" : "• Илгээсэн"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        </Fragment>
                                    );
                                })}

                                {otherUserTyping && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3 max-w-[80%]"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 mt-1 opacity-100">
                                            {selectedConv?.profiles?.avatar_url ? (
                                                <img src={selectedConv.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : <User className="w-4 h-4 text-zinc-500 m-2" />}
                                        </div>
                                        <div className="bg-[#3e4042] px-4 py-3 rounded-2xl rounded-tl-[4px] flex gap-1 items-center h-9">
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-duration:1s]" />
                                        </div>
                                    </motion.div>
                                )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/5 bg-black/20 relative">
                            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
                                {/* Emoji Picker Popover */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full left-0 mb-2 p-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl grid grid-cols-7 gap-1 z-50 backdrop-blur-md"
                                        >
                                            {EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => setInputText(prev => prev + emoji)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex items-end gap-3">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all flex items-center pr-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={cn(
                                                "p-3 transition-colors",
                                                showEmojiPicker ? "text-primary" : "text-zinc-500 hover:text-white"
                                            )}
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Хариу бичих..."
                                            className="flex-1 bg-transparent py-3 text-sm text-white focus:outline-none placeholder:text-zinc-600 min-w-0"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="p-3 bg-primary rounded-xl text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
