import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring } from 'remotion';

export const MotionPanel = ({ imageUrl, prompt }: { imageUrl: string, prompt: string }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 90], [1, 1.15], {
    extrapolateRight: 'clamp',
  });

  const shakeX = interpolate(frame, [60, 63, 66, 69, 72, 75], [0, -15, 15, -10, 5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const shakeY = interpolate(frame, [60, 63, 66, 69, 72, 75], [0, 10, -10, 8, -5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textOpacity = interpolate(frame, [60, 65], [0, 1]);
  const textScale = spring({ frame: frame - 60, fps: 30, config: { damping: 12 } });

  return (
    <AbsoluteFill className="bg-black overflow-hidden flex items-center justify-center">
      <AbsoluteFill 
        style={{ 
          transform: `scale(${scale}) translate(${shakeX}px, ${shakeY}px)`,
          transformOrigin: 'center center' 
        }}
      >
        <Img 
          src={imageUrl} 
          className="w-full h-full object-cover grayscale-[20%] contrast-[1.2]" 
        />
      </AbsoluteFill>

      <AbsoluteFill 
        className="flex items-center justify-end pb-12 px-8"
        style={{ opacity: textOpacity, transform: `scale(${textScale})` }}
      >
        <div className="bg-amber-500 text-black font-black text-3xl uppercase tracking-tighter p-4 border-l-8 border-white shadow-2xl max-w-2xl text-center">
          {prompt.substring(0, 60)}...
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
