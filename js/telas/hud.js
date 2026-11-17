/* ÍRIS · anéis do visor holográfico em volta da esfera (a esfera e o modo "entrar" continuam iguais) */
(function () {
  const box = document.querySelector(".corebox"); if (!box || box.querySelector(".hudring")) return;
  const C = [50, 45], P = (r, a) => [(C[0] + Math.cos(a) * r).toFixed(2), (C[1] + Math.sin(a) * r).toFixed(2)];
  const arc = (r, d0, d1) => { const a0 = (d0 - 90) * Math.PI / 180, a1 = (d1 - 90) * Math.PI / 180, [x0, y0] = P(r, a0), [x1, y1] = P(r, a1); return `M${x0} ${y0}A${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  let ticks = "";
  for (let i = 0; i < 144; i++) { const a = i / 144 * Math.PI * 2, L = i % 12 === 0 ? 2.6 : i % 4 === 0 ? 1.5 : 0.8, [x1, y1] = P(44, a), [x2, y2] = P(44 - L, a); ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="h1" stroke-opacity="${i % 12 === 0 ? .95 : .45}" stroke-width=".22"/>`; }
  const svg = `<svg class="hudring" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke-linecap="round">
    <g class="rot r3">${ticks}</g>
    <g class="rot">
      <path d="${arc(40.5, 200, 340)}" class="h1" stroke-width=".7" stroke-opacity=".9"/>
      <path d="${arc(40.5, 20, 110)}" class="h2" stroke-width=".7" stroke-opacity=".85"/>
      <path d="${arc(40.5, 130, 175)}" class="h1" stroke-width=".7" stroke-opacity=".4" stroke-dasharray=".5 1"/>
    </g>
    <g class="rot r2">
      <path d="${arc(38.2, 0, 259)}" class="h3" stroke-width=".25" stroke-opacity=".6"/>
      <path d="${arc(38.2, 265, 360)}" class="h3" stroke-width=".25" stroke-opacity=".2"/>
      <circle cx="50" cy="45" r="35.6" class="h2" stroke-width=".22" stroke-opacity=".4" stroke-dasharray=".25 1.2"/>
    </g>
    <path d="M3 45H7.5M92.5 45H97M50 -1V2.5M50 87.5V91" class="h1" stroke-width=".25" stroke-opacity=".6"/>
    <text x="3" y="6" id="hudDay">DIA · —</text>
    <text x="97" y="6" text-anchor="end">SINC · OK</text>
    <text x="3" y="88" class="hot">VOZ PRONTA</text>
    <text x="97" y="88" text-anchor="end" id="hudClock">—</text>
  </svg>`;
  box.insertAdjacentHTML("beforeend", svg);
  const day = document.getElementById("hudDay"), clk = document.getElementById("hudClock");
  function tick() {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes(), p = Math.max(0, Math.min(100, Math.round((m - 300) / (1380 - 300) * 100)));
    if (day) day.textContent = "DIA · " + p + "%";
    if (clk) clk.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  tick(); setInterval(tick, 30000);
})();
