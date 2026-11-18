/* ÍRIS · sequência de entrada: luz, escaneamento da íris, checagem dos sistemas, acesso concedido */
(function () {
  const b = document.getElementById("boot"); if (!b) return;
  const html = document.documentElement; html.classList.add("booting");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = n => String(n).padStart(2, "0"), now = new Date();
  const clk = document.getElementById("btClock"); if (clk) clk.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + " · " + pad(now.getDate()) + "." + pad(now.getMonth() + 1);
  const hello = () => {
    const el = document.getElementById("btHello"), g = document.querySelector(".js-greet2");
    let t = g && g.textContent.trim(); if (!t || t === "Bom dia.") { try { t = greet(); } catch { t = "Bem-vinda de volta"; } }
    if (el) el.textContent = /[.!?]$/.test(t) ? t : t + ".";
  };
  let done = false;
  const end = fast => {
    if (done) return; done = true; hello();
    b.classList.add("out"); document.body.classList.add("boot-in"); html.classList.remove("booting");
    setTimeout(() => b.remove(), fast ? 350 : 750);
    setTimeout(() => document.body.classList.remove("boot-in"), 2000);
  };
  setTimeout(hello, reduce ? 0 : 1800);
  setTimeout(() => end(false), reduce ? 700 : Math.max(500, 3300 - performance.now()));
  b.addEventListener("click", () => end(true));
})();
