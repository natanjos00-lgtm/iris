/* ÍRIS · galáxia perolada em movimento (referência: Andrômeda), com as áreas do app como planetas em órbita.
   A galáxia reage à ÍRIS: o núcleo pulsa quando ela ouve, pensa ou fala. Arrastar gira o sistema; tocar num planeta abre a área. */
(function () {
  const box = document.querySelector(".corebox"); if (!box) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PLANETS = [
    { r: "pessoal", n: "Pessoal", c: ["#FFF3F8", "#F4B9D3", "#B76A93"], o: 0, rad: 1.18, sp: 0.050, s: 1.0 },
    { r: "trabalho", n: "Trabalho", c: ["#F4F0FF", "#BBA9EC", "#6C57A8"], o: 1.3, rad: 1.18, sp: 0.050, s: 1.05 },
    { r: "faculdade", n: "Faculdade", c: ["#EEF6FF", "#A9C6F0", "#4F6FA6"], o: 2.6, rad: 1.18, sp: 0.050, s: 0.95 },
    { r: "casa", n: "Casa", c: ["#FFF6EE", "#F0C9A8", "#A86E4E"], o: 3.9, rad: 1.18, sp: 0.050, s: 1.0, ring: 1 },
    { r: "financeiro", n: "Finanças", c: ["#FFFBEF", "#EBD7A1", "#9C8240"], o: 5.1, rad: 1.18, sp: 0.050, s: 1.1 },
    { r: "moto", n: "Moto", c: ["#FFF0F6", "#E9A5C4", "#9E4D78"], o: 0.65, rad: 1.5, sp: -0.032, s: 0.9 },
    { r: "metas", n: "Metas", c: ["#F2FFF8", "#AEE3CB", "#4D8E73"], o: 2.75, rad: 1.5, sp: -0.032, s: 0.95 },
    { r: "projetos", n: "Projetos", c: ["#F6F1FF", "#C9B4F2", "#7A5BB8"], o: 4.85, rad: 1.5, sp: -0.032, s: 1.0, ring: 1 },
    { r: "biblioteca", n: "Biblioteca", c: ["#FFF7F0", "#E8C0B6", "#94615A"], o: 6.0, rad: 1.5, sp: -0.032, s: 0.85 }
  ];
  const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  (async () => {
    try { if (!window.THREE) await load("js/vendor/three.r128.min.js"); } catch { return; }
    const T = THREE, cv = document.createElement("canvas"); cv.className = "gx-canvas"; cv.setAttribute("aria-hidden", "true");
    let R; try { R = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: "low-power" }); } catch { return; }
    R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, 0.1, 50); cam.position.set(0, 0, 4.2);
    const sys = new T.Group(); sys.rotation.set(1.2, 0, -0.5); scene.add(sys);
    const gal = new T.Group(); sys.add(gal);

    // ---- galáxia: braços em espiral, bojo, poeira e satélites ----
    const N = innerWidth < 700 ? 34000 : 52000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N), ph = new Float32Array(N), rr = new Float32Array(N);
    const g = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const pal = [[1, .97, .95], [1, .86, .92], [.95, .74, .87], [.86, .76, .96], [.74, .78, .98], [1, .93, .86]];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < N; i++) {
      let x, y, z, c, s, r;
      const k = Math.random();
      if (k < 0.18) { // bojo
        r = Math.abs(g()) * 0.12; const a = Math.random() * 6.283, el = g() * 0.5;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = el * r * 0.7; c = mix(pal[0], pal[5], Math.random() * 0.6); s = 1.6 + Math.random() * 2.2;
      } else if (k < 0.93) { // disco e braços
        r = 0.08 + Math.pow(Math.random(), 0.75) * 0.95; const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const th = arm + Math.log(r / 0.06) / 0.32 + g() * (0.28 + 0.25 * (1 - r));
        x = Math.cos(th) * r + g() * 0.035 * r; z = Math.sin(th) * r + g() * 0.035 * r; y = g() * 0.022 * (1.2 - r);
        const t = Math.min(1, r / 1.0); c = t < 0.3 ? mix(pal[0], pal[1], t / 0.3) : t < 0.6 ? mix(pal[1], pal[2], (t - 0.3) / 0.3) : mix(pal[3], pal[4], (t - 0.6) / 0.4);
        if (Math.random() < 0.08) c = pal[0]; s = 0.8 + Math.random() * 1.6 * (1 - r * 0.5);
      } else { // satélites (como as galáxias anãs ao lado de Andrômeda)
        const sat = Math.random() < 0.6 ? [0.55, 0.0, -0.95, 0.07] : [-0.25, 0.05, 0.62, 0.05];
        x = sat[0] + g() * sat[3]; y = sat[1] + g() * sat[3] * 0.6; z = sat[2] + g() * sat[3]; r = 1.2; c = mix(pal[5], pal[1], Math.random() * 0.5); s = 1.0 + Math.random() * 1.2;
      }
      pos.set([x, y, z], i * 3); col.set(c, i * 3); siz[i] = s; ph[i] = Math.random() * 6.283; rr[i] = Math.hypot(x, z);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
    geo.setAttribute("size", new T.BufferAttribute(siz, 1)); geo.setAttribute("phase", new T.BufferAttribute(ph, 1)); geo.setAttribute("rad", new T.BufferAttribute(rr, 1));
    const U = { uT: { value: 0 }, uPx: { value: R.getPixelRatio() }, uPulse: { value: 0.2 }, uSpin: { value: 0 } };
    const mat = new T.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float size;attribute float phase;attribute float rad;uniform float uT,uPx,uPulse,uSpin;varying vec3 vC;varying float vA;
        void main(){ vec3 p=position; float a=uSpin*(0.55/(rad+0.25)); float ca=cos(a),sa=sin(a); if(rad<1.15) p.xz=mat2(ca,-sa,sa,ca)*p.xz;
          vec4 mv=modelViewMatrix*vec4(p,1.); float tw=.75+.25*sin(uT*1.7+phase*3.);
          float core=smoothstep(.35,0.,rad); gl_PointSize=size*uPx*(1.+core*uPulse*1.6)*(3.4/-mv.z);
          vC=color*(tw*1.25+core*uPulse*.9); vA=.55+.45*tw; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){ vec2 d=gl_PointCoord-.5; float r=dot(d,d); if(r>.25) discard; float a=exp(-r*14.)*vA; gl_FragColor=vec4(vC*a,a); }`
    });
    gal.add(new T.Points(geo, mat));
    // brilho do núcleo
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,250,248,1)"); gr.addColorStop(0.15, "rgba(255,226,238,.75)"); gr.addColorStop(0.45, "rgba(236,170,210,.22)"); gr.addColorStop(1, "rgba(200,150,220,0)"); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c); })();
    const glowM = new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 });
    const glow = new T.Sprite(glowM); glow.scale.set(1.1, 1.1, 1); gal.add(glow);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.18 })); halo.scale.set(3.2, 3.2, 1); gal.add(halo);
    // estrelas de fundo
    const SN = 900, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), d = 6 + Math.random() * 8; sp.set([Math.sin(b) * Math.cos(a) * d, Math.sin(b) * Math.sin(a) * d, Math.cos(b) * d - 4], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
    const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xf6eaf4, size: 0.028, transparent: true, opacity: 0.8, depthWrite: false })); scene.add(stars);

    // ---- órbitas e planetas (botões de verdade, acessíveis) ----
    [1.18, 1.5].forEach(rad => { const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * 6.283; pts.push(new T.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad)); } sys.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xf2d7e6, transparent: true, opacity: 0.22 }))); });
    const layer = document.createElement("div"); layer.className = "gx-planets"; layer.setAttribute("role", "navigation"); layer.setAttribute("aria-label", "Áreas da ÍRIS");
    layer.innerHTML = PLANETS.map((p, i) => `<a class="gx-pl${p.ring ? " ring" : ""}" href="#${p.r}" data-i="${i}" style="--c1:${p.c[0]};--c2:${p.c[1]};--c3:${p.c[2]};--s:${p.s}"><span class="gx-orb" aria-hidden="true"></span><span class="gx-name">${p.n}</span></a>`).join("");
    box.append(cv, layer); box.classList.add("gx-on");
    const pl = [...layer.children];

    const size = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.position.z = Math.max(3.6, 1.62 * 1.08 / (Math.tan(19 * Math.PI / 180) * cam.aspect)); cam.updateProjectionMatrix(); };
    addEventListener("resize", size); size();

    // arrastar gira o sistema
    let drag = false, lx = 0, ly = 0, yaw = 0, vy = 0, tilt = 0;
    box.addEventListener("pointerdown", e => { if (e.target.closest(".gx-pl")) return; drag = true; lx = e.clientX; ly = e.clientY; });
    addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; vy = dx * 0.006; yaw += vy; tilt = Math.max(-0.35, Math.min(0.35, tilt + dy * 0.004)); }, { passive: true });
    addEventListener("pointerup", () => { drag = false; });

    let spin = 0, pulse = 0.2, last = performance.now(); const v3 = new T.Vector3(), wp = new T.Vector3();
    (function loop(now){
      requestAnimationFrame(loop);
      if (document.hidden || (typeof current !== "undefined" && current !== "inicio") || box.classList.contains("diving")) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
      let mode = "idle", en = 0.18, spk = 0; try { mode = coreMode; en = energy; spk = spike; } catch {}
      const tp = mode === "idle" ? 0.2 : Math.min(1.4, 0.55 + en * 0.5 + spk * 0.6); pulse += (tp - pulse) * Math.min(1, dt * 6);
      const speed = reduce ? 0 : (mode === "listen" ? 0.5 : mode === "think" ? 0.8 : 0.16);
      spin += dt * speed; U.uT.value = t; U.uSpin.value = spin; U.uPulse.value = pulse;
      if (!drag) { vy *= 0.94; yaw += vy; tilt *= 0.97; }
      sys.rotation.set(1.2 + tilt, yaw * 0.25, -0.5); gal.rotation.y = yaw;
      glow.scale.setScalar(0.9 + pulse * 0.6); glowM.opacity = 0.75 + pulse * 0.2;
      stars.rotation.y = t * 0.004;
      R.render(scene, cam);
      const W = cv.clientWidth, H = cv.clientHeight, ox = cv.offsetLeft, oy = cv.offsetTop;
      PLANETS.forEach((p, i) => {
        const a = p.o + (reduce ? 0 : t * p.sp) + yaw;
        v3.set(Math.cos(a) * p.rad, 0, Math.sin(a) * p.rad); wp.copy(v3); sys.localToWorld(wp);
        const depth = wp.z; v3.copy(wp).project(cam);
        const x = ox + (v3.x * 0.5 + 0.5) * W, y = oy + (-v3.y * 0.5 + 0.5) * H, k = 0.78 + 0.22 * Math.max(-1, Math.min(1, depth / 1.4));
        const el = pl[i]; el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(k * p.s).toFixed(3)})`;
        el.style.zIndex = depth > 0 ? 6 : 2; el.classList.toggle("back", depth < -0.2); el.style.opacity = (0.55 + 0.45 * (k - 0.56) / 0.44).toFixed(2);
      });
    })(last);
  })();
})();
