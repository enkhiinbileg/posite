"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";

interface Message {
    id: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    read_at?: string | null;
    reactions?: Record<string, string[]>;
}

// Helper to check if dates are on different days
const isDifferentDay = (d1: string, d2: string) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() !== date2.toDateString();
};

const EMOJIS = ["👋", "👍", "👎", "❤️", "😂", "😭", "😡", "🤔", "🎉", "🔥", "✨", "🙏", "👀", "💯"];

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [reconnectKey, setReconnectKey] = useState(0);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastBroadcastAt = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                // Only fetch unread count on mount, not full conversation
                fetchUnreadCount(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                // Only fetch unread count on login
                fetchUnreadCount(session.user.id);
            } else {
                setMessages([]);
                setConversationId(null);
                setUnreadCount(0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Page Visibility API: force full reconnect when user returns to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setReconnectKey(k => k + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Load conversation when chat opens
    useEffect(() => {
        if (isOpen && session && !conversationId) {
            fetchConversation(session.user.id);
        }
    }, [isOpen, session, conversationId]);

    // Mark messages as read when chat opens
    useEffect(() => {
        if (isOpen && conversationId && session) {
            markMessagesAsRead(conversationId);
        }
    }, [isOpen, conversationId, session]);

    const markMessagesAsRead = async (convId: string) => {
        try {
            setUnreadCount(0);
            await supabase
                .from('chat_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('conversation_id', convId)
                .eq('is_admin', true)
                .is('read_at', null);
        } catch (err) {
            console.warn('Silent: Chat mark as read failed');
        }
    };

    useEffect(() => {
        if (conversationId) {
            const channel = supabase
                .channel(`admin_chat:${conversationId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `conversation_id=eq.${conversationId}`
                    },
                    (payload) => {
                        const newMessage = payload.new as Message;
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            return [...prev, newMessage];
                        });

                        if (isOpen) {
                            scrollToBottom();
                            if (newMessage.is_admin) {
                                markMessagesAsRead(conversationId);
                            }
                        } else if (newMessage.is_admin) {
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `conversation_id=eq.${conversationId}`
                    },
                    (payload) => {
                        const updatedMessage = payload.new as Message;
                        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
                    }
                )
                .on('broadcast', { event: 'typing' }, ({ payload }) => {
                    if (payload.userId !== session?.user?.id) {
                        setOtherUserTyping(payload.isTyping);
                        if (payload.isTyping) scrollToBottom();
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [conversationId, isOpen, reconnectKey]);

    const fetchUnreadCount = async (userId: string) => {
        try {
            const { count, error } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_admin', true)
                .is('read_at', null);

            if (!error && count !== null) {
                setUnreadCount(count);
            }
        } catch (err) {
            // Silently ignore
        }
    };

    const fetchConversation = async (userId: string) => {
        try {
            // First check if conversation exists
            let { data: conversation, error } = await supabase
                .from('chat_conversations')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching conversation:', error);
                return;
            }

            // If not exists, create one
            if (!conversation) {
                const { data: newConv, error: createError } = await supabase
                    .from('chat_conversations')
                    .insert([{ user_id: userId }])
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating conversation:', createError);
                    return;
                }
                conversation = newConv;
            }

            if (conversation) {
                setConversationId(conversation.id);
                fetchMessages(conversation.id);

                // Fetch unread count
                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conversation.id)
                    .eq('is_admin', true)
                    .is('read_at', null);

                if (count) setUnreadCount(count);
            }
        } catch (error) {
            console.error('Error in fetchConversation:', error);
        }
    };

    const fetchMessages = async (convId: string) => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                setMessages(data || []);
                scrollToBottom();
            }
        } catch (err) {
            console.warn('Silent: Fetch messages failed');
        }
    };

    // Broadcast typing status
    useEffect(() => {
        if (!conversationId || !session) return;

        const broadcastTyping = async (isTyping: boolean) => {
            const now = Date.now();
            if (!isTyping || now - lastBroadcastAt.current > 2000) {
                await supabase.channel(`admin_chat:${conversationId}`).send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { userId: session.user.id, isTyping }
                });
                lastBroadcastAt.current = now;
            }
        };

        if (message.length > 0) {
            broadcastTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
        } else {
            broadcastTyping(false);
        }

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [message, conversationId, session]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !session || !conversationId) return;

        const content = message.trim();
        setMessage("");

        const tempId = crypto.randomUUID();
        const newMessage: Message = {
            id: tempId,
            content: content,
            is_admin: false,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    id: tempId, // Use client-side ID to match
                    conversation_id: conversationId,
                    sender_id: session.user.id,
                    content: content,
                    is_admin: false
                });

            if (error) {
                toast.error("Failed to send message");
                setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove optimistic message
                setMessage(content); // Restore input
            } else {
                // Update last_message in conversation
                await supabase
                    .from('chat_conversations')
                    .update({
                        updated_at: new Date().toISOString(),
                        last_message: content
                    })
                    .eq('id', conversationId);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error("Error sending message");
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMessage(content);
        }
    };

    const pathname = usePathname();
    const isReaderPage = pathname?.includes('/read/');

    return (
        <div className={cn(
            "fixed right-4 z-[5000] lg:bottom-8 lg:right-8",
            isReaderPage ? "bottom-4" : "bottom-24"
        )}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-16 right-0 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[80vh] bg-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-black/90 backdrop-blur-md"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Админтай холбогдох</h3>
                                    <p className="text-[10px] text-zinc-400">Бид танд туслахад бэлэн байна</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>



                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth bg-gradient-to-b from-transparent to-black/5">
                            {!session ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center rotate-3 border border-white/5">
                                        <MessageCircle className="w-8 h-8 text-muted" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Тавтай морилно уу!</p>
                                        <p className="text-xs text-muted mt-1">Чатлахын тулд та эхлээд нэвтэрнэ үү.</p>
                                    </div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Send className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-xs text-muted">Та асуух зүйлээ бичээрэй. Бид удахгүй хариулах болно.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {messages.map((msg, index) => {
                                        const isLast = index === messages.length - 1;
                                        const isMe = !msg.is_admin;
                                        const prevMsg = messages[index - 1];
                                        const nextMsg = messages[index + 1];

                                        const isFirstInGroup = !prevMsg || prevMsg.is_admin !== msg.is_admin;
                                        const isLastInGroup = !nextMsg || nextMsg.is_admin !== msg.is_admin;
                                        const showDate = !prevMsg || isDifferentDay(prevMsg.created_at, msg.created_at);

                                        return (
                                            <div key={msg.id} className="flex flex-col w-full">
                                                {/* Date Divider */}
                                                {showDate && (
                                                    <div className="flex items-center justify-center gap-4 py-4">
                                                        <div className="h-px bg-white/5 flex-1" />
                                                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                                            {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <div className="h-px bg-white/5 flex-1" />
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "flex gap-2.5 max-w-[85%] group relative group/msg",
                                                    isMe ? "self-end flex-row-reverse" : "self-start"
                                                )}>
                                                    {/* Avatar for Admin (only on last message of group) */}
                                                    {!isMe && (
                                                        <div className={cn("w-6 h-6 flex-shrink-0 flex flex-col justify-end", !isLastInGroup && "invisible")}>
                                                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden">
                                                                <MessageCircle className="w-3 h-3 text-white/70" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={cn(
                                                        "flex flex-col",
                                                        isMe ? "items-end" : "items-start"
                                                    )}>
                                                        <div
                                                            className={cn(
                                                                "px-4 py-2 text-sm backdrop-blur-sm transition-all shadow-sm",
                                                                isMe
                                                                    ? "bg-gradient-to-br from-primary to-rose-600 text-white"
                                                                    : "bg-surface border border-white/10 text-zinc-100",
                                                                // Dynamic Border Radius
                                                                isMe
                                                                    ? cn("rounded-2xl rounded-tr-md", !isFirstInGroup && "rounded-tr-2xl", !isLastInGroup && "rounded-br-md")
                                                                    : cn("rounded-2xl rounded-tl-md", !isFirstInGroup && "rounded-tl-2xl", !isLastInGroup && "rounded-bl-md")
                                                            )}
                                                        >
                                                            {msg.content}
                                                        </div>

                                                        {/* Reactions UI */}
                                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                            <div className={cn(
                                                                "flex flex-wrap gap-1 mt-1 bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-0.5 shadow-sm min-h-[22px] items-center",
                                                                isMe ? "self-end mr-1" : "self-start ml-1"
                                                            )}>
                                                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                                    <div
                                                                        key={emoji}
                                                                        className="flex items-center gap-1 text-[10px] font-bold px-1"
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span className="text-zinc-400">{users.length}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Metadata Row */}
                                                        {isLastInGroup && (
                                                            <div className={cn(
                                                                "flex items-center gap-1.5 mt-1 px-1 transition-opacity duration-300",
                                                                isLast ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                                                            )}>
                                                                <span className="text-[9px] font-medium text-zinc-500">
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isMe && isLast && (
                                                                    <span className="text-[9px] font-medium text-zinc-500">
                                                                        {msg['read_at' as keyof Message] ? " • Уншсан" : " • Илгээсэн"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Typing Indicator */}
                                    {otherUserTyping && (
                                        <div className="flex gap-2.5 items-end ml-1">
                                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                <MessageCircle className="w-3 h-3 text-white/70" />
                                            </div>
                                            <div className="bg-surface border border-white/10 px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center h-[34px]">
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        {session && (

                            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5 relative">
                                {/* Emoji Picker Popover */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full left-3 mb-2 p-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl grid grid-cols-7 gap-1 z-50 backdrop-blur-md"
                                        >
                                            {EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => setMessage(prev => prev + emoji)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 focus-within:border-primary/50 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            showEmojiPicker ? "text-primary bg-primary/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>

                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Зурвас бичих..."
                                        className="flex-1 bg-transparent border-none py-1.5 text-sm text-white focus:outline-none placeholder:text-zinc-600 min-w-0"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!message.trim()}
                                        className="p-1.5 bg-primary rounded-lg text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 group"
            >
                {/* Main Button Body - Masked for hover effect */}
                <div className="absolute inset-0 bg-primary rounded-full shadow-2xl overflow-hidden flex items-center justify-center border border-white/10">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isOpen ? <X className="w-6 h-6 text-white relative z-10" /> : <MessageCircle className="w-6 h-6 text-white relative z-10" />}
                </div>

                {/* Badge - Unmasked */}
                {!isOpen && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#09090b] shadow-sm z-20 animate-in zoom-in duration-200">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </motion.button>
        </div>
    );
}
