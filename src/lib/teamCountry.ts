// Resolve a pick's flag emoji to a canonical country key, and normalize
// API-Football team names to the same keys — so a pick like "🇪🇬Salah" is
// matched to *Egypt's* Salah, not a same-surname player from another nation.

import { normalize } from './nameMap';

// Alpha-2 (ISO) → canonical country key (lowercased, alias-collapsed).
const ALPHA2: Record<string, string> = {
  AR: 'argentina', AU: 'australia', AT: 'austria', BE: 'belgium', BA: 'bosnia',
  BR: 'brazil', CM: 'cameroon', CA: 'canada', CL: 'chile', CO: 'colombia',
  CR: 'costa rica', HR: 'croatia', CZ: 'czechia', DK: 'denmark', CD: 'dr congo',
  EC: 'ecuador', EG: 'egypt', SV: 'el salvador', FR: 'france', DE: 'germany',
  GH: 'ghana', GR: 'greece', HT: 'haiti', HN: 'honduras', IS: 'iceland',
  IR: 'iran', IQ: 'iraq', IT: 'italy', CI: 'ivory coast', JM: 'jamaica',
  JP: 'japan', JO: 'jordan', KR: 'south korea', MX: 'mexico', MA: 'morocco',
  NL: 'netherlands', NZ: 'new zealand', NG: 'nigeria', NO: 'norway',
  PA: 'panama', PY: 'paraguay', PE: 'peru', PL: 'poland', PT: 'portugal',
  QA: 'qatar', SA: 'saudi arabia', SN: 'senegal', RS: 'serbia', SK: 'slovakia',
  SI: 'slovenia', ZA: 'south africa', ES: 'spain', SE: 'sweden',
  CH: 'switzerland', TN: 'tunisia', TR: 'turkey', UA: 'ukraine', UY: 'uruguay',
  US: 'usa', UZ: 'uzbekistan', VE: 'venezuela', WS: 'samoa', DZ: 'algeria',
};

// Aliases that map varied API team names onto the canonical keys above.
const TEAM_ALIASES: Record<string, string> = {
  'united states': 'usa',
  usa: 'usa',
  turkiye: 'turkey',
  turkey: 'turkey',
  'cote divoire': 'ivory coast',
  "cote d ivoire": 'ivory coast',
  'ivory coast': 'ivory coast',
  'korea republic': 'south korea',
  'south korea': 'south korea',
  'korea dpr': 'north korea',
  'ir iran': 'iran',
  iran: 'iran',
  czechia: 'czechia',
  'czech republic': 'czechia',
  'dr congo': 'dr congo',
  'congo dr': 'dr congo',
  'bosnia and herzegovina': 'bosnia',
  'bosnia herzegovina': 'bosnia',
};

// Decode the country a pick belongs to from the flag at the start of its label.
export function countryOfFlag(label: string): string | null {
  // Subdivision tag flags (England / Scotland / Wales)
  if (label.includes('\u{1F3F4}')) {
    const tags = [...label]
      .map((c) => c.codePointAt(0)!)
      .filter((cp) => cp >= 0xe0000 && cp <= 0xe007f)
      .map((cp) => String.fromCodePoint(cp - 0xe0000))
      .join('');
    if (tags.includes('gbeng')) return 'england';
    if (tags.includes('gbsct')) return 'scotland';
    if (tags.includes('gbwls')) return 'wales';
    return null;
  }
  // Regional-indicator flags → ISO alpha-2
  const ri = [...label]
    .map((c) => c.codePointAt(0)!)
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  if (ri.length >= 2) {
    const a2 =
      String.fromCharCode(65 + (ri[0] - 0x1f1e6)) +
      String.fromCharCode(65 + (ri[1] - 0x1f1e6));
    return ALPHA2[a2] ?? null;
  }
  return null;
}

// Canonical key for an API team name (handles accents + alias variants).
export function teamKey(name: string): string {
  const n = normalize(name); // lowercased, accent-stripped, collapsed spaces
  return TEAM_ALIASES[n] ?? n;
}
