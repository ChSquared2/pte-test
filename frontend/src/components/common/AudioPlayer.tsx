import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  label?: string;
  playbackRate?: number;
  maxPlays?: number;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export default function AudioPlayer({
  src,
  label,
  playbackRate = 1,
  maxPlays = Infinity,
  onEnded,
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playCount, setPlayCount] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
    setError(false);
  }, [playbackRate, src]);

  const handleEnded = () => {
    const next = playCount + 1;
    setPlayCount(next);
    if (next >= maxPlays) {
      setDisabled(true);
    }
    onEnded?.();
  };

  const handlePlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (disabled) {
      e.currentTarget.pause();
      e.currentTarget.currentTime = 0;
    }
  };

  const handleError = () => {
    setError(true);
    // If audio fails, trigger onEnded so the flow can continue (e.g., speaking questions proceed to recording)
    onEnded?.();
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm text-red-600">Audio could not be loaded. You may skip this question or continue without audio.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-3">
      {label && <p className="text-xs text-gray-500 mb-2">{label}</p>}
      <audio
        ref={audioRef}
        controls
        src={src}
        className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onError={handleError}
        autoPlay={autoPlay}
      />
      {maxPlays < Infinity && (
        <p className="text-xs text-gray-400 mt-1 text-right">
          {disabled
            ? 'Audio played — no more replays'
            : `Plays remaining: ${maxPlays - playCount}`}
        </p>
      )}
    </div>
  );
}
