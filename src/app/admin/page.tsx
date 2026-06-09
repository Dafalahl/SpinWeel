import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import AdminClient from '@/components/AdminClient';

export const revalidate = 0;

export default async function AdminDashboard() {
  // 1. Fetch all prizes
  const { data: prizes, error: prizesError } = await supabaseAdmin
    .from('prizes')
    .select('*')
    .order('created_at', { ascending: true });

  if (prizesError) {
    console.error('Error fetching prizes for admin:', prizesError.message || prizesError);
  }

  // 2. Fetch total spins
  const { count: totalSpins, error: spinsError } = await supabaseAdmin
    .from('spins')
    .select('*', { count: 'exact', head: true });

  if (spinsError) {
    console.error('Error fetching total spins count:', spinsError.message || spinsError);
  }

  // 3. Fetch win statistics from view
  const { data: winStats, error: statsError } = await supabaseAdmin
    .from('prize_win_stats')
    .select('*');

  if (statsError) {
    console.error('Error fetching win statistics from view:', statsError.message || statsError);
    // If the database view is not created yet, we can log it and fall back to empty statistics
  }

  return (
    <AdminClient
      initialPrizes={prizes || []}
      totalSpins={totalSpins || 0}
      winStats={winStats || []}
    />
  );
}
