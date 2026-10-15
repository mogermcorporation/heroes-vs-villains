"use client";

import { Player } from "@remotion/player";
import { EpisodeComposition } from "../remotion/EpisodeComposition";

export default function ComicPlayer({ panels }: { panels: any[] }) {
  return (
    <div className="w-full flex justify-center border border-gray-800 bg-black p-2 shadow-2xl shadow-indigo-900/10">
      <Player
        component={EpisodeComposition}
        inputProps={{ panels }}
        durationInFrames={panels.length * 90}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        style={{ width: '100%', maxWidth: '1200px', aspectRatio: '16/9' }}
        controls
        autoPlay
        loop
      />
    </div>
  );
}
