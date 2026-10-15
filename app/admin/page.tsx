"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { EpisodeComposition } from "../remotion/EpisodeComposition";

// Define the shape of our API response
interface GeneratedPanel {
  prompt: string;
  imageUrl: string | null;
}

interface PipelineResponse {
  success: boolean;
  episode_number: number;
  masterScript: string;
  generatedPanels: GeneratedPanel[];
  newState: any;
  error?: string;
}

export default function AdminStudio() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executePipeline = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pipeline execution failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter out any panels where the image failed to generate so the video player doesn't crash
  const validPanels = result?.generatedPanels.filter(
    (panel): panel is { prompt: string; imageUrl: string } => panel.imageUrl !== null
  ) || [];

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 selection:bg-amber-500 selection:text-black">
      
      {/* HEADER */}
      <header className="mb-12 border-b-2 border-gray-800 pb-6">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
          HeroesVsVillains <span className="text-indigo-500">Studio Engine</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">BATCH PRODUCTION CONTROL DECK</p>
      </header>

      {/* CONTROLS */}
      <div className="mb-12">
        <button
          onClick={executePipeline}
          disabled={loading}
          className={`px-8 py-4 text-xl font-bold uppercase tracking-widest border-2 transition-all duration-300 ${
            loading
              ? "border-gray-600 text-gray-600 cursor-not-allowed shadow-none"
              : "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          }`}
        >
          {loading ? "System Compiling (≈ 45s)..." : "Execute Next Episode"}
        </button>

        {error && (
          <div className="mt-6 p-4 border-l-4 border-red-500 bg-red-950/30 text-red-400">
            <strong>CRITICAL ERROR:</strong> {error}
          </div>
        )}
      </div>

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* REMOTION VIDEO PLAYER - Spans both columns */}
          {validPanels.length > 0 && (
            <section className="col-span-1 lg:col-span-2 border border-gray-800 bg-gray-950 p-6">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">
                Director's Cut Video Preview
              </h2>
              <div className="w-full flex justify-center border border-gray-800 bg-black p-4">
                <Player
                  component={EpisodeComposition}
                  inputProps={{ panels: validPanels }}
                  durationInFrames={validPanels.length * 90}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  style={{
                    width: '100%',
                    maxWidth: '1000px',
                    aspectRatio: '16/9',
                  }}
                  controls
                  autoPlay
                  loop
                />
              </div>
            </section>
          )}

          {/* THE MASTER SCRIPT */}
          <section className="border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">
              Episode {result.episode_number} Master Script
            </h2>
            <div className="whitespace-pre-wrap text-sm text-gray-400 leading-relaxed max-h-[800px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-800">
              {result.masterScript}
            </div>
            
            <h3 className="text-lg font-bold text-amber-500 mt-8 mb-2 border-b border-gray-800 pb-1">
              New WorldState Cliffhanger (For Episode {result.episode_number + 1})
            </h3>
            <div className="text-sm text-gray-400 italic">
              {result.newState.active_cliffhanger}
            </div>
          </section>

          {/* THE VISUAL RENDER GRID - Syntax Error Fixed Here! */}
          <section className="border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">
              Raw FLUX.1 Asset Grid
            </h2>
            <div className="space-y-8 max-h-[800px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-800">
              {result.generatedPanels.map((panel, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-900 text-indigo-200 px-2 py-1 text-xs font-bold">
                      PANEL {idx + 1}
                    </span>
                  </div>
                  {panel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={panel.imageUrl} 
                      alt={`Panel ${idx + 1}`} 
                      className="w-full aspect-video object-cover border border-gray-800 grayscale-[20%] contrast-125"
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center border border-red-900 bg-red-950/20 text-red-500 text-sm">
                      RENDER FAILED
                    </div>
                  )}
                  <p className="text-xs text-gray-600">
                    {panel.prompt}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
