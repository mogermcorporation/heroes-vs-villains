import { AbsoluteFill, Sequence } from 'remotion';
import { MotionPanel } from './MotionPanel';

interface PanelData {
  imageUrl: string;
  prompt: string;
}

export const EpisodeComposition = ({ panels }: { panels: PanelData[] }) => {
  const PANEL_DURATION = 90;

  return (
    <AbsoluteFill className="bg-black">
      {panels.map((panel, index) => (
        <Sequence
          key={index}
          from={index * PANEL_DURATION}
          durationInFrames={PANEL_DURATION}
        >
          <MotionPanel imageUrl={panel.imageUrl} prompt={panel.prompt} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
