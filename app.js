const money = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const number = n => new Intl.NumberFormat("pt-BR").format(Number(n)||0);

async function loadSessions(){
  const url = `${SUPABASE_URL}/rest/v1/sessions?select=id,date,hands,starting_bankroll,ending_bankroll,rakeback&order=date.asc`;
  const res = await fetch(url,{headers:{
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  }});
  if(!res.ok) throw new Error("Não foi possível carregar as sessões.");
  return await res.json();
}

function profit(row){ return Number(row.ending_bankroll)-Number(row.starting_bankroll); }

function monthKey(date){ return date.slice(0,7); }
function monthLabel(key){
  const [y,m]=key.split("-");
  return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"})
    .format(new Date(Number(y),Number(m)-1,1))
    .replace(/^./,c=>c.toUpperCase());
}

function fillMonths(rows){
  const select=document.getElementById("monthSelect");
  const months=[...new Set(rows.map(r=>monthKey(r.date)))].reverse();
  select.innerHTML=months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
  if(months.length) select.value=months[0];
  select.onchange=()=>render(rows.filter(r=>monthKey(r.date)===select.value));
}

function render(rows){
  const hands=rows.reduce((s,r)=>s+Number(r.hands||0),0);
  const profitTotal=rows.reduce((s,r)=>s+profit(r),0);
  const rake=rows.reduce((s,r)=>s+Number(r.rakeback||0),0);

  document.getElementById("hands").textContent=number(hands);
  document.getElementById("profit").textContent=money(profitTotal);
  document.getElementById("rakeback").textContent=money(rake);

  const tbody=document.getElementById("history");
  tbody.innerHTML=rows.slice().reverse().map(r=>{
    const p=profit(r);
    const cls=p>=0?"profit-positive":"profit-negative";
    return `<tr>
      <td>${new Date(r.date+"T00:00:00").toLocaleDateString("pt-BR")}</td>
      <td>${number(r.hands)}</td>
      <td class="${cls}">${p>=0?"+":""}${money(p)}</td>
      <td>${money(r.rakeback)}</td>
      <td>${money(r.ending_bankroll)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="empty">Nenhuma sessão registrada neste mês.</td></tr>`;

  drawChart(rows);
}

function drawChart(rows){
  const svg = document.getElementById("chart");
  svg.innerHTML = "";

  if(!rows.length) return;

  const W = 900;
  const H = 300;
  const pad = 45;

  const vals = rows.map(r => profit(r));

  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, 0);

  if(min === max){
    min -= 1;
    max += 1;
  }

  const x = i =>
    pad + (i / Math.max(rows.length - 1, 1)) * (W - pad * 2);

  const y = v =>
    H - pad - ((v - min) / (max - min)) * (H - pad * 2);

  // Linha do zero
  const zeroY = y(0);

  svg.insertAdjacentHTML(
    "beforeend",
    `<line
      x1="${pad}"
      y1="${zeroY}"
      x2="${W-pad}"
      y2="${zeroY}"
      class="gridline"
    />`
  );

  // Linhas horizontais auxiliares
  [0, 0.5, 1].forEach(t => {
    const yy = pad + t * (H - pad * 2);

    svg.insertAdjacentHTML(
      "beforeend",
      `<line
        x1="${pad}"
        y1="${yy}"
        x2="${W-pad}"
        y2="${yy}"
        class="gridline"
      />`
    );
  });

  // Linha do lucro
  const points = vals
    .map((v,i) => `${x(i)},${y(v)}`)
    .join(" ");

  svg.insertAdjacentHTML(
    "beforeend",
    `<polyline points="${points}" class="chartline"/>`
  );

  // Pontos
  vals.forEach((v,i) => {

    svg.insertAdjacentHTML(
      "beforeend",
      `<circle
        cx="${x(i)}"
        cy="${y(v)}"
        r="5"
        class="dot"
      />`
    );

  });
}
}

(async()=>{
  try{
    if(SUPABASE_URL.includes("COLE_AQUI")) throw new Error("Configure o Supabase em config.js.");
    const rows=await loadSessions();
    if(rows.length) fillMonths(rows);
    render(rows);
  }catch(e){
    console.error(e);
    document.getElementById("history").innerHTML=`<tr><td colspan="5" class="empty">${e.message}</td></tr>`;
  }
})();
