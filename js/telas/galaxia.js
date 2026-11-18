/* ÍRIS · galáxia perolada em movimento (referência: Andrômeda).
   O núcleo pulsa quando ela ouve, pensa ou fala. Arrastar gira; a pinça aproxima e, passando do limite, entra em Andrômeda (cosmos.js). */
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
    const sys = new T.Group(); sys.rotation.set(1.3, 0, -0.55); scene.add(sys);
    const gal = new T.Group(); gal.scale.setScalar(1.95); gal.rotation.x = -1.02; sys.add(gal);

    // ---- galáxia como na foto (Andrômeda): disco liso bem inclinado, faixas de poeira, bojo e duas satélites; cor pérola branca ----
    const N = innerWidth < 700 ? 42000 : 64000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N), ph = new Float32Array(N), rr = new Float32Array(N);
    const g = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const PEARL = [1, .985, .975], P_PINK = [1, .93, .95], P_LIL = [.95, .93, 1], P_BLUE = [.9, .95, 1], P_WARM = [1, .97, .92];
    const tint = r => { const k = Math.random(); return k < .5 ? PEARL : k < .68 ? P_PINK : k < .84 ? P_LIL : r > .55 ? P_BLUE : P_WARM; };
    const lane = r => { // faixas de poeira: menos estrelas nesses anéis
      const a = Math.exp(-Math.pow((r - 0.42) / 0.035, 2)) * 0.75, b = Math.exp(-Math.pow((r - 0.6) / 0.04, 2)) * 0.6, c = Math.exp(-Math.pow((r - 0.78) / 0.05, 2)) * 0.45; return 1 - Math.max(a, b, c); };
    let i = 0;
    while (i < N) {
      let x, y, z, c, s, r; const k = Math.random();
      if (k < 0.2) { r = Math.abs(g()) * 0.09; const a = Math.random() * 6.283; x = Math.cos(a) * r; z = Math.sin(a) * r; y = g() * r * 0.55; c = Math.random() < .7 ? PEARL : P_WARM; s = 1.4 + Math.random() * 2; }
      else if (k < 0.95) {
        r = Math.min(1.05, -Math.log(1 - Math.random() * 0.93) * 0.36 + 0.03);
        if (Math.random() > lane(r)) continue;
        const a = Math.random() * 6.283 + Math.sin(r * 9) * 0.25; x = Math.cos(a) * r; z = Math.sin(a) * r * 1.0; y = g() * 0.012 * (1.1 - r);
        c = tint(r); s = 0.7 + Math.random() * 1.3 * (1.05 - r * 0.6);
      } else {
        const m32 = Math.random() < 0.45, sat = m32 ? [0.05, 0.12, -0.42, 0.03] : [-0.75, -0.1, 0.62, 0.06];
        r = 1.2; const d = Math.abs(g()) * sat[3], a = Math.random() * 6.283; x = sat[0] + Math.cos(a) * d * (m32 ? 1 : 0.55); z = sat[2] + Math.sin(a) * d; y = sat[1] + g() * sat[3] * 0.3;
        c = PEARL; s = 1.0 + Math.random() * 1.1;
      }
      pos.set([x, y, z], i * 3); col.set(c, i * 3); siz[i] = s; ph[i] = Math.random() * 6.283; rr[i] = Math.hypot(x, z); i++;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
    geo.setAttribute("size", new T.BufferAttribute(siz, 1)); geo.setAttribute("phase", new T.BufferAttribute(ph, 1)); geo.setAttribute("rad", new T.BufferAttribute(rr, 1));
    const U = { uT: { value: 0 }, uPx: { value: R.getPixelRatio() }, uPulse: { value: 0.2 }, uSpin: { value: 0 } };
    const mat = new T.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float size;attribute float phase;attribute float rad;uniform float uT,uPx,uPulse,uSpin;varying vec3 vC;varying float vA;
        void main(){ vec3 p=position; float a=uSpin*(0.35/(rad+0.3)); float ca=cos(a),sa=sin(a); if(rad<1.1) p.xz=mat2(ca,-sa,sa,ca)*p.xz;
          vec4 mv=modelViewMatrix*vec4(p,1.); float tw=.8+.2*sin(uT*1.6+phase*3.);
          float core=smoothstep(.3,0.,rad); gl_PointSize=size*uPx*(1.+core*uPulse*1.4)*(3.0/-mv.z);
          vC=color*(tw*.95+core*uPulse*.8); vA=.45+.4*tw; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){ vec2 d=gl_PointCoord-.5; float r=dot(d,d); if(r>.25) discard; float a=exp(-r*14.)*vA; gl_FragColor=vec4(vC*a,a); }`
    });
    gal.add(new T.Points(geo, mat));
    // luz difusa do disco (o brilho leitoso da foto), no plano da galáxia
    const discTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); const gr = x.createRadialGradient(256, 256, 0, 256, 256, 256);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.08, "rgba(255,250,250,.85)"); gr.addColorStop(0.25, "rgba(246,240,250,.32)"); gr.addColorStop(0.42, "rgba(220,214,236,.10)"); gr.addColorStop(0.47, "rgba(120,110,140,.02)"); gr.addColorStop(0.62, "rgba(214,214,240,.07)"); gr.addColorStop(0.75, "rgba(200,206,236,.03)"); gr.addColorStop(1, "rgba(200,200,230,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 512, 512); return new T.CanvasTexture(c); })();
    const disc = new T.Mesh(new T.PlaneGeometry(2.3, 2.3), new T.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 1, side: T.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; gal.add(disc);
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,252,250,.7)"); gr.addColorStop(0.5, "rgba(240,236,248,.16)"); gr.addColorStop(1, "rgba(230,230,245,0)"); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c); })();
    const glowM = new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 });
    const glow = new T.Sprite(glowM); glow.scale.set(0.55, 0.55, 1); gal.add(glow);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.08 })); halo.scale.set(2.6, 2.6, 1); gal.add(halo);
    // estrelas de fundo
    const SN = 1600, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), d = 6 + Math.random() * 8; sp.set([Math.sin(b) * Math.cos(a) * d, Math.sin(b) * Math.sin(a) * d, Math.cos(b) * d - 4], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
    const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.026, transparent: true, opacity: 0.85, depthWrite: false })); scene.add(stars);

    box.append(cv); box.classList.add("gx-on");

    let baseZ = 4.2; try { nnSetZoom(1); } catch {}
    const size = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; baseZ = Math.max(3.6, 1.62 * 1.08 / (Math.tan(19 * Math.PI / 180) * cam.aspect)); cam.updateProjectionMatrix(); };
    addEventListener("resize", size); size();

    // arrastar gira o sistema
    let drag = false, lx = 0, ly = 0, yaw = 0, vy = 0, tilt = 0;
    box.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; });
    addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; vy = dx * 0.006; yaw += vy; tilt = Math.max(-0.35, Math.min(0.35, tilt + dy * 0.004)); }, { passive: true });
    addEventListener("pointerup", () => { drag = false; });

    let spin = 0, pulse = 0.2, last = performance.now();
    (function loop(now){
      requestAnimationFrame(loop);
      if (document.hidden || (typeof current !== "undefined" && current !== "inicio") || box.classList.contains("diving")) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
      let mode = "idle", en = 0.18, spk = 0; try { mode = coreMode; en = energy; spk = spike; } catch {}
      const tp = mode === "idle" ? 0.2 : Math.min(1.4, 0.55 + en * 0.5 + spk * 0.6); pulse += (tp - pulse) * Math.min(1, dt * 6);
      const speed = reduce ? 0 : (mode === "listen" ? 0.5 : mode === "think" ? 0.8 : 0.16);
      spin += dt * speed; U.uT.value = t; U.uSpin.value = spin; U.uPulse.value = pulse;
      if (!drag) { vy *= 0.94; yaw += vy; tilt *= 0.97; }
      sys.rotation.set(1.3 + tilt, yaw * 0.15, -0.55); gal.rotation.set(-1.02 + tilt * 0.3, yaw * 0.4, 0);
      glow.scale.setScalar(0.5 + pulse * 0.35); glowM.opacity = 0.75 + pulse * 0.2;
      stars.rotation.y = t * 0.004;
      let zz = 1; try { zz = nnZoom(); } catch {}
      cam.position.z = baseZ * 1.12 / Math.max(0.7, Math.min(1.3, zz));
      R.render(scene, cam);
    })(last);
  })();
})();
