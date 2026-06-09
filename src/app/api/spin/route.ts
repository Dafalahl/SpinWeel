import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Define Interface for Prize
interface Prize {
  id: string;
  name: string;
  color: string;
  probability: number;
  stock: number | null;
  stock_used: number;
  is_zonk: boolean;
  active: boolean;
}

export async function POST() {
  try {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      // 1. Fetch active prizes from Supabase
      const { data: prizes, error: fetchError } = await supabaseAdmin
        .from('prizes')
        .select('*')
        .eq('active', true);

      if (fetchError || !prizes || prizes.length === 0) {
        if (fetchError) {
          console.error('Error fetching prizes for spin:', fetchError.message || fetchError);
        }
        return NextResponse.json(
          { error: 'No active prizes available.' },
          { status: 500 }
        );
      }

      // Filter out prizes that are out of stock
      const availablePrizes: Prize[] = prizes.filter(
        (p: Prize) => p.stock === null || p.stock_used < p.stock
      );

      if (availablePrizes.length === 0) {
        return NextResponse.json(
          { error: 'All prizes are currently out of stock.' },
          { status: 400 }
        );
      }

      // 2. Perform weighted random selection
      const totalProbability = availablePrizes.reduce(
        (sum, p) => sum + Number(p.probability),
        0
      );

      if (totalProbability <= 0) {
        return NextResponse.json(
          { error: 'Total probability of available prizes must be greater than 0.' },
          { status: 500 }
        );
      }

      let r = Math.random() * totalProbability;
      let selectedPrize: Prize | null = null;

      for (const prize of availablePrizes) {
        r -= Number(prize.probability);
        if (r <= 0) {
          selectedPrize = prize;
          break;
        }
      }

      if (!selectedPrize) {
        selectedPrize = availablePrizes[availablePrizes.length - 1];
      }

      // 3. Atomically increment the stock_used using our RPC function
      const { data: success, error: rpcError } = await supabaseAdmin.rpc(
        'increment_prize_stock',
        { target_prize_id: selectedPrize.id }
      );

      if (rpcError) {
        console.error('RPC Error incrementing stock:', rpcError.message || rpcError);
        // Continue and try to re-roll
        continue;
      }

      // If stock increment failed (returned false), it means the stock just ran out
      // due to another concurrent spin. We should re-roll (retry).
      if (!success) {
        console.warn(`Prize "${selectedPrize.name}" ran out of stock concurrently. Re-rolling...`);
        continue;
      }

      // 4. Record the spin in the spins table
      const { error: spinInsertError } = await supabaseAdmin
        .from('spins')
        .insert({
          prize_id: selectedPrize.id,
          prize_name: selectedPrize.name,
        });

      if (spinInsertError) {
        console.error('Failed to log spin in DB:', spinInsertError.message || spinInsertError);
        // We still return the prize name to the user since the stock was successfully secured
      }

      // 5. Return prize_name, color, and is_zonk
      return NextResponse.json({
        prize_name: selectedPrize.name,
        color: selectedPrize.color,
        is_zonk: selectedPrize.is_zonk,
      });
    }

    // If we exhausted all retries, try to fall back to any active unlimited stock prize
    const { data: fallbackPrizes } = await supabaseAdmin
      .from('prizes')
      .select('*')
      .eq('active', true)
      .is('stock', null);

    if (fallbackPrizes && fallbackPrizes.length > 0) {
      // Pick a random one
      const fallbackPrize = fallbackPrizes[Math.floor(Math.random() * fallbackPrizes.length)];
      
      // Log the fallback spin
      await supabaseAdmin.from('spins').insert({
        prize_id: fallbackPrize.id,
        prize_name: fallbackPrize.name,
      });

      return NextResponse.json({
        prize_name: fallbackPrize.name,
        color: fallbackPrize.color,
        is_zonk: fallbackPrize.is_zonk,
      });
    }

    return NextResponse.json(
      { error: 'Failed to process spin. Please try again.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error handling spin:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
