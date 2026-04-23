let cache = { data: null, date: null, ts: 0 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const pad = n => String(n).padStart(2, '0');
  const today = `${brt.getFullYear()}-${pad(brt.getMonth()+1)}-${pad(brt.getDate())}`;
  const nowTs = Date.now();

  // Cache de 30 minutos — 100 req/dia = ~3 atualizações/hora, suficiente
  const CACHE_TTL = 30 * 60 * 1000;
  if (cache.data && cache.date === today && (nowTs - cache.ts) < CACHE_TTL) {
    return res.status(200).json({ ...cache.data, cached: true });
  }

  const PRIORITY = [2,3,39,140,71,78,135,61,13,9,11,73,253,4,1,45,46,48,88,94,203,262,283,307,333];

  async function fetchDay(date) {
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      { headers: { 'x-apisports-key': '17ce43bae0fb41017db59a595c23be9e' } }
    );
    const d = await r.json();
    // Se a API retornar erro de limite, lança exceção
    if (d.errors && (d.errors.requests || d.errors.token)) {
      throw new Error('API limit: ' + JSON.stringify(d.errors));
    }
    return d.response || [];
  }

  try {
    let fixtures = await fetchDay(today);

    // Se veio vazio, tenta amanhã
    if (!fixtures.length) {
      const tomorrow = new Date(brt);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`;
      fixtures = await fetchDay(tStr);
    }

    const sorted = fixtures
      .map(f => ({ ...f, _prio: PRIORITY.includes(f.league.id) ? PRIORITY.indexOf(f.league.id) : 999 }))
      .sort((a, b) => a._prio !== b._prio ? a._prio - b._prio : new Date(a.fixture.date) - new Date(b.fixture.date))
      .slice(0, 10);

    const result = { response: sorted, date: today, total: fixtures.length };
    cache = { data: result, date: today, ts: nowTs };
    res.status(200).json(result);

  } catch (err) {
    // Retorna cache antigo se existir, mesmo expirado
    if (cache.data) {
      return res.status(200).json({ ...cache.data, cached: true, stale: true });
    }
    res.status(500).json({ error: err.message });
  }
}
