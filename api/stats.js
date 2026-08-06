export default async function handler(req, res) {
  try {
    const url =
      "https://pxfpolnkuejqbpsutfgs.supabase.co/rest/v1/sessions" +
      "?select=date,hands,starting_bankroll,ending_bankroll" +
      "&order=date.asc";

    const response = await fetch(url, {
      headers: {
        apikey: "sb_publishable__kdshE2U56KZkDyobt8Rqw_z_9R-WxS",
        Authorization: "Bearer sb_publishable__kdshE2U56KZkDyobt8Rqw_z_9R-WxS"
      }
    });

    if (!response.ok) {
      return res.status(500).send("Erro ao consultar os dados.");
    }

    const sessions = await response.json();

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const currentMonth = `${year}-${month}`;

    const rows = sessions.filter(
      session => session.date.startsWith(currentMonth)
    );

    const hands = rows.reduce(
      (total, session) =>
        total + Number(session.hands || 0),
      0
    );

  const profit = rows.reduce(
  (total, session) =>
    total +
    Number(session.ending_bankroll || 0) -
    Number(session.starting_bankroll || 0) +
    Number(session.rakeback || 0),
  0
);

    const formattedHands =
      hands.toLocaleString("pt-BR");

    const formattedProfit =
      `${profit >= 0 ? "+" : "-"}$${Math.abs(profit).toFixed(2)}`;

    res.status(200).send(
      `🃏 ${formattedHands} mãos | 💰 ${formattedProfit}`
    );

  } catch (error) {

    console.error(error);

    res.status(500).send(
      "Erro ao carregar os resultados."
    );

  }
}
