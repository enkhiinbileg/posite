import os

def optimize_admin_dashboard():
    path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\admin\page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Parallize fetchStats
    old_fetchStats = """    async function fetchStats() {
        setLoading(true);

        // Check permissions
        const { data: { user } } = await supabase.auth.getUser();
        let isAdminUser = false;

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();
            isAdminUser = profile?.is_admin || false;
            setIsAdmin(isAdminUser);
        }

        // 1. Basic Counts — fetched via server action to avoid proxy timeouts
        const countsRes = await fetch('/api/admin/stats');
        const countsJson = countsRes.ok ? await countsRes.json() : {};
        const webtoons = countsJson.webtoons ?? 0;
        const chapters = countsJson.chapters ?? 0;
        const users = countsJson.users ?? 0;
        const likes = countsJson.likes ?? 0;
        const vipUsers = countsJson.vipUsers ?? 0;

        setStats({
            webtoons: webtoons || 0,
            chapters: chapters || 0,
            users: users || 0,
            likes: likes || 0,
            vipUsers: vipUsers || 0
        });

        // 2. User Growth Data (Mock data for demo if no history yet, ideally aggregate on created_at)
        // In real app: SQL function to group by date
        const { data: profiles } = await supabase.from('profiles').select('created_at').order('created_at', { ascending: true });

        // Process profiles for chart
        const tempMap: Record<string, number> = {};
        profiles?.forEach(p => {
            if (!p.created_at) return;
            const date = new Date(p.created_at).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
            tempMap[date] = (tempMap[date] || 0) + 1;
        });

        // Cumulative growth
        let cumulative = 0;
        const chart = Object.keys(tempMap).map(date => {
            cumulative += tempMap[date];
            return { date, users: cumulative };
        });

        // Populate with at least some data if empty
        if (chart.length === 0) {
            const today = new Date().toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
            chart.push({ date: today, users: users || 0 });
        }

        setChartData(chart);

        // 3. Genre Distribution
        const { data: allWebtoons } = await supabase.from('webtoons').select('genres');
        const genreCount: Record<string, number> = {};
        allWebtoons?.forEach(w => {
            w.genres?.forEach((g: string) => {
                genreCount[g] = (genreCount[g] || 0) + 1;
            });
        });

        const pieData = Object.keys(genreCount).map(g => ({ name: g, value: genreCount[g] }));
        setGenreData(pieData);

        // 4. Popular Webtoons (by follow_count)
        const { data: popular } = await supabase
            .from('webtoons')
            .select('title, follow_count')
            .order('follow_count', { ascending: false })
            .limit(5);
        setPopularWebtoons(popular || []);

        // 5. Recent Activities (Comments)
        const { data: recentComments } = await supabase
            .from('comments')
            .select('*, profiles(full_name), webtoons(title)')
            .order('created_at', { ascending: false })
            .limit(5);
        setRecentActivities(recentComments || []);

        setLoading(false);
    }"""
    
    new_fetchStats = """    async function fetchStats() {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        let isAdminUser = false;

        if (user) {
            const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
            isAdminUser = prof?.is_admin || false;
            setIsAdmin(isAdminUser);
        }

        try {
            // FIRE ALL QUERIES CONCURRENTLY
            const [
                countsRes,
                { data: profiles },
                { data: allWebtoons },
                { data: popular },
                { data: recentComments }
            ] = await Promise.all([
                fetch('/api/admin/stats'),
                supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
                supabase.from('webtoons').select('genres'),
                supabase.from('webtoons').select('title, follow_count').order('follow_count', { ascending: false }).limit(5),
                supabase.from('comments').select('*, profiles(full_name), webtoons(title)').order('created_at', { ascending: false }).limit(5)
            ]);

            const countsJson = countsRes.ok ? await countsRes.json() : {};
            setStats({
                webtoons: countsJson.webtoons || 0,
                chapters: countsJson.chapters || 0,
                users: countsJson.users || 0,
                likes: countsJson.likes || 0,
                vipUsers: countsJson.vipUsers || 0
            });

            // Chart Data
            const tempMap: Record<string, number> = {};
            profiles?.forEach(p => {
                if (!p.created_at) return;
                const date = new Date(p.created_at).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
                tempMap[date] = (tempMap[date] || 0) + 1;
            });

            let cumulative = 0;
            const chart = Object.keys(tempMap).map(date => {
                cumulative += tempMap[date];
                return { date, users: cumulative };
            });

            if (chart.length === 0) {
                const today = new Date().toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
                chart.push({ date: today, users: countsJson.users || 0 });
            }
            setChartData(chart);

            // Genre Distribution
            const genreCount: Record<string, number> = {};
            allWebtoons?.forEach(w => {
                w.genres?.forEach((g: string) => {
                    genreCount[g] = (genreCount[g] || 0) + 1;
                });
            });
            setGenreData(Object.keys(genreCount).map(g => ({ name: g, value: genreCount[g] })));

            // Popular and Comments
            setPopularWebtoons(popular || []);
            setRecentActivities(recentComments || []);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    }"""
    
    content = content.replace(old_fetchStats, new_fetchStats)

    # 2. Fix the loading wrapper
    old_loading = """    if (loading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
    }"""
    content = content.replace(old_loading, "")
    
    # 3. Wrap everything after the header in {loading ? <Loader/> : <>...</>}
    
    old_body_start = """            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">"""
            
    new_body_start = """            {/* Loader / Content */}
            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    </div>
                    <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Мэдээлэл нэгтгэж байна...</p>
                </div>
            ) : (
                <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">"""
                
    content = content.replace(old_body_start, new_body_start)
    
    old_body_end = """                </div>
            </div>
        </div>
    );
}"""
    new_body_end = """                </div>
            </div>
            </>}
        </div>
    );
}"""
    
    content = content.replace(old_body_end, new_body_end)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    optimize_admin_dashboard()
