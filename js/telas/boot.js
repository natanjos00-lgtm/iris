/* ÍRIS · sequência de entrada: luz, escaneamento da íris, checagem dos sistemas.
   O iPhone só deixa tocar som depois de um toque, então ela pede "toque para confirmar":
   esse toque libera a voz ("ÍRIS reconhecida. Acesso concedido. Boa noite, Natália.") e os bipes. */
(function () {
  const b = document.getElementById("boot"); if (!b) return;
  const html = document.documentElement; html.classList.add("booting");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $b = id => document.getElementById(id), pad = n => String(n).padStart(2, "0"), now = new Date();
  const clk = $b("btClock"); if (clk) clk.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + " · " + pad(now.getDate()) + "." + pad(now.getMonth() + 1);
  const s1 = b.querySelector(".s1"), s3 = b.querySelector(".s3"), skip = $b("btSkip");
  let soundOn = true; try { soundOn = localStorage.getItem("iris.bootVoice") !== "off"; } catch {}

  const helloText = () => {
    const g = document.querySelector(".js-greet2"); let t = g && g.textContent.trim();
    if (!t || t === "Bom dia.") { try { t = greet(); } catch { t = "Bem-vinda de volta"; } }
    return /[.!?]$/.test(t) ? t : t + ".";
  };
  /* bipes de sistema, gerados na hora (sem arquivo de som) */
  function chime() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const ac = new A(), t0 = ac.currentTime + 0.02, out = ac.createGain(); out.gain.value = 0.18; out.connect(ac.destination);
      const tone = (f0, f1, at, dur, type = "sine", vol = 1) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0 + at); o.frequency.exponentialRampToValueAtTime(f1, t0 + at + dur); g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur); o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.05); };
      tone(180, 820, 0, 0.32, "sine", 0.7); tone(1320, 1320, 0.34, 0.09, "triangle", 0.6); tone(1760, 1760, 0.46, 0.14, "triangle", 0.5);
      setTimeout(() => { try { ac.close(); } catch {} }, 1500);
    } catch {}
  }
  function speak(text, done) {
    let finished = false; const fin = () => { if (finished) return; finished = true; done(); };
    try {
      const P = (typeof prefs === "object" && prefs) || {};
      const over = { rate: (+P.rate || 1) * 1.04, pitch: (+P.pitch || 1) * 0.92 };
      if (typeof speakAny === "function") { try { prepSpeech(); } catch {} speakAny(text, { over, onend: fin }); }
      else { const u = new SpeechSynthesisUtterance(text); u.lang = "pt-BR"; u.rate = over.rate; u.pitch = over.pitch; u.onend = fin; speechSynthesis.speak(u); }
    } catch { fin(); }
    setTimeout(fin, 6500);
  }

  let stage = "scan", done = false;
  const end = fast => {
    if (done) return; done = true;
    b.classList.add("out"); document.body.classList.add("boot-in"); html.classList.remove("booting");
    setTimeout(() => b.remove(), fast ? 350 : 750);
    setTimeout(() => document.body.classList.remove("boot-in"), 2000);
  };
  function confirm(withSound) {
    if (stage === "ok") return; stage = "ok";
    const hello = helloText(); const el = $b("btHello"); if (el) el.textContent = hello;
    if (s1) s1.style.visibility = "hidden"; if (s3) s3.hidden = true;
    b.classList.add("ok");
    if (withSound && soundOn) {
      chime(); let spoke = false, minT = false;
      const go = () => { if (spoke && minT) end(false); };
      setTimeout(() => { minT = true; go(); }, 1900);
      setTimeout(() => speak("ÍRIS reconhecida. Acesso concedido. " + hello, () => { spoke = true; setTimeout(go, 250); }), 450);
    } else setTimeout(() => end(false), 1500);
  }
  // fim do escaneamento: espera o toque (até 6 s; sem toque, segue em silêncio)
  setTimeout(() => {
    if (stage !== "scan") return; stage = "wait"; b.classList.add("wait");
    if (s1) s1.style.visibility = "hidden"; if (s3) s3.hidden = false; if (skip) skip.textContent = "";
    setTimeout(() => { if (stage === "wait") confirm(false); }, 6000);
  }, reduce ? 300 : Math.max(400, 2100 - performance.now()));
  b.addEventListener("click", () => { if (stage === "ok") end(true); else confirm(true); });
})();
