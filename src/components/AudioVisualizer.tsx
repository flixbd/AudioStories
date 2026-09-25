import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  speaker: string;
  characterKey: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  speaker,
  characterKey,
}) => {
  const [bars, setBars] = useState<number[]>([15, 25, 40, 20, 60, 35, 75, 45, 90, 50, 70, 30, 45, 20]);

  useEffect(() => {
    if (!isPlaying) {
      setBars((prev) => prev.map(() => 8));
      return;
    }

    const interval = setInterval(() => {
      setBars(
        Array.from({ length: 16 }, () => {
          // Dynamic amplitude variation based on character
          const multiplier = characterKey === 'nirmal' ? 1.2 : characterKey === 'minati' ? 0.7 : 0.95;
          return Math.floor((Math.random() * 70 + 20) * multiplier);
        }),
      );
    }, 110);

    return () => clearInterval(interval);
  }, [isPlaying, characterKey]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded border border-[#2C241E] bg-[#161210]">
      {/* Waveform bars */}
      <div className="flex items-center gap-1 h-7 w-32">
        {bars.map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${
              isPlaying
                ? characterKey === 'nabanita'
                  ? 'bg-amber-300'
                  : characterKey === 'nirmal'
                  ? 'bg-red-400'
                  : characterKey === 'minati'
                  ? 'bg-emerald-400'
                  : 'bg-[#D97706]'
                : 'bg-[#3A3129]'
            }`}
            style={{ height: `${Math.min(100, Math.max(12, height))}%` }}
          />
        ))}
      </div>

      {/* Speaker and acting indicator */}
      <div className="border-l border-[#2C241E] pl-3">
        <span className="text-[11px] font-sans uppercase tracking-widest text-[#A89F91] block">
          {isPlaying ? 'কথা বলছেন' : 'নিস্তব্ধতা'}
        </span>
        <span className="text-xs font-serif font-medium text-[#F5EFE6] truncate max-w-[140px] block">
          {isPlaying ? speaker : 'অপেক্ষা করছে...'}
        </span>
      </div>
    </div>
  );
};
