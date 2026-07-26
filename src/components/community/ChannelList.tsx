"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Hash, Lock, Users } from "lucide-react";

interface Channel {
    id: string;
    slug: string;
    name: string;
    type: 'public' | 'private' | 'role_based';
}

interface ChannelListProps {
    activeChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ activeChannelId, onSelectChannel }: ChannelListProps) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            // RLS will automatically filter channels user has access to
            const { data, error } = await supabase
                .from('community_channels')
                .select('*')
                .order('name');

            if (error) throw error;
            setChannels(data || []);

            // Auto-select first channel if none selected
            if (!activeChannelId && data && data.length > 0) {
                onSelectChannel(data[0]);
            }
        } catch (error) {
            console.error("Error fetching channels:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-xs text-muted">Ачаалж байна...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="px-4 text-xs font-bold text-muted uppercase tracking-widest mb-4">Сувгууд</h3>
                {channels.map(channel => (
                    <button
                        key={channel.id}
                        onClick={() => onSelectChannel(channel)}
                        className={cn(
                            "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors hover:bg-white/5",
                            activeChannelId === channel.id
                                ? "bg-white/5 border-l-2 border-primary text-white"
                                : "text-muted hover:text-white border-l-2 border-transparent"
                        )}
                    >
                        {channel.slug === 'announcements' ? (
                            <Users className="w-4 h-4" />
                        ) : channel.type === 'private' ? (
                            <Lock className="w-4 h-4" />
                        ) : (
                            <Hash className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{channel.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
