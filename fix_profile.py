import os

def fix_profile():
    path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\profile\page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Parallize getProfileData
    old_func = """    async function getProfileData() {
        if (!user) return;
        setLoading(true);

        // 2. Fetch Stats Counts (Explicitly filtered by user_id)
        const { count: readCount } = await supabase
            .from('reading_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const { count: commentCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const { count: likeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        setStats({
            readCount: readCount || 0,
            commentCount: commentCount || 0,
            likeCount: likeCount || 0
        });

        // 3. Fetch History for Graphs (Detailed)
        // Fetch last 7 days activity
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const { data: recentActivity } = await supabase
            .from('reading_progress')
            .select('last_read_at, webtoon:webtoons(genres)')
            .eq('user_id', user.id);

        // Calculate Weekly Activity (Last 7 days)
        const newWeeklyActivity = Array(7).fill(false);
        if (recentActivity) {
            recentActivity.forEach((item: any) => {
                if (item.last_read_at) {
                    const date = new Date(item.last_read_at);
                    const diffTime = Math.abs(today.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) {
                        newWeeklyActivity[7 - diffDays] = true;
                    }
                }
            });
        }
        setWeeklyActivity(newWeeklyActivity);

        // Calculate Genre Distribution
        const genreCounts: Record<string, number> = {};
        let totalGenres = 0;

        if (recentActivity) {
            recentActivity.forEach((item: any) => {
                if (item.webtoon?.genres && Array.isArray(item.webtoon.genres)) {
                    item.webtoon.genres.forEach((genre: string) => {
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                        totalGenres++;
                    });
                }
            });
        }

        const sortedGenres = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count], index) => ({
                name,
                percentage: (count / totalGenres) * 100,
                color: index === 0 ? "text-primary" : index === 1 ? "text-blue-500" : "text-yellow-500"
            }));

        setTopGenres(sortedGenres);

        // 4. Fetch History List
        const { data: historyData } = await supabase
            .from('reading_progress')
            .select(`
                *,
                webtoon:webtoons(id, title, image),
                chapter:chapters(id, title)
            `)
            .eq('user_id', user.id)
            .order('last_read_at', { ascending: false })
            .limit(50);

        setHistory(historyData || []);

        // 5. Fetch Library (Bookmarks)
        const { data: bookmarksData } = await supabase
            .from('bookmarks')
            .select(`
                *,
                webtoon:webtoons(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setLibrary(bookmarksData?.map((b: any) => b.webtoon) || []);

        // 6. Fetch Following
        const { data: followsData } = await supabase
            .from('follows')
            .select(`
                *,
                webtoon:webtoons(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setFollowing(followsData?.map((f: any) => f.webtoon) || []);

        // 7. Fetch Activity Logs
        const { data: logsData } = await supabase
            .from('user_activity_log')
            .select('*')
            .eq('user_id', user.id)
            .order('activity_date', { ascending: false });

        setActivityLogs(logsData || []);

        setLoading(false);
    }"""
    
    new_func = """    async function getProfileData() {
        if (!user) return;
        setLoading(true);

        const today = new Date();

        try {
            // FIRE ALL 8 SQL QUERIES PARALLEL
            const [
                { count: readCount },
                { count: commentCount },
                { count: likeCount },
                { data: recentActivity },
                { data: historyData },
                { data: bookmarksData },
                { data: followsData },
                { data: logsData }
            ] = await Promise.all([
                supabase.from('reading_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('reading_progress').select('last_read_at, webtoon:webtoons(genres)').eq('user_id', user.id),
                supabase.from('reading_progress').select(`*, webtoon:webtoons(id, title, image), chapter:chapters(id, title)`).eq('user_id', user.id).order('last_read_at', { ascending: false }).limit(50),
                supabase.from('bookmarks').select(`*, webtoon:webtoons(*)`).eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('follows').select(`*, webtoon:webtoons(*)`).eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('user_activity_log').select('*').eq('user_id', user.id).order('activity_date', { ascending: false })
            ]);

            setStats({
                readCount: readCount || 0,
                commentCount: commentCount || 0,
                likeCount: likeCount || 0
            });

            const newWeeklyActivity = Array(7).fill(false);
            const genreCounts: Record<string, number> = {};
            let totalGenres = 0;

            if (recentActivity) {
                recentActivity.forEach((item: any) => {
                    if (item.last_read_at) {
                        const date = new Date(item.last_read_at);
                        const diffTime = Math.abs(today.getTime() - date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 7) newWeeklyActivity[7 - diffDays] = true;
                    }
                    if (item.webtoon?.genres && Array.isArray(item.webtoon.genres)) {
                        item.webtoon.genres.forEach((genre: string) => {
                            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                            totalGenres++;
                        });
                    }
                });
            }
            setWeeklyActivity(newWeeklyActivity);

            const sortedGenres = Object.entries(genreCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count], index) => ({
                    name,
                    percentage: (count / totalGenres) * 100,
                    color: index === 0 ? "text-primary" : index === 1 ? "text-blue-500" : "text-yellow-500"
                }));
            setTopGenres(sortedGenres);

            setHistory(historyData || []);
            setLibrary(bookmarksData?.map((b: any) => b.webtoon) || []);
            setFollowing(followsData?.map((f: any) => f.webtoon) || []);
            setActivityLogs(logsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }"""
    
    content = content.replace(old_func, new_func)

    # 2. Fix Loading Spinner UI to show header instantly
    old_loading = """    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }"""
    
    new_loading = """    if (authLoading || (!user && loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }"""
    
    content = content.replace(old_loading, new_loading)
    
    # 3. Add skeleton loader only to the content area
    old_tabs_render = """            <div className="max-w-6xl mx-auto px-4 md:px-8">
                {activeTab === "overview" && ("""
                
    new_tabs_render = """            <div className="max-w-6xl mx-auto px-4 md:px-8">
                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-white/40 font-black uppercase tracking-[0.2em] text-xs animate-pulse">Мэдээлэл уншиж байна...</p>
                    </div>
                ) : activeTab === "overview" && ("""
                
    content = content.replace(old_tabs_render, new_tabs_render)
    
    # Needs to cap off the ternary for loading
    old_closing = """                    </div>
                )}
            </div>
        </main>"""
        
    new_closing = """                    </div>
                )}
            </div>
        </main>"""
        
    # Wait, simple way: replace `<div className="max-w-6xl mx-auto px-4 md:px-8">` to `<div className="max-w-6xl mx-auto px-4 md:px-8">{loading ? (... loader ...) : (<>`
    # And then append `</>)}` before `</div>\n        </main>`
    
    # Let's do it via split:
    parts = content.split('<div className="max-w-6xl mx-auto px-4 md:px-8">')
    if len(parts) == 2:
        inner = parts[1]
        footer_parts = inner.rsplit('            </div>\n        </main>', 1)
        if len(footer_parts) == 2:
            new_inner = f"""
                {{loading ? (
                    <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        </div>
                        <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Мэдээлэл ачаалж байна...</p>
                    </div>
                ) : (
                    <>{footer_parts[0]}                    </>
                )}}
            </div>
        </main>{footer_parts[1]}"""
            
            content = parts[0] + '<div className="max-w-6xl mx-auto px-4 md:px-8">' + new_inner

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    fix_profile()
