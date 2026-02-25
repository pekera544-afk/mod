import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function MarqueeBanner() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    axios.get('/api/marquee').then(r => setCfg(r.data)).catch(() => {});
    const t = setInterval(() => {
      axios.get('/api/marquee').then(r => setCfg(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  if (!cfg || !cfg.marqueeEnabled || !cfg.marqueeText?.trim()) return null;

  const speed = cfg.marqueeSpeed || 50;
  const fontSize = cfg.marqueeFontSize || 14;
  const color = cfg.marqueeColor || '#d4af37';
  const text = cfg.marqueeText;
  const duration = Math.max(5, (text.length * 0.3) * (100 / speed));

  return (
    <div className="w-full overflow-hidden flex-shrink-0"
      style={{
        background: 'rgba(0,0,0,0.85)',
        borderBottom: `1px solid ${color}44`,
        height: fontSize + 20,
        position: 'relative',
        zIndex: 55,
      }}>
      <div
        style={{
          display: 'inline-flex',
          whiteSpace: 'nowrap',
          animation: `marquee-scroll ${duration}s linear infinite`,
          paddingTop: 10,
          fontSize,
          color,
          fontWeight: 500,
          letterSpacing: '0.03em',
        }}>
        <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}