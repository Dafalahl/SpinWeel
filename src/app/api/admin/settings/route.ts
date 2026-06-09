import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to check admin authentication
function getIsAuthenticated(request: Request): boolean {
  const sessionCookie = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('admin_session='))
    ?.split('=')[1];
  return sessionCookie === 'true';
}

export async function GET(request: Request) {
  if (!getIsAuthenticated(request)) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 });
  }

  try {
    const { data: settingsData, error } = await supabaseAdmin
      .from('settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error.message || error);
      return NextResponse.json({ error: 'Gagal mengambil data pengaturan.' }, { status: 500 });
    }

    const settingsObj = {
      force_lose: settingsData?.find(s => s.key === 'force_lose')?.value === 'true',
      spin_pin: settingsData?.find(s => s.key === 'spin_pin')?.value || '',
    };

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Settings GET API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!getIsAuthenticated(request)) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 });
  }

  try {
    const { force_lose, spin_pin } = await request.json() as {
      force_lose: boolean;
      spin_pin: string;
    };

    const updates = [
      { key: 'force_lose', value: force_lose ? 'true' : 'false' },
      { key: 'spin_pin', value: (spin_pin || '').trim() }
    ];

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(updates);

    if (error) {
      console.error('Settings update error:', error.message || error);
      return NextResponse.json({ error: 'Gagal menyimpan pengaturan.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings POST API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
