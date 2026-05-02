import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import CONFIG from '../config';

export default function ShareButton({ event, referralCode, className }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const ref = referralCode ? `?ref=${referralCode}` : '';
    const url = `${window.location.origin}${window.location.pathname}${ref}`;
    const text = `Ich bin beim ${event.name} dabei! Komm auch — ${CONFIG.appName} macht es möglich.`;

    if (navigator.share) {
      try { await navigator.share({ title: CONFIG.appName, text, url }); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {}
    }
  }

  return (
    <button onClick={handleShare} className={className}>
      {copied
        ? <><Check size={18} /><span>Link kopiert!</span></>
        : <><Share2 size={18} /><span>Freunde einladen</span></>
      }
    </button>
  );
}
