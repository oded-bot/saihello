import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function ImageLightbox({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDistRef = useRef(null);
  const lastTouchRef = useRef(null);
  const isDraggingRef = useRef(false);

  if (!src) return null;

  function getDistance(t1, t2) {
    return Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      lastDistRef.current = getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && scale > 1) {
      isDraggingRef.current = true;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastDistRef.current) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const delta = dist / lastDistRef.current;
      setScale(s => Math.min(5, Math.max(1, s * delta)));
      lastDistRef.current = dist;
    } else if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      setTranslate(t => ({ x: t.x + dx, y: t.y + dy }));
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchEnd() {
    lastDistRef.current = null;
    isDraggingRef.current = false;
    lastTouchRef.current = null;
    if (scale <= 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center"
      onClick={() => { if (scale <= 1) onClose(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center z-10"
      >
        <X size={22} className="text-white" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        draggable={false}
      />
      {scale > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 px-3 py-1 rounded-full">
          <span className="text-white text-xs">{Math.round(scale * 100)}%</span>
        </div>
      )}
    </div>
  );
}
