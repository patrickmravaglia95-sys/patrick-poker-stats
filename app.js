const money = n =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(n) || 0);

const number = n =>
  new Intl.NumberFormat("pt-BR").format(Number(n) || 0);


async function loadSessions() {

  const url =
    `${SUPABASE_URL}/rest/v1/sessions?select=id,date,hands,starting_bankroll,ending_bankroll,rakeback&order=date.asc`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error("Não foi possível carregar as sessões.");
  }

  return await res.json();
}


function profit(row) {
  return (
    Number(row.ending_bankroll || 0) -
    Number(row.starting_bankroll || 0) +
    Number(row.rakeback || 0)
  );
}


function monthKey(date) {
  return date.slice(0, 7);
}


function monthLabel(key) {

  const [y, m] = key.split("-");

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  })
    .format(new Date(Number(y), Number(m) - 1, 1))
    .replace(/^./, c => c.toUpperCase());
}


function fillMonths(rows) {

  const select = document.getElementById("monthSelect");

  const months = [
    ...new Set(rows.map(r => monthKey(r.date)))
  ].reverse();

  select.innerHTML = months
    .map(m => `<option value="${m}">${monthLabel(m)}</option>`)
    .join("");

  if (months.length) {
    select.value = months[0];
  }

  select.onchange = () => {

    render(
      rows.filter(
        r => monthKey(r.date) === select.value
      )
    );

  };
}


function render(rows) {

  const hands = rows.reduce(
    (s, r) => s + Number(r.hands || 0),
    0
  );

  const profitTotal = rows.reduce(
    (s, r) => s + profit(r),
    0
  );

  const rake = rows.reduce(
    (s, r) => s + Number(r.rakeback || 0),
    0
  );


  document.getElementById("hands").textContent =
    number(hands);

  document.getElementById("profit").textContent =
    money(profitTotal);

  document.getElementById("rakeback").textContent =
    money(rake);


  const tbody = document.getElementById("history");

  tbody.innerHTML =
    rows
      .slice()
      .reverse()
      .map(r => {

        const p = profit(r);

        const cls =
          p >= 0
            ? "profit-positive"
            : "profit-negative";

        return `
          <tr>
            <td>
              ${new Date(r.date + "T00:00:00")
                .toLocaleDateString("pt-BR")}
            </td>

            <td>
              ${number(r.hands)}
            </td>

            <td class="${cls}">
              ${p >= 0 ? "+" : ""}${money(p)}
            </td>

            <td>
              ${money(r.rakeback)}
            </td>

            <td>
              ${money(r.ending_bankroll)}
            </td>
          </tr>
        `;

      })
      .join("")
    ||
    `<tr>
      <td colspan="5" class="empty">
        Nenhuma sessão registrada neste mês.
      </td>
    </tr>`;


  drawChart(rows);
}


function drawChart(rows) {

  const svg = document.getElementById("chart");

  svg.innerHTML = "";

  if (!rows.length) {
    return;
  }


  /*
    Dimensões do gráfico
  */

  const W = 900;
  const H = 330;

  const left = 70;
  const right = 25;
  const top = 25;
  const bottom = 55;


  /*
    Lucros diários
  */

  const vals = rows.map(r => profit(r));


  /*
    Encontrar mínimo e máximo
  */

  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, 0);


  /*
    Arredondar a escala para ficar mais bonita
  */

  const range = max - min || 1;

  const step = Math.max(
    5,
    Math.ceil(range / 5 / 5) * 5
  );


  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;


  if (min === max) {
    min -= step;
    max += step;
  }


  /*
    Funções de posição
  */

  const chartWidth = W - left - right;
  const chartHeight = H - top - bottom;


  const x = i =>
    rows.length === 1
      ? left + chartWidth / 2
      : left +
        (i / (rows.length - 1)) *
          chartWidth;


  const y = value =>
    top +
    (max - value) /
      (max - min) *
      chartHeight;


  /*
    EIXOS
  */

  // Eixo vertical
  svg.insertAdjacentHTML(
    "beforeend",
    `
      <line
        x1="${left}"
        y1="${top}"
        x2="${left}"
        y2="${H - bottom}"
        class="axis"
      />
    `
  );


  // Eixo horizontal
  svg.insertAdjacentHTML(
    "beforeend",
    `
      <line
        x1="${left}"
        y1="${H - bottom}"
        x2="${W - right}"
        y2="${H - bottom}"
        class="axis"
      />
    `
  );


  /*
    ESCALA VERTICAL
  */

  for (
    let value = min;
    value <= max;
    value += step
  ) {

    const yy = y(value);

    // Linha horizontal
    svg.insertAdjacentHTML(
      "beforeend",
      `
        <line
          x1="${left}"
          y1="${yy}"
          x2="${W - right}"
          y2="${yy}"
          class="gridline"
        />
      `
    );


    // Valor
    const label =
      value >= 0
        ? `$${value}`
        : `-$${Math.abs(value)}`;


    svg.insertAdjacentHTML(
      "beforeend",
      `
        <text
          x="${left - 10}"
          y="${yy + 4}"
          text-anchor="end"
          class="axis-label"
        >
          ${label}
        </text>
      `
    );
  }


  /*
    EIXO ZERO
  */

  if (min <= 0 && max >= 0) {

    const zeroY = y(0);

    svg.insertAdjacentHTML(
      "beforeend",
      `
        <line
          x1="${left}"
          y1="${zeroY}"
          x2="${W - right}"
          y2="${zeroY}"
          class="zero-line"
        />
      `
    );
  }


  /*
    DATAS NO EIXO HORIZONTAL
    Apenas o dia: 01, 02, 03...
  */

  rows.forEach((row, i) => {

    const xx = x(i);

    const day =
      new Date(row.date + "T00:00:00")
        .getDate()
        .toString()
        .padStart(2, "0");


    // Pequena marca no eixo
    svg.insertAdjacentHTML(
      "beforeend",
      `
        <line
          x1="${xx}"
          y1="${H - bottom}"
          x2="${xx}"
          y2="${H - bottom + 5}"
          class="tick"
        />
      `
    );


    // Dia
    svg.insertAdjacentHTML(
      "beforeend",
      `
        <text
          x="${xx}"
          y="${H - bottom + 22}"
          text-anchor="middle"
          class="axis-label"
        >
          ${day}
        </text>
      `
    );

  });


  /*
    LINHA DO GRÁFICO
  */

  const points = vals
    .map((value, i) =>
      `${x(i)},${y(value)}`
    )
    .join(" ");


  svg.insertAdjacentHTML(
    "beforeend",
    `
      <polyline
        points="${points}"
        class="chartline"
      />
    `
  );


  /*
    PONTOS
  */

  vals.forEach((value, i) => {

    svg.insertAdjacentHTML(
      "beforeend",
      `
        <circle
          cx="${x(i)}"
          cy="${y(value)}"
          r="5"
          class="dot"
        />
      `
    );

  });


  /*
    TÍTULO DOS EIXOS
  */

  svg.insertAdjacentHTML(
    "beforeend",
    `
      <text
        x="18"
        y="${top + chartHeight / 2}"
        text-anchor="middle"
        class="axis-title"
        transform="rotate(-90 18 ${top + chartHeight / 2})"
      >
        Lucro
      </text>
    `
  );


  svg.insertAdjacentHTML(
    "beforeend",
    `
      <text
        x="${left + chartWidth / 2}"
        y="${H - 8}"
        text-anchor="middle"
        class="axis-title"
      >
        Dia
      </text>
    `
  );

}


(async () => {

  try {

    if (SUPABASE_URL.includes("COLE_AQUI")) {
      throw new Error(
        "Configure o Supabase em config.js."
      );
    }


    const rows = await loadSessions();


    if (rows.length) {
      fillMonths(rows);
    }


    render(rows);


  } catch (e) {

    console.error(e);

    document.getElementById("history").innerHTML =
      `
        <tr>
          <td colspan="5" class="empty">
            ${e.message}
          </td>
        </tr>
      `;

  }

})();
