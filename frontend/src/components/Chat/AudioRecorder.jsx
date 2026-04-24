import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AudioRecorder({ matchId, onSent, expanded, onExpandedChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => cleanup();
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch(e) {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function handleMicClick() {
    if (isRecording) return; // Verhindere Doppel-Klick
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(200);
      setIsRecording(true);
      setDuration(0);
      if (onExpandedChange) onExpandedChange(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      toast.error('Mikrofon nicht verfügbar');
      reset();
    }
  }

  async function stopAndSend() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      reset();
      return;
    }
    setSending(true);

    mediaRecorderRef.current.onstop = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);

      if (cancelledRef.current) {
        reset();
        return;
      }

      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });

      if (blob.size < 500) {
        toast('Aufnahme zu kurz');
        reset();
        return;
      }

      try {
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
        const formData = new FormData();
        formData.append('audio', blob, `voice.${ext}`);
        const uploadRes = await api.post('/upload/audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await api.post(`/chat/${matchId}/messages`, { content: uploadRes.data.url, message_type: 'audio' });
        if (onSent) onSent();
      } catch (err) {
        toast.error('Senden fehlgeschlagen');
      }
      reset();
    };

    mediaRecorderRef.current.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    cleanup();
    reset();
  }

  function reset() {
    setIsRecording(false);
    setDuration(0);
    setSending(false);
    if (onExpandedChange) onExpandedChange(false);
  }

  function formatDuration(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // Immer nur den Mic-Button rendern wenn nicht aufnimmt
  if (!isRecording) {
    return (
      <button
        type="button"
        onClick={handleMicClick}
        className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center transition active:scale-90 shrink-0"
      >
        <Mic size={18} className="text-gray-500" />
      </button>
    );
  }

  // Aufnahme-Modus — wird als Overlay über den Input-Bereich gelegt
  return (
    <div className="absolute inset-0 flex items-center gap-1.5 px-3 bg-white dark:bg-dark-card z-10" style={{ animation: 'slideInRight 0.2s ease-out' }}>
      <button
        onClick={cancelRecording}
        className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center shrink-0 active:scale-90"
      >
        <X size={16} className="text-red-500" />
      </button>

      <div className="flex-1 flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 rounded-full px-3 py-2 min-w-0 overflow-hidden">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full recording-pulse shrink-0" />
        <span className="text-xs font-mono text-red-600 dark:text-red-400 font-semibold shrink-0">{formatDuration(duration)}</span>
        <div className="flex-1 flex items-center gap-[2px] h-5 overflow-hidden min-w-0">
          {Array.from({length: 20}).map((_, i) => (
            <div
              key={i}
              className="w-[2.5px] bg-red-400/50 rounded-full shrink-0"
              style={{
                height: `${3 + Math.random() * 17}px`,
                animation: `waveform ${0.3 + Math.random() * 0.3}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.04}s`,
              }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={stopAndSend}
        disabled={sending}
        className="w-10 h-10 tinder-gradient rounded-full flex items-center justify-center shrink-0 active:scale-90 transition disabled:opacity-40"
      >
        {sending
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Send size={16} className="text-white ml-0.5" />
        }
      </button>
    </div>
  );
}
