import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { hasSeenHint, markHintSeen } from '../../utils/hints';

export default function HintBubble({ id, text, position = 'bottom', delay = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSeenHint(id)) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [id, delay]);

  function dismiss() {
    markHintSeen(id);
    setVisible(false);
  }

  if (!visible) return null;

  const arrowStyle = {
    top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%',   left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    left:   { right: '100%', top: '50%',  transform: 'translateY(-50%)', marginRight: 6 },
    right:  { left: '100%',  top: '50%',  transform: 'translateY(-50%)', marginLeft: 6 },
  }[position] || {};

  const caretMap = { top: '▼', bottom: '▲', left: '▶', right: '◀' };
  const caretPositions = {
    top:    { bottom: -10, left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: -10,    left: '50%', transform: 'translateX(-50%)' },
    left:   { right: -8,   top: '50%',  transform: 'translateY(-50%)' },
    right:  { left: -8,    top: '50%',  transform: 'translateY(-50%)' },
  }[position] || {};

  return (
    <div style={{ position: 'absolute', zIndex: 99000, ...arrowStyle, width: 220, pointerEvents: 'auto' }}>
      <div style={{
        background: 'rgba(18,10,35,0.97)',
        border: '1.5px solid rgba(124,58,237,0.6)',
        borderRadius: 14,
        padding: '10px 12px 10px 14px',
        boxShadow: '0 4px 24px rgba(124,58,237,0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.4, flex: 1, margin: 0 }}>{text}</p>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}>
          <X size={14} color="rgba(255,255,255,0.4)" />
        </button>
      </div>
      <span style={{ position: 'absolute', color: 'rgba(124,58,237,0.7)', fontSize: 10, lineHeight: 1, ...caretPositions }}>
        {caretMap[position]}
      </span>
    </div>
  );
}
