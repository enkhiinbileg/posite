"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function getAdminClient() {
    return supabaseAdmin;
}

type RoleField = 'is_translator' | 'is_moderator' | 'is_admin' | 'is_youtuber';

export async function toggleUserRole(userId: string, field: RoleField, newValue: boolean) {
    const db = getAdminClient();
    const { error } = await db.from('profiles').update({ [field]: newValue }).eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function fetchAllUsersAction(searchTerm: string = '', filterType: string = 'all') {
    const db = getAdminClient();
    let query = db.from('profiles').select('*, vip_expiration, nsfw_vip_expiration').order('created_at', { ascending: false });

    if (searchTerm) {
        const cleanSearch = searchTerm.trim().startsWith('#') ? searchTerm.trim().slice(1) : searchTerm.trim();
        const searchPattern = `%${cleanSearch}%`;
        
        let conditions = `username.ilike.${searchPattern},full_name.ilike.${searchPattern},email.ilike.${searchPattern}`;
        
        // Always try to search numeric as either dynamic ID or prefix
        const numericSearch = Number(cleanSearch);
        if (!isNaN(numericSearch)) {
            // Search in unique_id exactly or as pattern
            conditions += `,unique_id.ilike.${searchPattern}`;
        }

        query = query.or(conditions);
    }
    if (filterType === 'admin') query = query.eq('is_admin', true);
    else if (filterType === 'moderator') query = query.eq('is_moderator', true);
    else if (filterType === 'youtuber') query = query.eq('is_youtuber', true);
    else if (filterType === 'translator') query = query.eq('is_translator', true);
    else if (filterType === 'vip') query = query.eq('is_vip', true);

    const { data, error } = await query.limit(100);
    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data || [] };
}

export async function fetchPricingPlansAction() {
    const db = getAdminClient();
    const { data } = await db.from('pricing_plans').select('*').order('order_index', { ascending: true });
    return data || [];
}

const TIER_COMMISSIONS: Record<string, number> = {
    bronze: 0.20,
    silver: 0.25,
    gold: 0.30
};

export async function grantVipAction(params: {
    userId: string;
    adminId: string;
    planTitle: string;
    price: number;
    durationValue: number;
    durationUnit: string;
    isTest?: boolean;
}) {
    const db = getAdminClient();
    const { userId, adminId, planTitle, price, durationValue, durationUnit, isTest } = params;

    // Fetch current VIP status and referral info
    const { data: profile } = await db
        .from('profiles')
        .select('is_vip, vip_expiration, referred_by')
        .eq('id', userId)
        .single();

    let newExpiration = new Date();
    if (profile?.is_vip && profile.vip_expiration) {
        const currentExp = new Date(profile.vip_expiration);
        if (currentExp > newExpiration) newExpiration = currentExp;
    }

    if (durationUnit === 'months') newExpiration.setMonth(newExpiration.getMonth() + durationValue);
    else if (durationUnit === 'years') newExpiration.setFullYear(newExpiration.getFullYear() + durationValue);
    else if (durationUnit === 'days') newExpiration.setDate(newExpiration.getDate() + durationValue);
    else newExpiration.setMinutes(newExpiration.getMinutes() + durationValue); // minutes (test)

    // Update profile
    const { error } = await db.from('profiles').update({
        is_vip: true,
        vip_expiration: newExpiration.toISOString(),
        nsfw_vip_expiration: newExpiration.toISOString(),
        show_nsfw: true
    }).eq('id', userId);

    if (error) return { success: false, error: error.message };

    // Log grant & Commission logic in parallel
    let durationDays = 0;
    if (durationUnit === 'days') durationDays = durationValue;
    else if (durationUnit === 'months') durationDays = durationValue * 30;
    else if (durationUnit === 'years') durationDays = durationValue * 365;

    const promises: any[] = [];

    promises.push(db.from('vip_grants').insert({
        user_id: userId,
        granted_by: adminId,
        package_type: planTitle.toLowerCase(),
        price,
        duration_days: durationDays
    }));

    // Affiliate commission
    if (profile?.referred_by && !isTest && price > 0) {
        // Fetch affiliate tier of referrer
        promises.push((async () => {
            const { data: referrerProfile } = await db
                .from('profiles')
                .select('affiliate_tier')
                .eq('id', profile.referred_by)
                .single();

            const affiliateTier = referrerProfile?.affiliate_tier || 'bronze';
            const commissionRate = TIER_COMMISSIONS[affiliateTier] || 0.20;
            const commission = price * commissionRate;

            await db.from('commissions').insert({
                youtuber_id: profile.referred_by,
                buyer_id: userId,
                amount: price,
                commission_amount: commission,
                status: 'pending'
            });
        })());
    }

    await Promise.all(promises);

    return { success: true, commissionApplied: !!(profile?.referred_by && !isTest && price > 0) };
}

export async function revokeVipAction(userId: string, adminId: string, lastGrantPrice: number) {
    const db = getAdminClient();

    const { error } = await db.from('profiles').update({
        is_vip: false,
        vip_expiration: null,
        nsfw_vip_expiration: null
    }).eq('id', userId);

    if (error) return { success: false, error: error.message };

    // Log revoke
    await db.from('vip_grants').insert({
        user_id: userId,
        granted_by: adminId,
        package_type: 'revoke_refund',
        price: -Math.abs(lastGrantPrice),
        duration_days: 0
    });

    return { success: true };
}

export async function grantNsfwVipAction(params: {
    userId: string;
    adminId: string;
    durationDays: number;
}) {
    const db = getAdminClient();
    const { userId, adminId, durationDays } = params;

    // Fetch current NSFW VIP status
    const { data: profile } = await db
        .from('profiles')
        .select('nsfw_vip_expiration')
        .eq('id', userId)
        .single();

    let newExpiration = new Date();
    if (profile?.nsfw_vip_expiration) {
        const currentExp = new Date(profile.nsfw_vip_expiration);
        if (currentExp > newExpiration) newExpiration = currentExp;
    }

    newExpiration.setDate(newExpiration.getDate() + durationDays);

    // Update profile
    const { error } = await db.from('profiles').update({
        nsfw_vip_expiration: newExpiration.toISOString(),
        show_nsfw: true
    }).eq('id', userId);

    if (error) return { success: false, error: error.message };

    // Log grant (using a custom type for tracking)
    await db.from('vip_grants').insert({
        user_id: userId,
        granted_by: adminId,
        package_type: 'nsfw_vip_grant',
        price: 0,
        duration_days: durationDays
    });

    return { success: true };
}

export async function revokeNsfwVipAction(userId: string, adminId: string) {
    const db = getAdminClient();

    const { error } = await db.from('profiles').update({
        nsfw_vip_expiration: null
    }).eq('id', userId);

    if (error) return { success: false, error: error.message };

    // Log revoke
    await db.from('vip_grants').insert({
        user_id: userId,
        granted_by: adminId,
        package_type: 'nsfw_vip_revoke',
        price: 0,
        duration_days: 0
    });

    return { success: true };
}
