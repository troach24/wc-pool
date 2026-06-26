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

      <div className="goal-flames">
        <div className="flame flame-1" />
        <div className="flame flame-2" />
        <div className="flame flame-3" />
        <div className="flame flame-4" />
        <div className="flame flame-5" />
        <div className="flame flame-6" />
        <div className="flame flame-7" />
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
.goal-flames {
  position: absolute;
  bottom: calc(50% + 6vmin);
  left: 50%;
  transform: translateX(-50%);
  width: 44vmin;
  height: 24vmin;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.6vmin;
  opacity: 0;
  transform-origin: bottom center;
  animation: flamesIn 0.5s cubic-bezier(0.2,1.2,0.4,1) 1.6s forwards;
}
.flame {
  border-radius: 50% 50% 28% 28% / 80% 80% 20% 20%;
  transform-origin: bottom center;
  flex-shrink: 0;
}
.flame-1 { width: 4vmin;  height: 10vmin; background: linear-gradient(to top, #e62000, #ff5500, #ffb300, #fff5aa); animation: flicker 0.38s ease-in-out 1.6s infinite alternate; }
.flame-2 { width: 5.5vmin; height: 15vmin; background: linear-gradient(to top, #e62000, #ff4500, #ffa200, #fff5aa); animation: flicker 0.31s ease-in-out 1.65s infinite alternate-reverse; }
.flame-3 { width: 7vmin;  height: 20vmin; background: linear-gradient(to top, #cc1a00, #ff3800, #ff9000, #ffe97a); animation: flickerBig 0.42s ease-in-out 1.58s infinite alternate; }
.flame-4 { width: 8vmin;  height: 24vmin; background: linear-gradient(to top, #bb1500, #ff2e00, #ff8000, #ffe060); animation: flickerBig 0.36s ease-in-out 1.62s infinite alternate-reverse; }
.flame-5 { width: 8vmin;  height: 24vmin; background: linear-gradient(to top, #bb1500, #ff2e00, #ff8000, #ffe060); animation: flickerBig 0.44s ease-in-out 1.55s infinite alternate; }
.flame-6 { width: 5.5vmin; height: 15vmin; background: linear-gradient(to top, #e62000, #ff4500, #ffa200, #fff5aa); animation: flicker 0.33s ease-in-out 1.68s infinite alternate; }
.flame-7 { width: 4vmin;  height: 10vmin; background: linear-gradient(to top, #e62000, #ff5500, #ffb300, #fff5aa); animation: flicker 0.40s ease-in-out 1.63s infinite alternate-reverse; }
@keyframes flamesIn {
  from { opacity: 0; transform: translateX(-50%) scaleY(0.2); }
  to   { opacity: 1; transform: translateX(-50%) scaleY(1); }
}
@keyframes flicker {
  from { transform: scaleX(1)    scaleY(1)    rotate(-4deg); opacity: 0.95; }
  to   { transform: scaleX(0.82) scaleY(0.88) rotate(4deg);  opacity: 0.80; }
}
@keyframes flickerBig {
  from { transform: scaleX(1)    scaleY(1)    rotate(-2deg); opacity: 1; }
  to   { transform: scaleX(0.88) scaleY(0.93) rotate(2deg);  opacity: 0.85; }
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
