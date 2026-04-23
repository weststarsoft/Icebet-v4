// Cache em memória — evita gastar as 100 req/dia do plano Free
let cache = { data: null, date: null, ts: 0 };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Ligas em ordem de prioridade
const PRIORITY = [
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  39,  // Premier League
  140, // La Liga
  71,  // Brasileirão Série A
  78,  // Bundesliga
  135, // Serie A (Itália)
  61,  // Ligue 1
  13,  // Copa Libertadores
  9,   // Copa do Brasil
  73,  // Copa Sudamericana
  11,  // CONMEBOL Libertadores
  253, // MLS
  4,   // Euro Championship
];

function getDateBRT() {
  const brt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = brt.getFullYear();
  const m = String(brt.getMonth() + 1).padStart(2, '0');
  const d = String(brt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchFixtures(date) {
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
    headers: { 'x-apisports-key': '17ce43bae0fb41017db59a595c23be9e' }
  });
  const json = await res.json();
  return json.response || [];
}

function sortFixtures(fixtures) {
  return fixtures
    .map(f => ({ ...f, _prio: PRIORITY.includes(f.league.id) ? PRIORITY.indexOf(f.league.id) : 999 }))
    .sort((a, b) => a._prio !== b._prio ? a._prio - b._prio : new Date(a.fixture.date) - new Date(b.fixture.date))
    .slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const today = getDateBRT();
  const now = Date.now();

  // Retorna cache se ainda válido e do mesmo dia
  if (cache.data && cache.date === today && (now - cache.ts) < CACHE_TTL) {
    return res.status(200).json({ ...cache.data, cached: true });
  }

  try {
    let fixtures = await fetchFixtures(today);

    // Se não houver jogos hoje, busca amanhã
    if (!fixtures.length) {
      const tomorrow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      fixtures = await fetchFixtures(`${y}-${m}-${d}`);
    }

    const top10 = sortFixtures(fixtures);
    const result = { response: top10, date: today, total: fixtures.length };

    // Salva cache
    cache = { data: result, date: today, ts: now };

    return res.status(200).json(result);

  } catch (err) {
    // Fallback: retorna cache antigo se existir
    if (cache.data) return res.status(200).json({ ...cache.data, cached: true, stale: true });
    return res.status(500).json({ error: err.message });
  }
}
