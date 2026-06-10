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
    // Validate uniqueness and non-emptiness of prize names
    const names = upserts.map((p) => p.name.trim().toLowerCase());
    const hasDuplicates = names.some((name, index) => names.indexOf(name) !== index);
    if (hasDuplicates) {
      return NextResponse.json(
        { error: 'Nama hadiah tidak boleh duplikat/sama.' },
        { status: 400 }
      );
    }

    const hasEmptyName = upserts.some((p) => p.name.trim() === '');
    if (hasEmptyName) {
      return NextResponse.json(
        { error: 'Nama hadiah tidak boleh kosong.' },
        { status: 400 }
      );
    }

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

    // 3. Separate new records (temp IDs) from existing records (real UUIDs)
    const newPrizes = upserts.filter((p) => p.id.startsWith('temp-'));
    const existingPrizes = upserts.filter((p) => p.id && !p.id.startsWith('temp-'));

    // Helper to build a clean record
    const buildClean = (p: PrizeInput, includeId: boolean) => ({
      ...(includeId ? { id: p.id } : {}),
      name: p.name,
      color: p.color || '#3B82F6',
      probability: Number(p.probability),
      stock:
        p.stock === '' || p.stock === null || p.stock === undefined
          ? null
          : Math.max(
              0,
              typeof p.stock === 'string' ? parseInt(p.stock, 10) : Number(p.stock)
            ),
      is_zonk: p.is_zonk,
      active: p.active,
    });

    // 3a. INSERT brand-new prizes (no id needed — DB will generate UUID)
    if (newPrizes.length > 0) {
      const inserts = newPrizes.map((p) => buildClean(p, false));
      const { error: insertError } = await supabaseAdmin.from('prizes').insert(inserts);

      if (insertError) {
        console.error('Insert error:', insertError.message || insertError);
        return NextResponse.json({ error: 'Gagal menyimpan hadiah baru.' }, { status: 500 });
      }
    }

    // 3b. UPSERT existing prizes (preserve their UUID so the row is updated, not duplicated)
    if (existingPrizes.length > 0) {
      const upsertRows = existingPrizes.map((p) => buildClean(p, true));
      const { error: upsertError } = await supabaseAdmin
        .from('prizes')
        .upsert(upsertRows, { onConflict: 'id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError.message || upsertError);
        return NextResponse.json({ error: 'Gagal memperbarui data hadiah.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save prizes API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

