import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';

// Ensure the page is revalidated dynamically (no static shell generation)
export const revalidate = 0;

export default async function Home() {
  // Fetch active prizes from Supabase
  const { data: prizes, error } = await supabaseAdmin
    .from('prizes')
    .select('id, name, color, is_zonk')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading prizes for home page:', error.message || error);
  }

  return <HomeClient initialPrizes={prizes || []} />;
}
