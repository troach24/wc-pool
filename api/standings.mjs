// src/lib/api.ts
var BASE = "https://v3.football.api-sports.io";
var WC_LEAGUE_ID = 1;
var WC_SEASON = 2026;
var API_KEY = "";
function setApiKey(key) {
  API_KEY = key;
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path, attempt = 0) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": API_KEY } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    if (json.errors.rateLimit && attempt < 3) {
      await sleep(2500 * (attempt + 1));
      return get(path, attempt + 1);
    }
    throw new Error(`API error: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}
var LIVE_CODES = /* @__PURE__ */ new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"]);
var DONE_CODES = /* @__PURE__ */ new Set(["FT", "AET", "PEN"]);
function mapStatus(short) {
  if (LIVE_CODES.has(short)) return "inprogress";
  if (DONE_CODES.has(short)) return "finished";
  return "notstarted";
}
function shortStatusLabel(short, elapsed) {
  if (short === "HT") return "HT";
  if (short === "1H") return elapsed ? `${elapsed}'` : "1st";
  if (short === "2H") return elapsed ? `${elapsed}'` : "2nd";
  if (short === "ET") return elapsed ? `${elapsed}'` : "ET";
  if (DONE_CODES.has(short)) return "FT";
  return short;
}
function toWCEvent(f, groupByTeam) {
  return {
    id: f.fixture.id,
    homeTeam: { name: f.teams.home.name, id: f.teams.home.id },
    awayTeam: { name: f.teams.away.name, id: f.teams.away.id },
    homeScore: { current: f.goals.home ?? 0 },
    awayScore: { current: f.goals.away ?? 0 },
    status: {
      description: shortStatusLabel(f.fixture.status.short, f.fixture.status.elapsed),
      type: mapStatus(f.fixture.status.short)
    },
    tournament: { groupSign: groupByTeam.get(f.teams.home.id) },
    startTimestamp: f.fixture.timestamp
  };
}
async function fetchWCStandings() {
  const resp = await get(`/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`);
  const groups = resp[0]?.league.standings ?? [];
  return groups.flatMap(
    (g) => g.map((r) => ({
      team: { name: r.team.name, id: r.team.id },
      position: r.rank,
      wins: r.all.win,
      scoresFor: r.all.goals.for,
      scoresAgainst: r.all.goals.against,
      matches: r.all.played,
      group: r.group
    }))
  );
}
async function fetchWCFixtures(groupByTeam) {
  const resp = await get(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`);
  return resp.map((f) => toWCEvent(f, groupByTeam));
}
async function fetchFixturePlayers(fixtureId) {
  const resp = await get(`/fixtures/players?fixture=${fixtureId}`);
  const out = [];
  for (const team of resp) {
    for (const p of team.players) {
      const s = p.statistics[0];
      if (!s) continue;
      out.push({
        name: p.player.name,
        teamId: team.team.id,
        position: s.games?.position ?? null,
        minutes: s.games?.minutes ?? null,
        goals: s.goals?.total ?? 0,
        assists: s.goals?.assists ?? 0,
        yellow: s.cards?.yellow ?? 0,
        red: s.cards?.red ?? 0,
        saves: s.goals?.saves ?? 0
      });
    }
  }
  return out;
}
function groupLetterMap(standings) {
  const m = /* @__PURE__ */ new Map();
  for (const r of standings) {
    const letter = r.group?.replace(/^Group\s+/i, "").trim();
    if (letter) m.set(r.team.id, letter);
  }
  return m;
}

// src/lib/scoring.ts
var TEAM_POINTS = {
  goal: 1,
  shutout: 3,
  groupWin: 3,
  winGroup: 8,
  secondGroup: 4,
  thirdQualified: 2,
  r32Win: 5,
  r16Win: 5,
  qfWin: 5,
  sfWin: 5,
  thirdPlace: 7,
  runnerUp: 10,
  winner: 15
};
var PLAYER_POINTS = {
  goal: 5,
  assist: 3,
  yellowCard: 10,
  redCard: 15
};
var KEEPER_POINTS = {
  win: 3,
  shutout: 3,
  save: 1
};

// src/lib/nameMap.ts
var FLAG_REGEX = new RegExp("[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]\uFE0F?(\u200D[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]\uFE0F?)*|\\p{Regional_Indicator}{2}", "gu");
function stripFlag(label) {
  return label.replace(FLAG_REGEX, "").trim();
}
function normalize(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
var ALIASES = {
  "mbappe": "kylian mbappe",
  "raul jimenez": "raul jimenez",
  "jimenez": "raul jimenez",
  "simon": "unai simon",
  "s\xECmon": "unai simon",
  "martinez": "emiliano martinez",
  "alisson": "alisson",
  "ueda": "ayase ueda",
  "gyokeres": "viktor gyokeres",
  "guller": "arda guller",
  "guler": "arda guler",
  "nunez": "darwin nunez",
  "e valencia": "enner valencia",
  "caicedo": "moises caicedo"
};
function resolveAlias(raw) {
  const n = normalize(raw);
  return ALIASES[n] ?? n;
}
function matchesApiName(pickLabel, apiName) {
  const pickNorm = resolveAlias(stripFlag(pickLabel));
  const apiNorm = normalize(apiName);
  return apiNorm.includes(pickNorm) || pickNorm.includes(apiNorm) || pickNorm.split(" ").some((word) => word.length > 3 && apiNorm.includes(word));
}

// src/lib/pointCalc.ts
function accumulateLines(events) {
  const players = /* @__PURE__ */ new Map();
  const keepers = /* @__PURE__ */ new Map();
  const teams = /* @__PURE__ */ new Map();
  const playerStats = (name) => {
    if (!players.has(name)) players.set(name, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    return players.get(name);
  };
  const keeperStats = (name) => {
    if (!keepers.has(name)) keepers.set(name, { saves: 0, shutouts: 0, wins: 0 });
    return keepers.get(name);
  };
  const teamStats = (name) => {
    if (!teams.has(name)) teams.set(name, { goalsScored: 0, wins: 0, shutouts: 0 });
    return teams.get(name);
  };
  for (const { event, lines } of events) {
    const homeGoals = event.homeScore?.current ?? 0;
    const awayGoals = event.awayScore?.current ?? 0;
    const finished = event.status.type === "finished";
    teamStats(event.homeTeam.name).goalsScored += homeGoals;
    teamStats(event.awayTeam.name).goalsScored += awayGoals;
    if (finished) {
      if (homeGoals > awayGoals) teamStats(event.homeTeam.name).wins += 1;
      else if (awayGoals > homeGoals) teamStats(event.awayTeam.name).wins += 1;
      if (awayGoals === 0) teamStats(event.homeTeam.name).shutouts += 1;
      if (homeGoals === 0) teamStats(event.awayTeam.name).shutouts += 1;
    }
    for (const line of lines) {
      const ps = playerStats(line.name);
      ps.goals += line.goals;
      ps.assists += line.assists;
      ps.yellowCards += line.yellow;
      ps.redCards += line.red;
      if (line.position === "G" && (line.minutes ?? 0) > 0) {
        const ks = keeperStats(line.name);
        ks.saves += line.saves;
        if (finished) {
          const isHome = line.teamId === event.homeTeam.id;
          const ownGoals = isHome ? homeGoals : awayGoals;
          const oppGoals = isHome ? awayGoals : homeGoals;
          if (oppGoals === 0) ks.shutouts += 1;
          if (ownGoals > oppGoals) ks.wins += 1;
        }
      }
    }
  }
  return { players, keepers, teams };
}
function computePlayerPoints(stats) {
  return stats.goals * PLAYER_POINTS.goal + stats.assists * PLAYER_POINTS.assist + stats.yellowCards * PLAYER_POINTS.yellowCard + stats.redCards * PLAYER_POINTS.redCard;
}
function computeKeeperPoints(stats) {
  return stats.wins * KEEPER_POINTS.win + stats.shutouts * KEEPER_POINTS.shutout + stats.saves * KEEPER_POINTS.save;
}
function computeTeamPointsFromStats(stats) {
  return stats.goalsScored * TEAM_POINTS.goal + stats.wins * TEAM_POINTS.groupWin + stats.shutouts * TEAM_POINTS.shutout;
}
function applyGroupBonuses(teamPoints, standings) {
  const result = new Map(teamPoints);
  for (const row of standings) {
    const name = row.team.name;
    const existing = result.get(name) ?? 0;
    let bonus = 0;
    if (row.matches >= 3) {
      if (row.position === 1) bonus = TEAM_POINTS.winGroup;
      else if (row.position === 2) bonus = TEAM_POINTS.secondGroup;
      else if (row.position === 3) bonus = TEAM_POINTS.thirdQualified;
    }
    if (bonus > 0) result.set(name, existing + bonus);
  }
  return result;
}
function findMatchingApiName(pickLabel, apiNames) {
  const stripped = stripFlag(pickLabel);
  for (const apiName of apiNames) {
    if (matchesApiName(stripped, apiName)) return apiName;
  }
  return null;
}
function computeMatchImpacts(matchStats, matchTeamPoints, poolPickLabels) {
  const impacts = [];
  const seen = /* @__PURE__ */ new Set();
  for (const label of poolPickLabels) {
    if (seen.has(label)) continue;
    const keeperMatch = findMatchingApiName(label, matchStats.keepers.keys());
    if (keeperMatch) {
      const pts = computeKeeperPoints(matchStats.keepers.get(keeperMatch));
      if (pts > 0) {
        impacts.push({ label, points: pts });
        seen.add(label);
        continue;
      }
    }
    const playerMatch = findMatchingApiName(label, matchStats.players.keys());
    if (playerMatch) {
      const pts = computePlayerPoints(matchStats.players.get(playerMatch));
      if (pts > 0) {
        impacts.push({ label, points: pts });
        seen.add(label);
      }
      continue;
    }
    const teamMatch = findMatchingApiName(label, matchTeamPoints.keys());
    if (teamMatch) {
      const pts = matchTeamPoints.get(teamMatch) ?? 0;
      if (pts > 0) {
        impacts.push({ label, points: pts });
        seen.add(label);
      }
    }
  }
  return impacts.sort((a, b) => b.points - a.points);
}

// src/lib/computeStandings.ts
var finishedLineCache = /* @__PURE__ */ new Map();
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
async function linesFor(event) {
  if (event.status.type === "finished" && finishedLineCache.has(event.id)) {
    return finishedLineCache.get(event.id);
  }
  const lines = await fetchFixturePlayers(event.id);
  if (event.status.type === "finished") finishedLineCache.set(event.id, lines);
  return lines;
}
async function computeStandings(entries2) {
  const standings = await fetchWCStandings();
  const fixtures = await fetchWCFixtures(groupLetterMap(standings));
  const played = fixtures.filter(
    (m) => m.status.type === "finished" || m.status.type === "inprogress"
  );
  const lineResults = await mapWithConcurrency(played, 5, async (event) => ({
    event,
    lines: await linesFor(event)
  }));
  const teamLabels = /* @__PURE__ */ new Set();
  const playerLabels = /* @__PURE__ */ new Set();
  const keeperLabels = /* @__PURE__ */ new Set();
  for (const entry of entries2) {
    for (const p of entry.teams) teamLabels.add(p.label);
    for (const p of entry.players) playerLabels.add(p.label);
    for (const p of entry.keepers) keeperLabels.add(p.label);
  }
  const allLabels = /* @__PURE__ */ new Set([...teamLabels, ...playerLabels, ...keeperLabels]);
  const stats = accumulateLines(lineResults);
  const teamPointsRaw = /* @__PURE__ */ new Map();
  for (const [teamName, ts] of stats.teams) {
    teamPointsRaw.set(teamName, computeTeamPointsFromStats(ts));
  }
  const teamPoints = applyGroupBonuses(teamPointsRaw, standings);
  const pickValues = /* @__PURE__ */ new Map();
  for (const label of teamLabels) {
    const m = findMatchingApiName(label, teamPoints.keys());
    if (m) pickValues.set(label, teamPoints.get(m) ?? 0);
  }
  for (const label of playerLabels) {
    const m = findMatchingApiName(label, stats.players.keys());
    if (m) pickValues.set(label, computePlayerPoints(stats.players.get(m)));
  }
  for (const label of keeperLabels) {
    const m = findMatchingApiName(label, stats.keepers.keys());
    if (m) pickValues.set(label, computeKeeperPoints(stats.keepers.get(m)));
  }
  const allImpacts = lineResults.map(({ event, lines }) => {
    const ms = accumulateLines([{ event, lines }]);
    const mTeamPoints = /* @__PURE__ */ new Map();
    for (const [teamName, ts] of ms.teams) {
      mTeamPoints.set(teamName, computeTeamPointsFromStats(ts));
    }
    return { event, impacts: computeMatchImpacts(ms, mTeamPoints, allLabels) };
  });
  const dayKey = (ts) => new Date(ts * 1e3).toISOString().slice(0, 10);
  const finishedDays = allImpacts.filter((m) => m.event.status.type === "finished").map((m) => dayKey(m.event.startTimestamp)).sort();
  const latestDay = finishedDays[finishedDays.length - 1];
  const matchImpacts = allImpacts.filter(
    (m) => m.event.status.type === "inprogress" || dayKey(m.event.startTimestamp) === latestDay
  );
  const updatedPoints = /* @__PURE__ */ new Map();
  for (const entry of entries2) {
    const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
    const total = allPicks.reduce((sum, pick) => sum + (pickValues.get(pick.label) ?? 0), 0);
    updatedPoints.set(entry.name, total);
  }
  const livePickLabels = /* @__PURE__ */ new Set();
  for (const mi of matchImpacts) {
    if (mi.event.status.type === "inprogress") {
      for (const imp of mi.impacts) livePickLabels.add(imp.label);
    }
  }
  return {
    updatedPoints: [...updatedPoints],
    pickValues: [...pickValues],
    livePickLabels: [...livePickLabels],
    liveMatchCount: fixtures.filter((m) => m.status.type === "inprogress").length,
    matchImpacts,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/lib/adapters.ts
function toPick([label, points]) {
  return { label: label.trim(), points };
}
function fromRaw(raw) {
  return {
    name: raw.name,
    teams: raw.teams.map(toPick),
    players: raw.players.map(toPick),
    keepers: raw.keepers.map(toPick),
    points: raw.points,
    note: raw.note
  };
}

// src/data/standings.json
var standings_default = [
  {
    name: "Balze Heuga",
    teams: [
      [
        "\u{1F1EA}\u{1F1F8}Spain",
        13
      ],
      [
        "\u{1F1FA}\u{1F1F8}USA",
        23
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1F2}\u{1F1FD}Raul Jimene\u017A",
        5
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1EA}\u{1F1F8}S\xECmon",
        11
      ],
      [
        "\u{1F1EF}\u{1F1F5}Suzuki",
        10
      ],
      [
        "\u{1F1E8}\u{1F1EE}Fofana",
        12
      ]
    ],
    points: 127
  },
  {
    name: "Johnny Futbol DiLivio",
    teams: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}England",
        10
      ],
      [
        "\u{1F1FA}\u{1F1FE}Uruguay",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Kane",
        10
      ],
      [
        "\u{1F1EA}\u{1F1E8}E. Valencia",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Pickford",
        9
      ],
      [
        "\u{1F1FA}\u{1F1FE}Muslera",
        4
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 77
  },
  {
    name: "Penrod Loves his friend's Balze",
    teams: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}England",
        10
      ],
      [
        "\u{1F1E8}\u{1F1ED}Switzerland",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1FA}\u{1F1F8}Balogun",
        10
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}Gunn",
        8
      ]
    ],
    points: 110
  },
  {
    name: "Wilder",
    teams: [
      [
        "\u{1F1EB}\u{1F1F7}France",
        15
      ],
      [
        "\u{1F1EA}\u{1F1E8}Ecuador",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1EA}\u{1F1E8}E. Valencia",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1EB}\u{1F1F7}Maignan",
        11
      ],
      [
        "\u{1F1EF}\u{1F1F5}Suzuki",
        10
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 100
  },
  {
    name: "Shmeeve's' FutBalzers",
    teams: [
      [
        "\u{1F1E6}\u{1F1F7}Argentina",
        17
      ],
      [
        "\u{1F1FA}\u{1F1FE}Uruguay",
        3
      ],
      [
        "\u{1F1F8}\u{1F1EA}Sweden",
        8
      ]
    ],
    players: [
      [
        "\u{1F1EA}\u{1F1F8}Yamal",
        5
      ],
      [
        "\u{1F1FA}\u{1F1FE}Nunez",
        0
      ],
      [
        "\u{1F1F8}\u{1F1EA}Gyokeres",
        8
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1EF}\u{1F1F5}Suzuki",
        10
      ],
      [
        "\u{1F1F8}\u{1F1EA}Nordfeldt",
        6
      ]
    ],
    points: 70
  },
  {
    name: "K-19",
    teams: [
      [
        "\u{1F1EB}\u{1F1F7}France",
        15
      ],
      [
        "\u{1F1F8}\u{1F1F3}Senegal",
        3
      ],
      [
        "\u{1F1E8}\u{1F1E6}Canada",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1F8}\u{1F1F3}Mane",
        3
      ],
      [
        "\u{1F1F8}\u{1F1EA}Gyokeres",
        8
      ]
    ],
    keepers: [
      [
        "\u{1F1EB}\u{1F1F7}Maignan",
        11
      ],
      [
        "\u{1F1F8}\u{1F1F3}Mendy",
        8
      ],
      [
        "\u{1F1ED}\u{1F1F9}Placide",
        3
      ]
    ],
    points: 84
  },
  {
    name: "Linc",
    teams: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}England",
        10
      ],
      [
        "\u{1F1F2}\u{1F1FD}Mexico",
        23
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Kane",
        10
      ],
      [
        "\u{1F1F8}\u{1F1F3}Mane",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Pickford",
        9
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 104
  },
  {
    name: "McNutt",
    teams: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}England",
        10
      ],
      [
        "\u{1F1FA}\u{1F1FE}Uruguay",
        3
      ],
      [
        "\u{1F1F8}\u{1F1EA}Sweden",
        8
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1EA}\u{1F1E8}Caicedo",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1FA}\u{1F1FE}Muslera",
        4
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 86
  },
  {
    name: "Herr Wagner der Gr\xF6\xDFte",
    teams: [
      [
        "\u{1F1F2}\u{1F1E6}Morocco",
        8
      ],
      [
        "\u{1F1F2}\u{1F1FD}Mexico",
        23
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Kane",
        10
      ],
      [
        "\u{1F1E8}\u{1F1ED}Embolo",
        5
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 108
  },
  {
    name: "Justin",
    teams: [
      [
        "\u{1F1EB}\u{1F1F7}France",
        15
      ],
      [
        "\u{1F1EA}\u{1F1E8}Ecuador",
        3
      ],
      [
        "\u{1F1E8}\u{1F1EE}Ivory Coast",
        8
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1EA}\u{1F1E8}E. Valencia",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1EA}\u{1F1E8}Galindez",
        9
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 96
  },
  {
    name: "Captain JARRR",
    teams: [
      [
        "\u{1F1E7}\u{1F1F7}Brazil",
        10
      ],
      [
        "\u{1F1EF}\u{1F1F5}Japan",
        12
      ],
      [
        "\u{1F1E9}\u{1F1FF}Algeria",
        5
      ]
    ],
    players: [
      [
        "\u{1F1E6}\u{1F1F7}Alvarez",
        0
      ],
      [
        "\u{1F1F8}\u{1F1F3}Mane",
        3
      ],
      [
        "\u{1F1F8}\u{1F1EA}Gyokeres",
        8
      ]
    ],
    keepers: [
      [
        "\u{1F1E7}\u{1F1F7}Alisson",
        11
      ],
      [
        "\u{1F1EF}\u{1F1F5}Suzuki",
        10
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 67
  },
  {
    name: "Messi all day",
    teams: [
      [
        "\u{1F1EA}\u{1F1F8}Spain",
        13
      ],
      [
        "\u{1F1FA}\u{1F1FE}Uruguay",
        3
      ],
      [
        "\u{1F1E8}\u{1F1E6} Canada",
        13
      ]
    ],
    players: [
      [
        "\u{1F1E6}\u{1F1F7} Messi",
        25
      ],
      [
        "\u{1F1EF}\u{1F1F5} Ueda",
        13
      ],
      [
        "\u{1F1F8}\u{1F1EA}Gyokeres",
        8
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} Gunn",
        8
      ]
    ],
    points: 104
  },
  {
    name: "Peter (Jenn Dumm Dumm)",
    teams: [
      [
        "\u{1F1E6}\u{1F1F7}Argentina",
        17
      ],
      [
        "\u{1F1E8}\u{1F1ED}Switzerland",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EA}\u{1F1F8}Yamal",
        5
      ],
      [
        "\u{1F1F2}\u{1F1FD}Raul Jimene\u017A",
        5
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 97
  },
  {
    name: "Anonymous Dumbo Octopus",
    teams: [
      [
        "\u{1F1EB}\u{1F1F7}France",
        15
      ],
      [
        "\u{1F1E8}\u{1F1ED}Switzerland",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1E8}\u{1F1ED}Embolo",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1EB}\u{1F1F7}Maignan",
        11
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 111
  },
  {
    name: "Tom Atwood",
    teams: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}England",
        10
      ],
      [
        "\u{1F1EA}\u{1F1E8}Ecuador",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}Kane",
        10
      ],
      [
        "\u{1F1FA}\u{1F1F8} Pulisic",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 88
  },
  {
    name: "Seattle Sele\xE7\xE3o",
    teams: [
      [
        "\u{1F1E7}\u{1F1F7}Brazil",
        10
      ],
      [
        "\u{1F1FA}\u{1F1F8}USA",
        23
      ],
      [
        "\u{1F1F8}\u{1F1EA}Sweden",
        8
      ]
    ],
    players: [
      [
        "\u{1F1E7}\u{1F1F7}Raphinha",
        0
      ],
      [
        "\u{1F1F9}\u{1F1F7}Guler",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E7}\u{1F1F7}Alisson",
        11
      ],
      [
        "\u{1F1EA}\u{1F1E8}Galindez",
        9
      ],
      [
        "\u{1F1E8}\u{1F1EE}Fofana",
        12
      ]
    ],
    points: 93
  },
  {
    name: "Krafty Cole",
    teams: [
      [
        "\u{1F1EB}\u{1F1F7}France",
        15
      ],
      [
        "\u{1F1EF}\u{1F1F5}Japan",
        12
      ],
      [
        "\u{1F1E8}\u{1F1E6}Canada",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Demb\xE9l\xE9",
        8
      ],
      [
        "\u{1F1EF}\u{1F1F5}Kubo",
        3
      ],
      [
        "\u{1F1EA}\u{1F1EC}Salah",
        11
      ]
    ],
    keepers: [
      [
        "\u{1F1EB}\u{1F1F7}Maignan",
        11
      ],
      [
        "\u{1F1EF}\u{1F1F5}Suzuki",
        10
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 91
  },
  {
    name: "Franco",
    teams: [
      [
        "\u{1F1EA}\u{1F1F8}Spain",
        13
      ],
      [
        "\u{1F1F2}\u{1F1FD}Mexico",
        23
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1FA}\u{1F1F8}Balogun",
        10
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1F2}\u{1F1FD}Rangel",
        16
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 136
  },
  {
    name: "The Pope\u2019s on Our Side. Knicks in Five.",
    teams: [
      [
        "\u{1F1EA}\u{1F1F8}Spain",
        13
      ],
      [
        "\u{1F1FA}\u{1F1F8}USA",
        23
      ],
      [
        "\u{1F1E8}\u{1F1EE}Ivory Coast",
        7
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1FA}\u{1F1F8} Pulisic",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1E8}\u{1F1ED}Kobel",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 115
  },
  {
    name: "Mike Scigliano",
    teams: [
      [
        "\u{1F1E7}\u{1F1F7}Brazil",
        10
      ],
      [
        "\u{1F1FA}\u{1F1FE}Uruguay",
        3
      ],
      [
        "\u{1F1F3}\u{1F1F4}Norway",
        13
      ]
    ],
    players: [
      [
        "\u{1F1EB}\u{1F1F7}Mbapp\xE9",
        20
      ],
      [
        "\u{1F1FA}\u{1F1FE}Nunez",
        0
      ],
      [
        "\u{1F1F3}\u{1F1F4}Haaland",
        20
      ]
    ],
    keepers: [
      [
        "\u{1F1E6}\u{1F1F7}Mart\xEDnez",
        13
      ],
      [
        "\u{1F1FA}\u{1F1F8}Freese",
        8
      ],
      [
        "\u{1F1F3}\u{1F1F4}Nyland",
        8
      ]
    ],
    points: 95
  }
];

// server/standings.ts
var entries = standings_default.map(fromRaw);
async function handler(_req, res) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    res.status(500).json({ error: "APIFOOTBALL_KEY not configured" });
    return;
  }
  setApiKey(key);
  try {
    const payload = await computeStandings(entries);
    const live = payload.liveMatchCount > 0;
    const sMaxAge = live ? 30 : 600;
    const swr = live ? 60 : 1200;
    res.setHeader("Cache-Control", `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
    res.status(200).json(payload);
  } catch (err) {
    res.status(502).json({ error: String(err?.message ?? err) });
  }
}
export {
  handler as default
};
