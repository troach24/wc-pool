import { useEffect } from 'react';
import { inkOn, type TeamKit } from '../lib/teamKits';

type Props = { onDone: () => void; kit: TeamKit };

// Full-screen celebration: a spinning soccer ball arcs into the net, the net
// ripples, and "GOAL!" pops. The sliding player wears the scoring team's kit.
// Plays once (~2.6s) then unmounts via onDone.
export function GoalAnimation({ onDone, kit }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const jerseyInk = inkOn(kit.jersey);
  const shortsInk = inkOn(kit.shorts);

  return (
    <div className="goal-overlay" aria-hidden="true">
      <style>{CSS}</style>
      <div className="goal-flash" />

      <div className="goal-net">
        <svg viewBox="0 0 200 150" width="100%" height="100%">
          {/* net mesh */}
          <g stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={20 + i * 16} y1="20" x2={20 + i * 16} y2="140" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1="20" y1={20 + i * 16} x2="180" y2={20 + i * 16} />
            ))}
          </g>
          {/* posts + crossbar */}
          <g stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none">
            <line x1="18" y1="18" x2="18" y2="142" />
            <line x1="182" y1="18" x2="182" y2="142" />
            <line x1="15" y1="18" x2="185" y2="18" />
          </g>
        </svg>
      </div>

      <div className="goal-ball">⚽</div>

      <div className="goal-player">
        {/* Front-facing knee slide, arms spread wide — USMNT kit */}
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* knee-slide dust */}
          <g fill="#fff" opacity="0.5">
            <ellipse cx="70" cy="190" rx="16" ry="5" />
            <ellipse cx="130" cy="190" rx="16" ry="5" />
            <ellipse cx="100" cy="194" rx="22" ry="5" />
          </g>

          {/* thighs (skin) splayed to knees at ground */}
          <g stroke="#f4c39c" strokeLinecap="round" fill="none">
            <line x1="88" y1="142" x2="68" y2="184" strokeWidth="23" />
            <line x1="112" y1="142" x2="132" y2="184" strokeWidth="23" />
          </g>
          {/* socks (white) with accent band, knee → boot */}
          <g strokeLinecap="round" fill="none">
            <line x1="68" y1="184" x2="56" y2="188" stroke="#f2f2f2" strokeWidth="15" />
            <line x1="132" y1="184" x2="144" y2="188" stroke="#f2f2f2" strokeWidth="15" />
            <line x1="74" y1="178" x2="70" y2="184" stroke={kit.accent} strokeWidth="15" />
            <line x1="126" y1="178" x2="130" y2="184" stroke={kit.accent} strokeWidth="15" />
          </g>
          {/* boots */}
          <g fill="#15151c">
            <ellipse cx="50" cy="190" rx="15" ry="7" transform="rotate(-18 50 190)" />
            <ellipse cx="150" cy="190" rx="15" ry="7" transform="rotate(18 150 190)" />
          </g>
          {/* shorts */}
          <path d="M74 120 Q100 132 126 120 L130 150 Q116 156 110 150 L100 142 L90 150 Q84 156 70 150 Z" fill={kit.shorts} />
          <text x="84" y="142" fontFamily="Oswald, sans-serif" fontSize="12" fontWeight="700" fill={shortsInk}>10</text>

          {/* ARMS spread wide (skin) */}
          <g stroke="#f4c39c" strokeLinecap="round" fill="none">
            <line x1="74" y1="80" x2="46" y2="88" strokeWidth="14" />
            <line x1="46" y1="88" x2="18" y2="94" strokeWidth="11" />
            <line x1="126" y1="80" x2="154" y2="88" strokeWidth="14" />
            <line x1="154" y1="88" x2="182" y2="94" strokeWidth="11" />
          </g>
          {/* hands */}
          <g fill="#f4c39c">
            <circle cx="16" cy="95" r="7.5" />
            <circle cx="184" cy="95" r="7.5" />
          </g>

          {/* torso / jersey */}
          <path d="M70 76 Q74 64 84 64 L116 64 Q126 64 130 76 L126 124 Q100 132 74 124 Z"
                fill={kit.jersey} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
          {/* sleeves + accent cuffs */}
          <g strokeLinecap="round" fill="none">
            <line x1="74" y1="80" x2="60" y2="84" stroke={kit.jersey} strokeWidth="18" />
            <line x1="126" y1="80" x2="140" y2="84" stroke={kit.jersey} strokeWidth="18" />
            <line x1="50" y1="86" x2="46" y2="88" stroke={kit.accent} strokeWidth="14" />
            <line x1="150" y1="86" x2="154" y2="88" stroke={kit.accent} strokeWidth="14" />
          </g>
          {/* collar V + chest code + crest dots */}
          <path d="M90 66 L100 76 L110 66" fill="none" stroke={kit.accent} strokeWidth="3" />
          <text x="100" y="102" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="13" fontWeight="700" fill={jerseyInk}>{kit.code}</text>
          <g fill={kit.accent}>
            <circle cx="92" cy="110" r="1.6" />
            <circle cx="100" cy="110" r="1.6" />
            <circle cx="108" cy="110" r="1.6" />
          </g>

          {/* neck + head */}
          <line x1="100" y1="76" x2="100" y2="62" stroke="#f4c39c" strokeWidth="13" strokeLinecap="round" />
          <ellipse cx="100" cy="44" rx="15" ry="16" fill="#f7cda6" />
          {/* open mouth (screaming) */}
          <ellipse cx="100" cy="52" rx="4" ry="5.5" fill="#3a1f1a" />
          {/* eyes */}
          <g fill="#2a1c12"><circle cx="94" cy="42" r="1.8" /><circle cx="106" cy="42" r="1.8" /></g>
          {/* hair */}
          <path d="M84 42 Q84 28 100 28 Q116 28 116 42 Q110 34 100 34 Q90 34 84 42 Z" fill="#241712" />
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
  animation: goalOut 0.5s ease-in 2.1s forwards;
}
.goal-flash {
  position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(240,165,0,0.30), transparent 62%);
  animation: goalFlash 2.6s ease-out forwards;
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
  animation: goalPop 0.6s cubic-bezier(0.2, 1.4, 0.5, 1) 1.05s forwards;
}
@keyframes ballFly {
  0%   { transform: translate(-46vw, 30vh) rotate(0deg) scale(1.5); }
  55%  { transform: translate(-12vw, -24vh) rotate(820deg) scale(1.05); }
  100% { transform: translate(0, -1vh) rotate(1480deg) scale(0.4); }
}
@keyframes netRipple {
  0% { transform: scale(1); }
  45% { transform: scale(1.06) translateY(2px); }
  100% { transform: scale(1); }
}
@keyframes goalPop {
  0%   { opacity: 0; transform: scale(0.3) translateY(12px); }
  60%  { opacity: 1; transform: scale(1.18); }
  78%  { transform: scale(0.94); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes goalFlash {
  0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; }
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
