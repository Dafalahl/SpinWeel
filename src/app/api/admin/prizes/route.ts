import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface PrizeInput {
  id: string;
  name: string;
  color: string;
  probability: number;
  stock: number | string | null;
  is_zonk: boolean;
  active: boolean;
}

export async function POST(request: Request) {
  // Simple session check
  const sessionCookie = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('admin_session='))
    ?.split('=')[1];

  const isAuthenticated = sessionCookie === 'true';
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 });
  }

  try {
    const { upserts, deletes } = (await request.json()) as {
      upserts: PrizeInput[];
      deletes: string[];
    };

    // 1. Server-side validation
    // Calculate the total probability of active prizes after this update
    const activePrizes = upserts.filter((p) => p.active);
    const activeTotal = activePrizes.reduce((sum: number, p) => sum + Number(p.probability), 0);
    
    // Check if the sum is exactly 100 (handling minor float issues)
    if (Math.abs(activeTotal - 100) > 0.01) {
      return NextResponse.json(
        { error: `Total probabilitas hadiah aktif harus tepat 100% (saat ini ${activeTotal}%).` },
        { status: 400 }
      );
    }

    // 2. Perform deletions
    if (deletes && deletes.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('prizes')
        .delete()
        .in('id', deletes);

      if (deleteError) {
        console.error('Delete error:', deleteError.message || deleteError);
        return NextResponse.json({ error: 'Gagal menghapus hadiah dari database.' }, { status: 500 });
      }
    }

    // 3. Perform upserts
    if (upserts && upserts.length > 0) {
      const cleanUpserts = upserts.map((p) => {
        const item: {
          id?: string;
          name: string;
          color: string;
          probability: number;
          stock: number | null;
          is_zonk: boolean;
          active: boolean;
        } = {
          name: p.name,
          color: p.color || '#3B82F6',
          probability: Number(p.probability),
          stock: p.stock === '' || p.stock === null || p.stock === undefined ? null : Math.max(0, typeof p.stock === 'string' ? parseInt(p.stock, 10) : Number(p.stock)),
          is_zonk: p.is_zonk,
          active: p.active,
        };

        // If it's a real DB record (not a temp client ID), preserve the ID
        if (p.id && !p.id.startsWith('temp-')) {
          item.id = p.id;
        }

        return item;
      });

      const { error: upsertError } = await supabaseAdmin
        .from('prizes')
        .upsert(cleanUpserts);

      if (upsertError) {
        console.error('Upsert error:', upsertError.message || upsertError);
        return NextResponse.json({ error: 'Gagal menyimpan daftar hadiah.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save prizes API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

