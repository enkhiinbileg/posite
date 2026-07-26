"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ChannelList } from "@/components/community/ChannelList";
import { MessageList } from "@/components/community/MessageList";
import { MessageInput } from "@/components/community/MessageInput";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Menu, X, Users, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function CommunityPage() {
    const [activeChannel, setActiveChannel] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/auth');
            return;
        }
        setUser(session.user);

        // Fetch user profile for chat
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        setProfile(profile);
        setLoading(false);
    };

    // Online Status Tracking (Listen to global-presence)
    useEffect(() => {
        if (!user) return;

        console.log('[CommunityPage] Listening to global-presence...');
        const channel = supabase.channel('global-presence');
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('[CommunityPage] Global presence sync state:', state);
                const flattened = Object.values(state).flat();
                setOnlineUsers(flattened);
            })
            .subscribe((status) => {
                console.log('[CommunityPage] Global presence channel status:', status);
            });

        return () => {
            console.log('[CommunityPage] Unsubscribing from global-presence');
            channel.unsubscribe();
        };
    }, [user]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Sidebar />
            <Navbar />

            <div className="lg:pl-24 pt-16 lg:pt-20 h-screen flex flex-col relative overflow-hidden">
                <main className="flex-1 flex overflow-hidden p-0 lg:p-6 gap-6 relative">

                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
                    </div>

                    {/* Left Sidebar: Channels (Desktop) */}
                    <div className="w-72 flex-shrink-0 bg-surface/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hidden lg:flex flex-col z-10 shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-black uppercase tracking-tight text-white leading-tight">Community</h1>
                                    <p className="text-[10px] text-muted tracking-widest uppercase font-bold">Partners Hub</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                            <ChannelList
                                activeChannelId={activeChannel?.id}
                                onSelectChannel={(c) => {
                                    setActiveChannel(c);
                                    setReplyTo(null);
                                }}
                            />
                        </div>
                    </div>

                    {/* Mobile Drawer Overlay */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                                />
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-[#0a0a0b] z-50 lg:hidden flex flex-col border-r border-white/5"
                                >
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                                                <MessageSquare className="w-5 h-5 text-primary" />
                                            </div>
                                            <h1 className="text-lg font-black uppercase tracking-tight">Community</h1>
                                        </div>
                                        <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto py-6">
                                        <ChannelList
                                            activeChannelId={activeChannel?.id}
                                            onSelectChannel={(c) => {
                                                setActiveChannel(c);
                                                setIsMenuOpen(false);
                                                setReplyTo(null);
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Main Chat Area */}
                    <div className="flex-1 bg-surface/40 backdrop-blur-xl border border-white/5 lg:rounded-3xl overflow-hidden flex flex-col relative z-10 shadow-2xl">
                        {activeChannel ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-16 lg:h-20 border-b border-white/5 flex items-center px-4 lg:px-8 justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsMenuOpen(true)}
                                            className="lg:hidden p-2 hover:bg-white/5 rounded-xl border border-white/5"
                                        >
                                            <Menu className="w-5 h-5 text-zinc-400" />
                                        </button>
                                        <div>
                                            <h2 className="font-bold text-white text-base lg:text-lg flex items-center gap-2">
                                                <span className="text-primary text-xl">#</span>
                                                {activeChannel.name}
                                            </h2>
                                            {/* Online status indicator removed as requested */}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <MessageList
                                    channelId={activeChannel.id}
                                    currentUserId={user.id}
                                    onReply={setReplyTo}
                                />

                                {/* Input */}
                                <div className="p-3 lg:p-6 bg-white/[0.01]">
                                    <MessageInput
                                        channelId={activeChannel.id}
                                        userId={user.id}
                                        userName={profile?.full_name || user.email?.split('@')[0] || 'User'}
                                        userAvatar={profile?.avatar_url}
                                        replyTo={replyTo}
                                        onCancelReply={() => setReplyTo(null)}
                                        disabled={activeChannel.slug === 'announcements'}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center flex-col text-muted gap-4">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                    <MessageSquare className="w-10 h-10 opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-white/50">Суваг сонгоно уу</p>
                                    <p className="text-xs opacity-30 mt-1 uppercase tracking-widest">Тавтай морил</p>
                                </div>
                                <button
                                    onClick={() => setIsMenuOpen(true)}
                                    className="lg:hidden px-6 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold mt-4"
                                >
                                    Сувгуудыг харах
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
