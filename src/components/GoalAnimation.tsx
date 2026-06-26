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

      {/* Mascot sitting on the crossbar, sweeping a flamethrower */}
      <div className="goal-mascot">
        <svg viewBox="0 0 320 180" width="100%" height="100%" overflow="visible">
          <defs>
            <filter id="ff" x="-100%" y="-100%" width="300%" height="300%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035 0.07" numOctaves="3" result="noise">
                <animate attributeName="seed" values="1;3;6;9;2;1" dur="0.25s" repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>

          {/* Legs dangling off crossbar */}
          <g style={{ transformOrigin: '160px 130px', animation: 'legSwing 1.4s ease-in-out infinite alternate' }}>
            <rect x="143" y="128" width="14" height="30" rx="6" fill={kit.shorts}/>
            <rect x="143" y="150" width="14" height="12" rx="4" fill="#1a1a2e"/>
          </g>
          <g style={{ transformOrigin: '160px 130px', animation: 'legSwing 1.4s ease-in-out infinite alternate-reverse' }}>
            <rect x="163" y="128" width="14" height="30" rx="6" fill={kit.shorts}/>
            <rect x="163" y="150" width="14" height="12" rx="4" fill="#1a1a2e"/>
          </g>

          {/* Body / jersey */}
          <rect x="136" y="88" width="48" height="44" rx="12" fill={kit.jersey} stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
          {/* Kit code on chest */}
          <text x="160" y="115" textAnchor="middle" fontFamily="Oswald,sans-serif" fontSize="11" fontWeight="700" fill={inkOn(kit.jersey)}>{kit.code}</text>

          {/* Left arm (static, gripping bar) */}
          <rect x="108" y="116" width="30" height="11" rx="5" fill={kit.jersey} transform="rotate(10 123 121)"/>
          <circle cx="110" cy="124" r="8" fill="#f4c39a"/>

          {/* Flamethrower arm — rotates around shoulder (right side) */}
          <g className="ft-arm" style={{ transformOrigin: '184px 100px' }}>
            {/* Upper arm */}
            <rect x="182" y="95" width="28" height="11" rx="5" fill={kit.jersey}/>
            {/* Forearm */}
            <rect x="206" y="96" width="26" height="10" rx="4" fill="#f4c39a"/>
            {/* Flamethrower body */}
            <rect x="228" y="90" width="54" height="18" rx="5" fill="#2d2d2d"/>
            <rect x="236" y="86" width="16" height="8" rx="3" fill="#444" opacity="0.8"/>
            {/* Tank */}
            <ellipse cx="242" cy="99" rx="10" ry="9" fill="#555"/>
            {/* Nozzle */}
            <rect x="278" y="93" width="18" height="12" rx="3" fill="#666"/>
            {/* Flame stream */}
            <g filter="url(#ff)">
              <ellipse cx="324" cy="99" rx="30" ry="14" fill="#ff4400" opacity="0.95"/>
              <ellipse cx="346" cy="99" rx="22" ry="9"  fill="#ff7700" opacity="0.85"/>
              <ellipse cx="362" cy="99" rx="14" ry="6"  fill="#ffbb00" opacity="0.80"/>
              <ellipse cx="374" cy="99" rx="7"  ry="3"  fill="#fff176" opacity="0.70"/>
            </g>
          </g>

          {/* Head */}
          <circle cx="160" cy="68" r="24" fill="#f7cda6"/>
          {/* Hair */}
          <path d="M136 60 Q138 42 160 42 Q182 42 184 60 Q175 50 160 50 Q145 50 136 60Z" fill="#241712"/>
          {/* Eyes — wide excited */}
          <circle cx="151" cy="65" r="4" fill="#fff"/><circle cx="151" cy="65" r="2.5" fill="#2a1c12"/>
          <circle cx="169" cy="65" r="4" fill="#fff"/><circle cx="169" cy="65" r="2.5" fill="#2a1c12"/>
          {/* Big grin */}
          <path d="M148 76 Q160 86 172 76" stroke="#3a1a10" strokeWidth="2.5" fill="#ff7c5c" strokeLinecap="round"/>
          {/* Cheeks */}
          <circle cx="144" cy="74" r="5" fill="#ffaaaa" opacity="0.5"/>
          <circle cx="176" cy="74" r="5" fill="#ffaaaa" opacity="0.5"/>
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
  top: calc(50% - 28vmin);
  left: 50%;
  transform: translateX(-50%);
  width: 52vmin;
  height: 28vmin;
  opacity: 0;
  animation: mascotIn 0.55s cubic-bezier(0.2, 1.3, 0.4, 1) 1.5s forwards;
}
.ft-arm {
  animation: ftSweep 1.3s ease-in-out 2.05s infinite alternate;
}
@keyframes mascotIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.7); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes ftSweep {
  from { transform: rotate(-32deg); }
  to   { transform: rotate(32deg); }
}
@keyframes legSwing {
  from { transform: rotate(-12deg); }
  to   { transform: rotate(12deg); }
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
