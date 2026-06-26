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
    ];

    const pieces = Array.from({ length: 160 }, (_, i) => {
      // Two bursts: center and spread
      const fromCenter = i < 80;
      const angle = fromCenter
        ? (Math.random() * Math.PI * 2)
        : (Math.random() * Math.PI * 2);
      const speed = fromCenter
        ? Math.random() * 18 + 8
        : Math.random() * 10 + 3;
      const startX = fromCenter
        ? canvas.width / 2 + (Math.random() - 0.5) * 80
        : Math.random() * canvas.width;
      const startY = fromCenter
        ? canvas.height * 0.35
        : -20;
      return {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed * (fromCenter ? 1 : 0.4) + (Math.random() - 0.5) * 2,
        vy: fromCenter ? Math.sin(angle) * speed - 4 : Math.random() * 5 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        w: Math.random() * 14 + 5,
        h: Math.random() * 7 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      };
    });

    let frame: number;
    let elapsed = 0;
    let last = performance.now();

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.995;
        p.rotation += p.rotationSpeed;

        if (elapsed > 3.5) p.opacity = Math.max(0, p.opacity - dt * 0.8);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
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
            {/* Jersey gradient */}
            <linearGradient id="jg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={kit.jersey} stopOpacity="1"/>
              <stop offset="100%" stopColor={kit.jersey} stopOpacity="0.8"/>
            </linearGradient>
            {/* Pit Viper mirrored lens gradient */}
            <linearGradient id="pvg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor={kit.accent}/>
              <stop offset="40%"  stopColor={kit.jersey}/>
              <stop offset="70%"  stopColor={kit.accent}/>
              <stop offset="100%" stopColor={kit.jersey}/>
            </linearGradient>
          </defs>

          {/* ── LEGS hanging below crossbar ── */}
          {/* Left leg — swings one way */}
          <g style={{ transformOrigin: '148px 172px', animation: 'legSwing 1.5s ease-in-out 2.05s infinite alternate' }}>
            {/* thigh */}
            <path d="M140 172 Q138 192 136 208" stroke={kit.shorts} strokeWidth="16" strokeLinecap="round" fill="none"/>
            {/* shin */}
            <path d="M136 208 Q134 220 130 226" stroke="#f4c39a" strokeWidth="12" strokeLinecap="round" fill="none"/>
            {/* boot */}
            <ellipse cx="124" cy="229" rx="13" ry="7" fill="#1a1a2e" transform="rotate(-15 124 229)"/>
            <rect x="114" y="223" width="18" height="10" rx="4" fill="#111" transform="rotate(-15 123 228)"/>
          </g>
          {/* Right leg */}
          <g style={{ transformOrigin: '172px 172px', animation: 'legSwing 1.5s ease-in-out 2.05s infinite alternate-reverse' }}>
            <path d="M180 172 Q182 192 184 208" stroke={kit.shorts} strokeWidth="16" strokeLinecap="round" fill="none"/>
            <path d="M184 208 Q186 220 190 226" stroke="#f4c39a" strokeWidth="12" strokeLinecap="round" fill="none"/>
            <ellipse cx="196" cy="229" rx="13" ry="7" fill="#1a1a2e" transform="rotate(15 196 229)"/>
            <rect x="188" y="223" width="18" height="10" rx="4" fill="#111" transform="rotate(15 197 228)"/>
          </g>

          {/* ── BODY ── */}
          {/* Torso */}
          <path d="M128 105 Q130 88 160 86 Q190 88 192 105 L188 165 Q160 172 132 165 Z"
                fill="url(#jg)" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5"/>
          {/* Jersey collar V-neck */}
          <path d="M148 88 L160 100 L172 88" fill="none" stroke={kit.accent} strokeWidth="3" strokeLinecap="round"/>
          {/* Jersey number */}
          <text x="160" y="140" textAnchor="middle" fontFamily="Oswald,sans-serif" fontSize="22" fontWeight="900" fill={inkOn(kit.jersey)} opacity="0.85">10</text>
          {/* Sleeve accent stripes */}
          <path d="M128 108 Q120 112 118 118" stroke={kit.accent} strokeWidth="8" strokeLinecap="round" fill="none"/>
          <path d="M192 108 Q200 112 202 118" stroke={kit.accent} strokeWidth="8" strokeLinecap="round" fill="none"/>

          {/* ── LEFT ARM — gripping crossbar ── */}
          {/* upper arm */}
          <path d="M132 110 Q118 122 112 132" stroke={kit.jersey} strokeWidth="18" strokeLinecap="round" fill="none"/>
          {/* forearm */}
          <path d="M112 132 Q104 140 100 148" stroke="#f4c39a" strokeWidth="14" strokeLinecap="round" fill="none"/>
          {/* glove */}
          <circle cx="98" cy="152" r="11" fill="#f0f0f0"/>
          <path d="M89 148 Q90 142 96 140" stroke="#ddd" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M87 153 Q86 147 92 145" stroke="#ddd" strokeWidth="3" strokeLinecap="round" fill="none"/>

          {/* ── RIGHT ARM + FLAMETHROWER (animated sweep) ── */}
          <g className="ft-arm" style={{ transformOrigin: '188px 112px' }}>
            {/* upper arm */}
            <path d="M188 112 Q204 116 216 122" stroke={kit.jersey} strokeWidth="18" strokeLinecap="round" fill="none"/>
            {/* forearm */}
            <path d="M216 122 Q228 126 238 128" stroke="#f4c39a" strokeWidth="14" strokeLinecap="round" fill="none"/>
            {/* glove gripping gun */}
            <circle cx="244" cy="130" r="10" fill="#f0f0f0"/>

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

          {/* ── HEAD ── */}
          {/* Neck */}
          <rect x="153" y="72" width="14" height="18" rx="6" fill="#f4c39a"/>
          {/* Head shape — slightly wide */}
          <ellipse cx="160" cy="52" rx="32" ry="30" fill="#f7cda6"/>
          {/* Hair — messy spikes */}
          <path d="M128 46 Q130 20 148 16 Q152 28 156 30 Q158 14 160 12 Q162 14 164 30 Q168 28 172 16 Q190 20 192 46 Q180 36 160 36 Q140 36 128 46Z" fill="#241712"/>
          {/* Eyebrows — raised/excited */}
          <path d="M140 38 Q148 34 154 37" stroke="#241712" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M166 37 Q172 34 180 38" stroke="#241712" strokeWidth="3" strokeLinecap="round" fill="none"/>
          {/* ── PIT VIPERS ── huge wraparound mirrored shades */}
          {/* Left lens */}
          <path d="M116 36 L155 34 L156 54 Q135 60 116 52 Z" fill="url(#pvg)" opacity="0.93"/>
          {/* Right lens */}
          <path d="M165 34 L204 36 L204 52 Q185 60 164 54 Z" fill="url(#pvg)" opacity="0.93"/>
          {/* Frame outlines */}
          <path d="M116 36 L155 34 L156 54 Q135 60 116 52 Z" fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
          <path d="M165 34 L204 36 L204 52 Q185 60 164 54 Z" fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
          {/* Bridge */}
          <path d="M155 37 Q160 35 165 37" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/>
          {/* Temple arms wrapping to ears */}
          <path d="M116 44 Q112 46 128 51" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
          <path d="M204 44 Q208 46 192 51" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
          {/* Mirror sheens — two highlights per lens */}
          <path d="M120 39 Q133 36 150 37" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M120 45 Q128 43 138 44" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M170 37 Q187 36 200 39" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M182 44 Q192 43 200 45" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          {/* Nose */}
          <path d="M157 54 Q160 58 163 54" stroke="#e0a07a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Big open grin with teeth */}
          <path d="M142 62 Q160 76 178 62" fill="#cc3300" stroke="#241712" strokeWidth="1.5"/>
          <path d="M142 62 Q160 66 178 62" fill="#fff"/>
          {/* Dimples */}
          <circle cx="138" cy="60" r="4" fill="#f0a080" opacity="0.45"/>
          <circle cx="182" cy="60" r="4" fill="#f0a080" opacity="0.45"/>
          {/* Ear left */}
          <ellipse cx="128" cy="50" rx="6" ry="8" fill="#f4c39a"/>
          <ellipse cx="129" cy="50" rx="3" ry="5" fill="#e0a07a"/>
          {/* Ear right */}
          <ellipse cx="192" cy="50" rx="6" ry="8" fill="#f4c39a"/>
          <ellipse cx="191" cy="50" rx="3" ry="5" fill="#e0a07a"/>
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
