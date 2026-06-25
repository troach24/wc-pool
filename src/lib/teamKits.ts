export type TeamKit = {
  jersey: string; // shirt fill
  shorts: string;
  accent: string; // trim / socks band
  code: string; // 3-letter code shown on the shirt
};

// Home-kit palettes for World Cup nations, keyed by lowercased team name.
const KITS: Record<string, TeamKit> = {
  usa: { jersey: '#f4f4f4', shorts: '#1b264f', accent: '#c8102e', code: 'USA' },
  'united states': { jersey: '#f4f4f4', shorts: '#1b264f', accent: '#c8102e', code: 'USA' },
  mexico: { jersey: '#006847', shorts: '#f4f4f4', accent: '#c8102e', code: 'MEX' },
  brazil: { jersey: '#ffdf00', shorts: '#002776', accent: '#009739', code: 'BRA' },
  argentina: { jersey: '#75aadb', shorts: '#1b1b1b', accent: '#f4f4f4', code: 'ARG' },
  france: { jersey: '#1b3a8f', shorts: '#f4f4f4', accent: '#c8102e', code: 'FRA' },
  england: { jersey: '#f4f4f4', shorts: '#1b264f', accent: '#c8102e', code: 'ENG' },
  spain: { jersey: '#c60b1e', shorts: '#1b264f', accent: '#ffc400', code: 'ESP' },
  germany: { jersey: '#f4f4f4', shorts: '#1b1b1b', accent: '#1b1b1b', code: 'GER' },
  norway: { jersey: '#ba0c2f', shorts: '#f4f4f4', accent: '#00205b', code: 'NOR' },
  morocco: { jersey: '#c1272d', shorts: '#006233', accent: '#f4f4f4', code: 'MAR' },
  haiti: { jersey: '#00209f', shorts: '#d21034', accent: '#f4f4f4', code: 'HAI' },
  scotland: { jersey: '#0065bf', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'SCO' },
  czechia: { jersey: '#d7141a', shorts: '#11457e', accent: '#f4f4f4', code: 'CZE' },
  'czech republic': { jersey: '#d7141a', shorts: '#11457e', accent: '#f4f4f4', code: 'CZE' },
  'south korea': { jersey: '#c8102e', shorts: '#1b1b1b', accent: '#f4f4f4', code: 'KOR' },
  'korea republic': { jersey: '#c8102e', shorts: '#1b1b1b', accent: '#f4f4f4', code: 'KOR' },
  'south africa': { jersey: '#007a4d', shorts: '#f4f4f4', accent: '#ffb81c', code: 'RSA' },
  japan: { jersey: '#0b1f4d', shorts: '#f4f4f4', accent: '#c8102e', code: 'JPN' },
  switzerland: { jersey: '#d52b1e', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'SUI' },
  uruguay: { jersey: '#5cbfeb', shorts: '#1b1b1b', accent: '#f4f4f4', code: 'URU' },
  ecuador: { jersey: '#ffd100', shorts: '#002b7f', accent: '#c8102e', code: 'ECU' },
  sweden: { jersey: '#006aa7', shorts: '#fecc02', accent: '#fecc02', code: 'SWE' },
  senegal: { jersey: '#f4f4f4', shorts: '#00853f', accent: '#e31b23', code: 'SEN' },
  canada: { jersey: '#c8102e', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'CAN' },
  'ivory coast': { jersey: '#ff8200', shorts: '#f4f4f4', accent: '#009e60', code: 'CIV' },
  portugal: { jersey: '#a50021', shorts: '#006600', accent: '#ffd700', code: 'POR' },
  italy: { jersey: '#1b3d8f', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'ITA' },
  netherlands: { jersey: '#ff6900', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'NED' },
  belgium: { jersey: '#c8102e', shorts: '#1b1b1b', accent: '#ffd700', code: 'BEL' },
  croatia: { jersey: '#ff0000', shorts: '#f4f4f4', accent: '#1b1b1b', code: 'CRO' },
  'dr congo': { jersey: '#009dde', shorts: '#f4f4f4', accent: '#f7d618', code: 'COD' },
  colombia: { jersey: '#fcd116', shorts: '#003087', accent: '#ce1126', code: 'COL' },
  uzbekistan: { jersey: '#f4f4f4', shorts: '#0099b5', accent: '#1eb53a', code: 'UZB' },
  iraq: { jersey: '#f4f4f4', shorts: '#1b1b1b', accent: '#007a3d', code: 'IRQ' },
  algeria: { jersey: '#f4f4f4', shorts: '#f4f4f4', accent: '#007229', code: 'ALG' },
  jordan: { jersey: '#f4f4f4', shorts: '#1b1b1b', accent: '#c8102e', code: 'JOR' },
  ghana: { jersey: '#f4f4f4', shorts: '#1b1b1b', accent: '#ce1126', code: 'GHA' },
  panama: { jersey: '#db0a16', shorts: '#1b264f', accent: '#f4f4f4', code: 'PAN' },
  austria: { jersey: '#c8102e', shorts: '#f4f4f4', accent: '#f4f4f4', code: 'AUT' },
};

const DEFAULT_KIT: TeamKit = { jersey: '#f4f4f4', shorts: '#1b264f', accent: '#c8102e', code: '' };

function deriveCode(name: string): string {
  return (name.replace(/[^a-z]/gi, '').slice(0, 3) || 'GOL').toUpperCase();
}

export function teamKit(name: string): TeamKit {
  const k = KITS[name.trim().toLowerCase()];
  if (k) return k;
  return { ...DEFAULT_KIT, code: deriveCode(name) };
}

// Pick a readable ink color (near-black or near-white) for text on a fill.
export function inkOn(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? '#12141b' : '#f7f7f7';
}
