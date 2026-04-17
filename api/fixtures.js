export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Data correta no fuso de Brasília
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const pad = n => String(n).padStart(2, '0');
  const today = `${brt.getFullYear()}-${pad(brt.getMonth()+1)}-${pad(brt.getDate())}`;

  // Ligas prioritárias
  const PRIORITY = [2,3,39,140,71,78,135,61,13,9,11,73,253,4,1,45,46,48,88,94,203,262,283,307,333];

  async function fetchDay(date) {
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=America%2FSao_Paulo`,
      { headers: { 'x-apisports-key': '17ce43bae0fb41017db59a595c23be9e' } }
    );
    const d = await r.json();
    return d.response || [];
  }

  try {
    let fixtures = await fetchDay(today);

    // Se não tiver jogos hoje nas ligas prioritárias, tenta amanhã
    const prioritized = fixtures.filter(f => PRIORITY.includes(f.league.id));
    if (prioritized.length === 0) {
      const tomorrow = new Date(brt);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`;
      const tomorrowFixtures = await fetchDay(tomorrowStr);
      fixtures = tomorrowFixtures.length > prioritized.length ? tomorrowFixtures : fixtures;
    }

    // Ordena por prioridade de liga depois por horário
    const sorted = fixtures
      .map(f => ({ ...f, _prio: PRIORITY.indexOf(f.league.id) === -1 ? 999 : PRIORITY.indexOf(f.league.id) }))
      .sort((a, b) => a._prio !== b._prio ? a._prio - b._prio : new Date(a.fixture.date) - new Date(b.fixture.date))
      .slice(0, 10);

    res.status(200).json({ response: sorted, date: today });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar jogos', detail: err.message });
  }
}
