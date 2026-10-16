'use client';
import { useState } from 'react';
import MotionComicPlayer from '@/components/MotionComicPlayer';

export default function AdminDashboard() {
  const [latestEpisodeId, setLatestEpisodeId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setStatusMessage('Initializing Groq Scriptor & Pollinations Art Director...');
    try {
      const res = await fetch('/api/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLatestEpisodeId(data.episode_number);
        setStatusMessage(`Episode ${data.episode_number} generated successfully!`);
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-red-600">STUDIO CONTROL DECK</h1>
            <p className="text-sm text-zinc-400">Automated Motion Comic Pipeline ($0 Zero-Budget Stack)</p>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold rounded-xl transition shadow-lg shadow-red-950/50"
          >
            {loading ? 'Producing Episode...' : 'Execute Next Episode'}
          </button>
        </header>

        {statusMessage && (
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-300">
            {statusMessage}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-200">Live Motion Comic Player (Episode {latestEpisodeId})</h2>
          <MotionComicPlayer episodeId={latestEpisodeId} />
        </section>
      </div>
    </main>
  );
}
