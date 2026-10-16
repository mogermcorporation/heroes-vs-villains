'use client';
import { useState, useEffect } from 'react';

export default function MotionComicPlayer({ episodeId }: { episodeId: number }) {
  const [panels, setPanels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Fetch panels for this episode from Supabase
    fetch(`/api/panels?episodeId=${episodeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.panels) setPanels(data.panels);
      });
  }, [episodeId]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && panels.length > 0) {
      timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % panels.length);
      }, 3000); // 3 seconds per panel
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, panels]);

  if (panels.length === 0) return <div className="text-zinc-400 p-4">Loading motion comic panels...</div>;

  return (
    <div className="flex flex-col items-center bg-zinc-950 p-6 rounded-xl border border-zinc-800 max-w-2xl mx-auto">
      <div className="relative w-full h-[450px] overflow-hidden rounded-lg border border-zinc-700 bg-black">
        <img 
          src={panels[currentIndex]?.image_url} 
          alt={`Panel ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute bottom-0 inset-x-0 bg-black/80 p-4 text-zinc-200 text-sm border-t border-zinc-800">
          <p className="font-mono text-xs text-red-500 mb-1">PANEL {currentIndex + 1} OF {panels.length}</p>
          <p>{panels[currentIndex]?.flux_prompt}</p>
        </div>
      </div>
      
      <div className="flex gap-4 mt-4">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
        >
          {isPlaying ? 'Pause Motion' : 'Play Motion Comic'}
        </button>
        <button 
          onClick={() => setCurrentIndex((currentIndex + 1) % panels.length)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
        >
          Next Panel
        </button>
      </div>
    </div>
  );
}
