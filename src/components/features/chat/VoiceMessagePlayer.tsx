import React, { useMemo, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string;
  mine?: boolean;
  name?: string | null;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ src, mine = false, name }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const bars = useMemo(() => Array.from({ length: 34 }, (_, index) => 24 + ((index * 17) % 58)), []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  };

  const changeSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    // min() caps the floor at the bubble's own width, so a voice note stays wide
    // enough to scrub on a desktop without overflowing a narrow phone.
    <div className={`mb-1 min-w-[min(250px,100%)] rounded-2xl p-2.5 ${mine ? 'bg-white/10' : 'bg-sun-surface-light'}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => void togglePlayback()} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${mine ? 'bg-white text-sun-primary' : 'bg-sun-primary text-white'}`} aria-label={playing ? 'Pause voice message' : 'Play voice message'}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="relative flex h-8 items-center gap-[2px] overflow-hidden">
            {bars.map((height, index) => {
              const active = duration > 0 && index / bars.length <= currentTime / duration;
              return <span key={index} className={`w-1 rounded-full transition-colors ${active ? (mine ? 'bg-white' : 'bg-sun-primary') : (mine ? 'bg-white/30' : 'bg-sun-border')}`} style={{ height: `${height}%` }} />;
            })}
            <input aria-label="Scrub voice message" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { const value = Number(event.target.value); setCurrentTime(value); if (audioRef.current) audioRef.current.currentTime = value; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </div>
          <div className={`flex items-center justify-between text-[9px] ${mine ? 'text-white/65' : 'text-sun-text-muted'}`}><span>{formatDuration(currentTime)} / {formatDuration(duration)}</span><span className="truncate pl-2">{name || 'Voice note'}</span></div>
        </div>
        <button type="button" onClick={changeSpeed} className="rounded-lg px-1.5 py-1 text-[9px] font-bold hover:bg-black/5" aria-label="Change playback speed">{speed}x</button>
        <a href={src} download={name || 'korusa-voice-note'} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/5" aria-label="Download voice message"><Download size={13} /></a>
      </div>
    </div>
  );
};

function formatDuration(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  return `${minutes}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}
