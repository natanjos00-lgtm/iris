/* ÍRIS · cenário do retrato, como na referência: anel holográfico atrás da cabeça, partículas de luz
   e plataforma que acendem quando ela ouve, pensa ou fala. O retrato em si não é deformado. */
(function () {
  const img = document.querySelector(".corebox .iris-av"); if (!img) return;
  const box = img.parentElement;
  // anel atrás da cabeça: segmentos claros grossos sobre um traço fino, como no desenho de referência
  const arc = (r, a0, a1) => { const p = a => [50 + Math.cos((a - 90) * Math.PI / 180) * r, 42 + Math.sin((a - 90) * Math.PI / 180) * r]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const segs = [[-58, -50], [-42, -38], [40, 52], [62, 66], [-100, -96], [92, 98]];
  box.insertAdjacentHTML("afterbegin", `<svg class="av-ring" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke-linecap="round">
    <g class="av-spin"><path d="${arc(36, -150, 150)}" stroke="currentColor" stroke-width=".28" opacity=".55"/>
    ${segs.map(s => `<path d="${arc(36, s[0], s[1])}" stroke="#FFF1DE" stroke-width="1.6" opacity=".9"/>`).join("")}</g>
    <path d="${arc(40, -135, -60)}" stroke="currentColor" stroke-width=".22" opacity=".45"/><path d="${arc(40, 60, 135)}" stroke="currentColor" stroke-width=".22" opacity=".45"/>
  </svg><div class="av-dust" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(Math.sin(i * 7.3) * 0.5 + 0.5) * 100}%;--d:${(i * 0.73) % 6}s;--s:${2 + (i % 4)}px;--t:${7 + (i % 5) * 1.6}s"></i>`).join("")}</div>`);
  let g = 0.25, last = performance.now();
  (function loop(now){
    requestAnimationFrame(loop);
    if (document.hidden || box.classList.contains("av-3d")) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let mode = "idle", en = 0.18, sp = 0; try { mode = coreMode; en = energy; sp = spike; } catch {}
    const tg = mode === "idle" ? 0.25 : Math.min(1.2, 0.5 + en * 0.4 + sp * 0.35);
    g += (tg - g) * Math.min(1, dt * 6);
    box.style.setProperty("--pulse", g.toFixed(3));
  })(last);
})();

/* ÍRIS 360°: sequência gerada a partir do vídeo dela girando. De frente por padrão;
   arrastar o dedo gira a ÍRIS; de tempos em tempos ela dá uma volta completa, como um holograma. */
(function () {
  const img = document.querySelector(".corebox .iris-av"); if (!img) return;
  const box = img.parentElement, N = 61, LOOP = 60, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frames = Array.from({ length: N }, (_, i) => { const im = new Image(); im.decoding = "async"; im.src = `assets/iris360/${String(i).padStart(2, "0")}.webp?v=1`; return im; });
  const cv = document.createElement("canvas"); cv.className = "iris-av iris-seq"; cv.setAttribute("aria-hidden", "true");
  let ready = false; frames[0].onload = () => { img.after(cv); img.style.visibility = "hidden"; ready = true; };
  let f = 0, target = 0, dragging = false, lastX = 0, idle = 0, nextTurn = 9, turning = false, last = performance.now();
  box.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; turning = false; idle = 0; });
  addEventListener("pointermove", e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; f -= dx * 0.14; target = f; idle = 0; }, { passive: true });
  addEventListener("pointerup", () => { if (!dragging) return; dragging = false; target = Math.round(f / LOOP) * LOOP; });
  (function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!ready || document.hidden || (typeof current !== "undefined" && current !== "inicio")) return;
    let mode = "idle"; try { mode = coreMode; } catch {}
    if (!dragging) {
      idle += dt;
      if (mode !== "idle") { turning = false; target = Math.round(f / LOOP) * LOOP; }
      else if (!reduce && !turning && idle > nextTurn) { turning = true; target = Math.round(f / LOOP) * LOOP + LOOP; }
      if (turning) { f += dt * 12; if (f >= target) { f = target; turning = false; idle = 0; nextTurn = 18 + Math.random() * 14; } }
      else f += (target - f) * Math.min(1, dt * 5);
    }
    const i = ((Math.round(f) % LOOP) + LOOP) % LOOP, im = frames[i].complete && frames[i].naturalWidth ? frames[i] : frames[0];
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (!W) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = cv.getContext("2d"); x.clearRect(0, 0, W, H); x.drawImage(im, 0, 0, W, H);
  })(last);
})();
