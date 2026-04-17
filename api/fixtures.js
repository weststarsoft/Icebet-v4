export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}&timezone=America/Sao_Paulo`,
      {
        headers: {
          'x-apisports-key': '17ce43bae0fb41017db59a595c23be9e'
        }
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar jogos', detail: err.message });
  }
}
