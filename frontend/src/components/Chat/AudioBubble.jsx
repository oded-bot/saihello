import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

// Fake-Waveform generieren (deterministisch basierend auf URL)
function generateWaveform(src, bars = 30) {
  let hash = 0;
  for (let i = 0; i < (src || '').length; i++) {
    hash = ((hash << 5) - hash) + src.charCodeAt(i);
    hash |= 0;
  }
  const wave = [];
  for (let i = 0; i < bars; i++) {
    hash = (hash * 16807 + 12345) & 0x7fffffff;
    wave.push(0.2 + (hash % 100) / 120);
  }
  return wave;
}

export default function AudioBubble({ src, isMe }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const waveform = generateWaveform(src);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setLoaded(true);
    });
    audio.addEventListener('canplaythrough', () => setLoaded(true));
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    });
    audio.addEventListener('error', () => {
      setLoaded(false);
    });

    // Preload
    audio.load();

    return () => {
      audio.pause();
      audio.src = '';
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !loaded) return;

    if (playing) {
      audio.pause();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audio.play().catch(() => {});
      function updateProgress() {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
        animRef.current = requestAnimationFrame(updateProgress);
      }
      updateProgress();
    }
    setPlaying(!playing);
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const activeColor = isMe ? 'bg-white/40' : 'bg-tinder-pink/50';
  const inactiveColor = isMe ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-500';
  const playBtnColor = isMe ? 'bg-white/30 text-white' : 'bg-tinder-pink/20 text-tinder-pink';

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-1">
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${playBtnColor} active:scale-90 transition`}
      >
        {playing
          ? <Pause size={16} fill="currentColor" />
          : <Play size={16} fill="currentColor" className="ml-0.5" />
        }
      </button>
      <div className="flex-1">
        {/* Waveform */}
        <div className="flex items-center gap-[2px] h-6">
          {waveform.map((h, i) => {
            const isActive = i / waveform.length <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-100 ${isActive ? activeColor : inactiveColor}`}
                style={{ height: `${h * 24}px` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className={`text-[9px] ${isMe ? 'text-white/50' : 'text-gray-400'}`}>
            {playing ? formatTime(audioRef.current?.currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
