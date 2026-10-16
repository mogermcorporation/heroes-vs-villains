import { supabaseAdmin } from '@/utils/supabase';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get('episodeId');

  if (!episodeId) {
    return NextResponse.json({ error: 'Missing episodeId' }, { status: 400 });
  }

  const { data: panels, error } = await supabaseAdmin
    .from('panels')
    .select('*')
    .eq('episode_id', episodeId)
    .order('panel_sequence', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ panels });
}
