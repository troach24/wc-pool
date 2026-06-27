import { useEffect, useRef } from 'react';
import { inkOn, type TeamKit } from '../lib/teamKits';

type Props = { onDone: () => void; kit: TeamKit };

const DURATION = 5000;

export function GoalAnimation({ onDone, kit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  // Confetti cannon
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      kit.jersey, kit.shorts, kit.accent,
      '#f0a500', '#ffffff', '#ff3b3b', '#3bdfff', '#b8ff3b',
      '#ff9500', '#ff45c8', '#aaff00', '#00ccff', '#BF0A30', '#002868',
    ];

    // Three waves: center explosion, left cannon, right cannon, plus rain from above
    const pieces = Array.from({ length: 380 }, (_, i) => {
      let startX: number, startY: number, vx: number, vy: number;

      if (i < 120) {
        // Center burst — erupts from middle of screen
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 22 + 10;
        startX = canvas.width / 2 + (Math.random() - 0.5) * 100;
        startY = canvas.height * 0.38;
        vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 3;
        vy = Math.sin(angle) * speed - 6;
      } else if (i < 200) {
        // Left cannon — fires up and right from left edge
        const angle = -(Math.random() * 0.7 + 0.1);
        const speed = Math.random() * 20 + 12;
        startX = canvas.width * (Math.random() * 0.15);
        startY = canvas.height * (0.3 + Math.random() * 0.4);
        vx = Math.cos(angle) * speed + Math.random() * 4;
        vy = Math.sin(angle) * speed - Math.random() * 8;
      } else if (i < 280) {
        // Right cannon — fires up and left from right edge
        const angle = -(Math.PI - Math.random() * 0.7 - 0.1);
        const speed = Math.random() * 20 + 12;
        startX = canvas.width * (0.85 + Math.random() * 0.15);
        startY = canvas.height * (0.3 + Math.random() * 0.4);
        vx = Math.cos(angle) * speed - Math.random() * 4;
        vy = Math.sin(angle) * speed - Math.random() * 8;
      } else {
        // Rain — falls from top across full width
        startX = Math.random() * canvas.width;
        startY = -20 - Math.random() * 60;
        vx = (Math.random() - 0.5) * 5;
        vy = Math.random() * 4 + 2;
      }

      return {
        x: startX,
        y: startY,
        vx,
        vy,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 18,
        w: Math.random() * 16 + 5,
        h: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        shape: (Math.random() > 0.35 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'ribbon') as 'rect' | 'circle' | 'ribbon',
      };
    });

    let frame: number;
    let elapsed = 0;
    let last = performance.now();

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.vx *= 0.993;
        p.rotation += p.rotationSpeed;

        if (elapsed > 3.5) p.opacity = Math.max(0, p.opacity - dt * 0.7);

        ctx!.save();
        ctx!.globalAlpha = p.opacity;
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx!.fill();
        } else if (p.shape === 'ribbon') {
          // Thin long ribbon strip
          ctx!.fillRect(-p.w, -p.h / 4, p.w * 2, p.h / 2);
        } else {
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx!.restore();
      }

      if (elapsed < DURATION / 1000) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kit]);

  const jerseyInk = inkOn(kit.jersey);
  const shortsInk = inkOn(kit.shorts);

  return (
    <div className="goal-overlay" aria-hidden="true">
      <style>{CSS}</style>
      <canvas ref={canvasRef} className="goal-confetti" />
      <div className="goal-flash" />

      <div className="goal-net">
        <svg viewBox="0 0 200 150" width="100%" height="100%">
          <g stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={20 + i * 16} y1="20" x2={20 + i * 16} y2="140" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1="20" y1={20 + i * 16} x2="180" y2={20 + i * 16} />
            ))}
          </g>
          <g stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none">
            <line x1="18" y1="18" x2="18" y2="142" />
            <line x1="182" y1="18" x2="182" y2="142" />
            <line x1="15" y1="18" x2="185" y2="18" />
          </g>
        </svg>
      </div>

      <div className="goal-ball">⚽</div>

      <div className="goal-player">
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <g fill="#fff" opacity="0.5">
            <ellipse cx="70" cy="190" rx="16" ry="5" />
            <ellipse cx="130" cy="190" rx="16" ry="5" />
            <ellipse cx="100" cy="194" rx="22" ry="5" />
          </g>
          <g stroke="#f4c39c" strokeLinecap="round" fill="none">
            <line x1="88" y1="142" x2="68" y2="184" strokeWidth="23" />
            <line x1="112" y1="142" x2="132" y2="184" strokeWidth="23" />
          </g>
          <g strokeLinecap="round" fill="none">
            <line x1="68" y1="184" x2="56" y2="188" stroke="#f2f2f2" strokeWidth="15" />
            <line x1="132" y1="184" x2="144" y2="188" stroke="#f2f2f2" strokeWidth="15" />
            <line x1="74" y1="178" x2="70" y2="184" stroke={kit.accent} strokeWidth="15" />
            <line x1="126" y1="178" x2="130" y2="184" stroke={kit.accent} strokeWidth="15" />
          </g>
          <g fill="#15151c">
            <ellipse cx="50" cy="190" rx="15" ry="7" transform="rotate(-18 50 190)" />
            <ellipse cx="150" cy="190" rx="15" ry="7" transform="rotate(18 150 190)" />
          </g>
          <path d="M74 120 Q100 132 126 120 L130 150 Q116 156 110 150 L100 142 L90 150 Q84 156 70 150 Z" fill={kit.shorts} />
          <text x="84" y="142" fontFamily="Oswald, sans-serif" fontSize="12" fontWeight="700" fill={shortsInk}>10</text>
          <g stroke="#f4c39c" strokeLinecap="round" fill="none">
            <line x1="74" y1="80" x2="46" y2="88" strokeWidth="14" />
            <line x1="46" y1="88" x2="18" y2="94" strokeWidth="11" />
            <line x1="126" y1="80" x2="154" y2="88" strokeWidth="14" />
            <line x1="154" y1="88" x2="182" y2="94" strokeWidth="11" />
          </g>
          <g fill="#f4c39c">
            <circle cx="16" cy="95" r="7.5" />
            <circle cx="184" cy="95" r="7.5" />
          </g>
          <path d="M70 76 Q74 64 84 64 L116 64 Q126 64 130 76 L126 124 Q100 132 74 124 Z"
                fill={kit.jersey} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
          <g strokeLinecap="round" fill="none">
            <line x1="74" y1="80" x2="60" y2="84" stroke={kit.jersey} strokeWidth="18" />
            <line x1="126" y1="80" x2="140" y2="84" stroke={kit.jersey} strokeWidth="18" />
            <line x1="50" y1="86" x2="46" y2="88" stroke={kit.accent} strokeWidth="14" />
            <line x1="150" y1="86" x2="154" y2="88" stroke={kit.accent} strokeWidth="14" />
          </g>
          <path d="M90 66 L100 76 L110 66" fill="none" stroke={kit.accent} strokeWidth="3" />
          <text x="100" y="102" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="13" fontWeight="700" fill={jerseyInk}>{kit.code}</text>
          <g fill={kit.accent}>
            <circle cx="92" cy="110" r="1.6" />
            <circle cx="100" cy="110" r="1.6" />
            <circle cx="108" cy="110" r="1.6" />
          </g>
          <line x1="100" y1="76" x2="100" y2="62" stroke="#f4c39c" strokeWidth="13" strokeLinecap="round" />
          <ellipse cx="100" cy="44" rx="15" ry="16" fill="#f7cda6" />
          <ellipse cx="100" cy="52" rx="4" ry="5.5" fill="#3a1f1a" />
          <g fill="#2a1c12"><circle cx="94" cy="42" r="1.8" /><circle cx="106" cy="42" r="1.8" /></g>
          <path d="M84 42 Q84 28 100 28 Q116 28 116 42 Q110 34 100 34 Q90 34 84 42 Z" fill="#241712" />
        </svg>
      </div>

      {/* shockwave rings that burst outward when ball hits the net */}
      <div className="goal-burst goal-burst-1" />
      <div className="goal-burst goal-burst-2" />
      <div className="goal-burst goal-burst-3" />

      {/* Mascot perched above the crossbar, sweeping a flamethrower */}
      <div className="goal-mascot">
        <svg viewBox="0 0 340 210" width="100%" height="100%" overflow="visible">
          <defs>
            <filter id="ff" x="-150%" y="-150%" width="400%" height="400%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03 0.06" numOctaves="4" result="noise">
                <animate attributeName="seed" values="1;4;7;11;2;1" dur="0.22s" repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            {/* Hat stripe gradient */}
            <linearGradient id="hatSheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="rgba(0,0,0,0.12)"/>
              <stop offset="40%"  stopColor="rgba(255,255,255,0.08)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.10)"/>
            </linearGradient>
          </defs>

          {/* ── LEGS hanging below crossbar — red & white striped pants ── */}
          {/* Left leg — swings one way */}
          <g style={{ transformOrigin: '148px 172px', animation: 'legSwing 1.5s ease-in-out 2.05s infinite alternate' }}>
            {/* pants — white base */}
            <path d="M140 172 Q138 192 136 208" stroke="#f5f5ee" strokeWidth="16" strokeLinecap="round" fill="none"/>
            {/* red stripes over pants */}
            <path d="M140 172 Q139 179 138 186" stroke="#BF0A30" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M138 193 Q137 200 136 207" stroke="#BF0A30" strokeWidth="6" strokeLinecap="round" fill="none"/>
            {/* sock/shin */}
            <path d="M136 208 Q134 220 130 226" stroke="#f5f5ee" strokeWidth="12" strokeLinecap="round" fill="none"/>
            {/* boot — tall black */}
            <path d="M122 222 Q116 226 114 232 L138 232 L138 220 Z" fill="#111"/>
            <ellipse cx="126" cy="232" rx="12" ry="5" fill="#0d0d0d"/>
          </g>
          {/* Right leg */}
          <g style={{ transformOrigin: '172px 172px', animation: 'legSwing 1.5s ease-in-out 2.05s infinite alternate-reverse' }}>
            <path d="M180 172 Q182 192 184 208" stroke="#f5f5ee" strokeWidth="16" strokeLinecap="round" fill="none"/>
            <path d="M180 172 Q181 179 182 186" stroke="#BF0A30" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M182 193 Q183 200 184 207" stroke="#BF0A30" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M184 208 Q186 220 190 226" stroke="#f5f5ee" strokeWidth="12" strokeLinecap="round" fill="none"/>
            {/* boot */}
            <path d="M198 222 Q204 226 206 232 L182 232 L182 220 Z" fill="#111"/>
            <ellipse cx="194" cy="232" rx="12" ry="5" fill="#0d0d0d"/>
          </g>

          {/* ── BODY — Uncle Sam blue coat ── */}
          {/* Coat body */}
          <path d="M126 108 Q128 88 160 86 Q192 88 194 108 L190 165 Q160 172 130 165 Z"
                fill="#002868" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
          {/* Coat lapels */}
          <path d="M148 88 L152 110 L160 104 L168 110 L172 88" fill="#f5f5ee" stroke="rgba(0,0,0,0.15)" strokeWidth="1"/>
          {/* Red/white cravat bow tie */}
          <path d="M154 90 L160 97 L166 90 Q160 87 154 90Z" fill="#BF0A30"/>
          <path d="M154 90 L160 94 L166 90 Q160 92 154 90Z" fill="#f5f5ee" opacity="0.5"/>
          {/* Gold buttons down coat */}
          <circle cx="160" cy="115" r="4" fill="#d4a820" stroke="#a08010" strokeWidth="1"/>
          <circle cx="160" cy="130" r="4" fill="#d4a820" stroke="#a08010" strokeWidth="1"/>
          <circle cx="160" cy="145" r="4" fill="#d4a820" stroke="#a08010" strokeWidth="1"/>
          {/* Stars on chest */}
          <text x="138" y="118" fill="#d4a820" fontSize="10" fontFamily="serif" opacity="0.9">★</text>
          <text x="174" y="118" fill="#d4a820" fontSize="10" fontFamily="serif" opacity="0.9">★</text>
          {/* Coat sleeve accents — red stripe */}
          <path d="M126 110 Q118 115 116 122" stroke="#BF0A30" strokeWidth="8" strokeLinecap="round" fill="none"/>
          <path d="M194 110 Q202 115 204 122" stroke="#BF0A30" strokeWidth="8" strokeLinecap="round" fill="none"/>

          {/* ── LEFT ARM — gripping crossbar ── */}
          {/* coat sleeve */}
          <path d="M130 112 Q116 124 110 134" stroke="#002868" strokeWidth="18" strokeLinecap="round" fill="none"/>
          {/* red cuff stripe */}
          <path d="M110 134 Q106 138 104 142" stroke="#BF0A30" strokeWidth="18" strokeLinecap="round" fill="none"/>
          {/* forearm/hand */}
          <path d="M104 142 Q100 148 98 154" stroke="#e0b888" strokeWidth="14" strokeLinecap="round" fill="none"/>
          {/* hand gripping bar */}
          <ellipse cx="97" cy="158" rx="10" ry="8" fill="#d4a070"/>
          <path d="M88 154 Q90 148 96 147" stroke="#b88050" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M87 159 Q87 153 93 152" stroke="#b88050" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

          {/* ── RIGHT ARM + FLAMETHROWER (animated sweep) ── */}
          <g className="ft-arm" style={{ transformOrigin: '188px 112px' }}>
            {/* coat sleeve */}
            <path d="M190 112 Q206 116 218 122" stroke="#002868" strokeWidth="18" strokeLinecap="round" fill="none"/>
            {/* red cuff stripe */}
            <path d="M218 122 Q226 125 232 127" stroke="#BF0A30" strokeWidth="18" strokeLinecap="round" fill="none"/>
            {/* forearm/hand */}
            <path d="M232 127 Q238 128 244 130" stroke="#e0b888" strokeWidth="14" strokeLinecap="round" fill="none"/>
            {/* hand gripping gun */}
            <ellipse cx="248" cy="131" rx="10" ry="8" fill="#d4a070"/>

            {/* Flamethrower gun body */}
            <rect x="240" y="118" width="70" height="20" rx="6" fill="#1c1c1c"/>
            {/* Tank cylinder on top */}
            <rect x="248" y="106" width="34" height="14" rx="7" fill="#3a3a3a"/>
            <ellipse cx="248" cy="113" rx="7" ry="7" fill="#444"/>
            <ellipse cx="282" cy="113" rx="7" ry="7" fill="#444"/>
            {/* Fuel hose */}
            <path d="M256 120 Q258 126 260 128" stroke="#555" strokeWidth="4" fill="none"/>
            {/* Trigger guard */}
            <path d="M268 138 Q272 146 276 138" stroke="#333" strokeWidth="3" fill="none"/>
            {/* Grip */}
            <rect x="264" y="134" width="14" height="18" rx="4" fill="#222"/>
            {/* Barrel */}
            <rect x="306" y="121" width="36" height="14" rx="4" fill="#2a2a2a"/>
            {/* Nozzle cone */}
            <path d="M340 121 L356 125 L340 135 Z" fill="#333"/>
            {/* Nozzle tip glow */}
            <circle cx="358" cy="128" r="5" fill="#ff6600" opacity="0.8"/>

            {/* ── FLAME STREAM ── */}
            <g filter="url(#ff)">
              {/* Core — white hot */}
              <ellipse cx="388" cy="128" rx="22" ry="7"  fill="#fff8e0" opacity="0.95"/>
              {/* Inner — yellow */}
              <ellipse cx="400" cy="128" rx="30" ry="11" fill="#ffdd00" opacity="0.90"/>
              {/* Mid — orange */}
              <ellipse cx="420" cy="128" rx="38" ry="14" fill="#ff7700" opacity="0.85"/>
              {/* Outer — deep orange/red */}
              <ellipse cx="440" cy="128" rx="32" ry="16" fill="#ff3300" opacity="0.75"/>
              {/* Wisp tail */}
              <ellipse cx="464" cy="128" rx="20" ry="10" fill="#cc2200" opacity="0.50"/>
            </g>
          </g>

          {/* ── UNCLE SAM HEAD ── */}

          {/* ── TOP HAT ── */}
          {/* Cylinder — white base */}
          <rect x="133" y="-72" width="54" height="96" rx="3" fill="#f5f5ee"/>
          {/* Red stripes */}
          <rect x="133" y="-72" width="54" height="16" rx="2" fill="#BF0A30"/>
          <rect x="133" y="-40" width="54" height="16" fill="#BF0A30"/>
          <rect x="133" y="-8"  width="54" height="14" fill="#BF0A30"/>
          {/* Blue star band */}
          <rect x="133" y="12"  width="54" height="12" rx="1" fill="#002868"/>
          {/* Stars on band */}
          <text x="136" y="22" fill="white" fontSize="9" fontFamily="serif" letterSpacing="4">★★★★★</text>
          {/* Hat sheen overlay */}
          <rect x="133" y="-72" width="54" height="96" rx="3" fill="url(#hatSheen)" opacity="0.6"/>
          {/* Hat outline */}
          <rect x="133" y="-72" width="54" height="96" rx="3" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
          {/* Crown top */}
          <ellipse cx="160" cy="-72" rx="27" ry="5" fill="#eee" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
          {/* Brim */}
          <ellipse cx="160" cy="24" rx="40" ry="7" fill="#f0f0e8" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5"/>
          {/* Brim underside shadow */}
          <ellipse cx="160" cy="25" rx="38" ry="5" fill="rgba(0,0,0,0.08)"/>

          {/* White sideburns/hair under brim */}
          <path d="M133 26 Q130 34 132 48" stroke="#e8e8e0" strokeWidth="10" strokeLinecap="round" fill="none"/>
          <path d="M187 26 Q190 34 188 48" stroke="#e8e8e0" strokeWidth="10" strokeLinecap="round" fill="none"/>
          {/* Sideburn detail */}
          <path d="M133 28 Q131 36 133 46" stroke="rgba(200,200,190,0.6)" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M187 28 Q189 36 187 46" stroke="rgba(200,200,190,0.6)" strokeWidth="3" strokeLinecap="round" fill="none"/>

          {/* Neck — lean */}
          <path d="M153 68 L152 88 Q160 92 168 88 L167 68 Q163 72 157 72 Z" fill="#e0b888"/>

          {/* Head — long angular face */}
          <path d="M140 58 L139 32 Q141 18 160 16 Q179 18 181 32 L180 58 Q175 70 160 72 Q145 70 140 58Z" fill="#edd5a0"/>
          {/* Temple/jaw shadow */}
          <path d="M140 44 Q139 56 142 64" stroke="rgba(0,0,0,0.10)" strokeWidth="4" strokeLinecap="round" fill="none"/>
          <path d="M180 44 Q181 56 178 64" stroke="rgba(0,0,0,0.10)" strokeWidth="4" strokeLinecap="round" fill="none"/>

          {/* Ears */}
          <ellipse cx="139" cy="44" rx="5" ry="7" fill="#e0b888"/>
          <ellipse cx="140" cy="44" rx="2.5" ry="4.5" fill="#c09060"/>
          <ellipse cx="181" cy="44" rx="5" ry="7" fill="#e0b888"/>
          <ellipse cx="180" cy="44" rx="2.5" ry="4.5" fill="#c09060"/>

          {/* White bushy eyebrows */}
          <path d="M140 30 Q150 24 158 28" stroke="#e8e8e0" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
          <path d="M162 28 Q170 24 180 30" stroke="#e8e8e0" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
          {/* Eyebrow shadow edge */}
          <path d="M140 31 Q150 25 158 29" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M162 29 Q170 25 180 31" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

          {/* Eyes — stern, sharp */}
          <ellipse cx="150" cy="37" rx="6.5" ry="5" fill="white"/>
          <ellipse cx="170" cy="37" rx="6.5" ry="5" fill="white"/>
          <circle cx="151" cy="38" r="4" fill="#3a2810"/>
          <circle cx="171" cy="38" r="4" fill="#3a2810"/>
          <circle cx="152" cy="37" r="2" fill="#0d0806"/>
          <circle cx="172" cy="37" r="2" fill="#0d0806"/>
          <circle cx="153" cy="36" r="1" fill="white" opacity="0.9"/>
          <circle cx="173" cy="36" r="1" fill="white" opacity="0.9"/>
          {/* Eye shadow crease */}
          <path d="M143 33 Q150 31 157 33" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M163 33 Q170 31 177 33" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

          {/* Nose — long, angular */}
          <path d="M158 44 L156 56 Q160 59 164 56 L162 44" stroke="#c09060" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

          {/* White mustache */}
          <path d="M148 57 Q154 53 160 55 Q166 53 172 57 Q166 60 160 58 Q154 60 148 57Z" fill="#e8e8e0"/>
          {/* Mustache shadow */}
          <path d="M150 57 Q160 54 170 57" stroke="rgba(180,180,170,0.5)" strokeWidth="1.5" fill="none"/>

          {/* Stern thin mouth */}
          <path d="M152 62 Q160 65 168 62" fill="none" stroke="#90604a" strokeWidth="2" strokeLinecap="round"/>

          {/* Pointed white goatee */}
          <path d="M150 64 Q160 66 170 64 L167 76 Q163 88 160 93 Q157 88 153 76 Z" fill="#e8e8e0"/>
          {/* Goatee shading */}
          <path d="M158 66 Q160 78 160 91" stroke="rgba(180,180,170,0.5)" strokeWidth="2" fill="none"/>
          <path d="M154 66 Q152 74 154 80" stroke="rgba(180,180,170,0.4)" strokeWidth="1.5" fill="none"/>
          <path d="M166 66 Q168 74 166 80" stroke="rgba(180,180,170,0.4)" strokeWidth="1.5" fill="none"/>
        </svg>
      </div>

      <div className="goal-text">GOAL!</div>
    </div>
  );
}

const CSS = `
.goal-overlay {
  position: fixed; inset: 0; z-index: 60;
  pointer-events: none; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  animation: goalOut 0.7s ease-in 4.3s forwards;
}
.goal-confetti {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
.goal-flash {
  position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(240,165,0,0.35), transparent 62%);
  animation: goalFlash 5s ease-out forwards;
}
.goal-net {
  position: absolute;
  width: 42vmin; height: 31vmin;
  transform-origin: center;
  filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));
  animation: netRipple 0.45s ease-out 1.0s;
}
.goal-ball {
  position: absolute;
  font-size: 13vmin; line-height: 1;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.45));
  animation: ballFly 1.15s cubic-bezier(0.45, 0, 0.7, 1) forwards;
}
.goal-player {
  position: absolute;
  bottom: 8vh; left: 50%;
  width: 42vmin; height: 40vmin;
  margin-left: -21vmin;
  filter: drop-shadow(0 8px 14px rgba(0,0,0,0.45));
  animation: playerSlide 1.25s cubic-bezier(0.22, 0.7, 0.3, 1) 0.45s both;
}
.goal-text {
  position: absolute;
  font-family: 'Oswald', system-ui, sans-serif;
  font-weight: 700; font-size: 16vmin; letter-spacing: 0.04em;
  color: #f0a500;
  -webkit-text-stroke: 2px rgba(0,0,0,0.25);
  text-shadow: 0 6px 30px rgba(240,165,0,0.6);
  opacity: 0;
  animation: goalPop 0.6s cubic-bezier(0.2, 1.4, 0.5, 1) 1.05s forwards,
             goalPulse 0.6s ease-in-out 2s infinite alternate;
}
@keyframes ballFly {
  0%   { transform: translate(-46vw, 30vh) rotate(0deg)    scale(1.5);  opacity: 1; filter: blur(0); }
  55%  { transform: translate(-12vw, -24vh) rotate(820deg)  scale(1.05); opacity: 1; filter: blur(0); }
  82%  { transform: translate(0, -1vh)   rotate(1480deg) scale(0.4);  opacity: 1; filter: blur(0); }
  88%  { transform: translate(0, -1vh)   rotate(1510deg) scale(2.2);  opacity: 0.7; filter: blur(1px); }
  100% { transform: translate(0, -1vh)   rotate(1540deg) scale(5);    opacity: 0;   filter: blur(6px); }
}
.goal-burst {
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.85);
  width: 8vmin; height: 8vmin;
  opacity: 0;
}
.goal-burst-1 { animation: burstRing 0.5s cubic-bezier(0.1,0.6,0.4,1) 1.08s forwards; border-color: rgba(255,255,255,0.9); }
.goal-burst-2 { animation: burstRing 0.6s cubic-bezier(0.1,0.6,0.4,1) 1.14s forwards; border-color: rgba(240,165,0,0.8); width: 8vmin; height: 8vmin; }
.goal-burst-3 { animation: burstRing 0.7s cubic-bezier(0.1,0.6,0.4,1) 1.22s forwards; border-color: rgba(255,255,255,0.5); }
@keyframes burstRing {
  0%   { opacity: 1; transform: scale(0.3); }
  70%  { opacity: 0.6; }
  100% { opacity: 0; transform: scale(5); }
}
@keyframes netRipple {
  0% { transform: scale(1); }
  45% { transform: scale(1.06) translateY(2px); }
  100% { transform: scale(1); }
}
.goal-mascot {
  position: absolute;
  /* sit just above the crossbar: net top is ~50% - 15.5vmin, crossbar is ~12% down */
  bottom: calc(50% + 13vmin);
  left: 50%;
  transform: translateX(-50%);
  width: 64vmin;
  height: 34vmin;
  opacity: 0;
  filter: drop-shadow(0 6px 18px rgba(0,0,0,0.5));
  animation: mascotIn 0.6s cubic-bezier(0.2, 1.3, 0.4, 1) 1.5s forwards;
}
.ft-arm {
  animation: ftSweep 1.4s ease-in-out 2.1s infinite alternate;
}
@keyframes mascotIn {
  from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.65); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes ftSweep {
  from { transform: rotate(-36deg); }
  to   { transform: rotate(28deg); }
}
@keyframes legSwing {
  from { transform: rotate(-14deg); }
  to   { transform: rotate(14deg); }
}
@keyframes goalPop {
  0%   { opacity: 0; transform: scale(0.3) translateY(12px); }
  60%  { opacity: 1; transform: scale(1.18); }
  78%  { transform: scale(0.94); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes goalPulse {
  from { transform: scale(1); text-shadow: 0 6px 30px rgba(240,165,0,0.6); }
  to   { transform: scale(1.06); text-shadow: 0 6px 50px rgba(240,165,0,0.9); }
}
@keyframes goalFlash {
  0% { opacity: 0; } 12% { opacity: 1; } 70% { opacity: 0.3; } 100% { opacity: 0; }
}
@keyframes goalOut {
  to { opacity: 0; }
}
@keyframes playerSlide {
  0%   { transform: translate(-40vw, 16vh) scale(0.65) rotate(-3deg); opacity: 0; }
  20%  { opacity: 1; }
  70%  { transform: translate(2vw, -1vh) scale(1.04) rotate(2deg); }
  85%  { transform: translate(-1vw, 0.5vh) scale(0.99) rotate(-1deg); }
  100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .goal-ball, .goal-player { animation-duration: 0.01s; }
  .goal-flash, .goal-net { animation: none; }
}
`;
