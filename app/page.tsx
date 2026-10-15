import { supabaseAdmin } from '@/utils/supabase';
import ComicPlayer from './components/ComicPlayer';
import { unstable_noStore as noStore } from 'next/cache';

export default async function PublicHomepage() {
  // Bypasses the cache safely in Next.js 16 without breaking the compiler
  noStore();

  // 1. Fetch the latest generated episode
  const { data: episodes, error: epError } = await supabaseAdmin
    .from('episodes')
    .select('*')
    .eq('status', 'generated')
    .order('episode_number', { ascending: false })
    .limit(1);

  if (epError || !episodes || episodes.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-gray-500 uppercase tracking-widest animate-pulse">
        Awaiting Broadcast Signal...
      </div>
    );
  }

  const latestEpisode = episodes[0];

  // 2. Fetch the panels for this specific episode
  const { data: panels } = await supabaseAdmin
    .from('panels')
    .select('*')
    .eq('episode_id', latestEpisode.id)
    .order('panel_sequence', { ascending: true });

  const validPanels = panels
    ?.filter((p) => p.image_url)
    .map((p) => ({
      prompt: p.flux_prompt,
      imageUrl: p.image_url,
    })) || [];

  return (
    <main className="min-h-screen bg-black text-gray-300 font-mono selection:bg-amber-500 selection:text-black pb-20">
      
      {/* HEADER */}
      <header className="border-b-2 border-gray-900 p-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
            Heroes<span className="text-indigo-600">Vs</span>Villains
          </h1>
          <p className="text-sm text-gray-500 mt-2 tracking-widest uppercase">
            Public Broadcast Terminal
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-amber-500 font-bold animate-pulse">● LIVE</div>
          <div className="text-xs text-gray-600 tracking-widest">SIGNAL ACQUIRED</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-12">
        
        {/* EPISODE TITLE */}
        <div className="mb-8 border-l-4 border-indigo-600 pl-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
            Episode {latestEpisode.episode_number}
          </h2>
          <p className="text-gray-500 text-sm mt-1 tracking-widest">LATEST DECRYPTED TRANSMISSION</p>
        </div>

        {/* VIDEO PLAYER */}
        {validPanels.length > 0 ? (
          <ComicPlayer panels={validPanels} />
        ) : (
          <div className="p-12 border border-gray-800 text-center text-gray-600">
            Visual assets corrupted or missing.
          </div>
        )}

        {/* DECRYPTED SCRIPT LOG */}
        <div className="mt-12 border border-gray-900 bg-gray-950 p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-amber-500 mb-4 uppercase tracking-widest border-b border-gray-900 pb-2">
            Decrypted Comm-Log
          </h3>
          <div className="whitespace-pre-wrap text-sm text-gray-400 leading-relaxed">
            {latestEpisode.master_script}
          </div>
        </div>

      </div>
    </main>
  );
}
