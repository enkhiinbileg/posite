"use client";

import { useState, useRef } from "react";
import { Send, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MessageInputProps {
    channelId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    replyTo?: any;
    onCancelReply?: () => void;
    disabled?: boolean;
}

export function MessageInput({ channelId, userId, userName, userAvatar, replyTo, onCancelReply, disabled }: MessageInputProps) {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null);

    const popularEmojis = ["❤️", "👍", "😂", "😮", "😢", "🔥", "✨", "🙌", "💯", "🙏", "🤣", "😍"];

    // Typing Indicator Broadcast
    const handleTyping = () => {
        if (!channelRef.current) {
            channelRef.current = supabase.channel(`typing:${channelId}`);
            channelRef.current.subscribe();
        }

        channelRef.current.track({
            user_id: userId,
            full_name: userName,
            typing: true,
            at: new Date().toISOString()
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            channelRef.current.untrack();
        }, 3000); // Stop typing after 3s of inactivity
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || sending) return;

        const content = message.trim();
        setMessage(""); // Optimistic clear
        setSending(true);

        try {
            const { error } = await supabase
                .from('community_messages')
                .insert({
                    channel_id: channelId,
                    user_id: userId,
                    content: content,
                    parent_id: replyTo?.id
                });

            if (onCancelReply) onCancelReply();
            if (channelRef.current) channelRef.current.untrack();

            if (error) {
                console.error("Error sending message:", error);
                toast.error("Зурвас илгээж чадсангүй");
                setMessage(content); // Restore on error
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Алдаа гарлаа");
        } finally {
            setSending(false);
        }
    };

    const addEmoji = (emoji: string) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const addMention = (mention: string) => {
        setMessage(prev => {
            const parts = prev.split(" ");
            parts.pop(); // Remove the "@"
            return [...parts, mention, ""].join(" ");
        });
        setShowMentions(false);
    };

    return (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5 space-y-2">
            {/* Reply Preview */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center justify-between bg-white/5 p-2 rounded-xl mb-2 border-l-4 border-primary"
                    >
                        <div className="flex flex-col text-[10px] overflow-hidden">
                            <span className="text-primary font-bold">{replyTo.sender?.full_name}</span>
                            <span className="text-muted truncate">{replyTo.content}</span>
                        </div>
                        <button
                            type="button"
                            onClick={onCancelReply}
                            className="p-1 hover:bg-white/10 rounded-full"
                        >
                            <Smile className="w-3 h-3 rotate-45" /> {/* Use Smile as X for now lol */}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl p-1 focus-within:border-primary/50 transition-colors">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            console.log('Emoji button clicked, current state:', showEmojiPicker);
                            setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            showEmojiPicker ? "text-primary bg-primary/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                        title="Эможи"
                    >
                        <Smile className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {showEmojiPicker && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full left-0 mb-4 p-3 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 min-w-[240px] grid grid-cols-6 gap-2"
                            >
                                {popularEmojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => addEmoji(emoji)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => {
                            const val = e.target.value;
                            setMessage(val);
                            handleTyping();

                            // Mention detection
                            const lastChar = val[val.length - 1];
                            const lastWord = val.split(" ").pop() || "";
                            if (lastWord === "@") {
                                setShowMentions(true);
                            } else if (!lastWord.startsWith("@")) {
                                setShowMentions(false);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Tab" && showMentions) {
                                e.preventDefault();
                                addMention("@everyone");
                            }
                        }}
                        placeholder={disabled ? "Танд бичих эрх байхгүй" : "Зурвас бичих..."}
                        disabled={disabled || sending}
                        className="w-full bg-transparent border-none py-2 text-sm text-white focus:outline-none placeholder:text-zinc-600 min-w-0"
                    />

                    {/* Mentions Autocomplete */}
                    <AnimatePresence>
                        {showMentions && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full left-0 mb-2 p-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[150px]"
                            >
                                <button
                                    type="button"
                                    onClick={() => addMention("@everyone")}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        @
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">everyone</span>
                                        <span className="text-[10px] text-muted">Notify everyone</span>
                                    </div>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    type="submit"
                    disabled={disabled || !message.trim() || sending}
                    className={cn(
                        "p-2 bg-primary rounded-lg text-white transition-colors flex-shrink-0",
                        (disabled || !message.trim() || sending)
                            ? "opacity-50 cursor-not-allowed bg-white/10"
                            : "hover:bg-primary-hover"
                    )}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 text-center">
                Та <span className="text-zinc-500">Enter</span> дарж илгээнэ үү. Одоогоор зөвхөн текст бичих боломжтой.
            </p>
        </form>
    );
}
