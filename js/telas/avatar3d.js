/* ÍRIS · avatar 3D vivo (modelo com expressões faciais ARKit + visemas).
   Pisca, respira, mexe os olhos e a cabeça, olha para o dedo/mouse, sorri, e mexe a boca quando fala.
   Modelo de exemplo do projeto TalkingHead (Ready Player Me, CC BY-NC 4.0), com pele, roupa e luz ajustadas ao visual da ÍRIS. */
(function () {
  const img = document.querySelector(".corebox .iris-av"); if (!img) return;
  const box = img.parentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  (async () => {
    try { if (!window.THREE) await load("js/vendor/three.r128.min.js"); if (!THREE.GLTFLoader) await load("js/vendor/GLTFLoader.r128.js"); } catch { return; }
    const T = THREE, cv = document.createElement("canvas"); cv.className = "iris-3d"; cv.setAttribute("aria-hidden", "true");
    let R; try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return; }
    R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(22, 1, 0.05, 20);
    scene.add(new T.HemisphereLight(0xfff1de, 0x2a1a10, 0.55));
    const key = new T.DirectionalLight(0xffe6c8, 1.5); key.position.set(0.9, 1.9, 2.2); scene.add(key);
    const rimL = new T.DirectionalLight(0xffa64a, 2.2); rimL.position.set(-1.6, 1.8, -1.2); scene.add(rimL);
    const rimR = new T.DirectionalLight(0xffc27a, 1.6); rimR.position.set(1.7, 1.5, -1.0); scene.add(rimR);
    const fill = new T.PointLight(0xffb060, 0.6, 3); fill.position.set(0, 1.2, 0.8); scene.add(fill);

    const gltf = await new Promise((res, rej) => new T.GLTFLoader().load("assets/iris3d.glb?v=1", res, undefined, rej)).catch(() => null);
    if (!gltf) return;
    const av = gltf.scene; scene.add(av);
    const morphs = [], bones = {};
    av.traverse(o => {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) {
        o.frustumCulled = false;
        if (/Glasses|Outfit_Bottom|Footwear/.test(o.name)) o.visible = false;
        if (o.morphTargetDictionary) morphs.push(o);
        const m = o.material;
        if (/Skin|Body/.test(m.name)) { m.color.setRGB(0.74, 0.54, 0.42); m.roughness = 0.62; }
        if (/Outfit_Top/.test(m.name)) { o.material = new T.MeshPhysicalMaterial({ color: 0x0e0a07, metalness: 0.25, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.2, normalMap: m.normalMap, emissive: 0x1a0d04, emissiveIntensity: 0.5 }); }
        if (/Hair/.test(m.name)) { m.color.setRGB(0.32, 0.22, 0.16); }
      }
    });
    const setM = (name, v) => { for (const o of morphs) { const i = o.morphTargetDictionary[name]; if (i != null) o.morphTargetInfluences[i] = v; } };
    // braços para baixo (o modelo vem em pose A) e ombros relaxados
    const rot = (n, x, y, z) => { const b = bones[n]; if (b) { b.rotation.x += x; b.rotation.y += y; b.rotation.z += z; } };
    
    av.updateMatrixWorld(true);
    const head = bones.Head, neck = bones.Neck, spine = bones.Spine2, eyeL = bones.LeftEye, eyeR = bones.RightEye;
    const base = {}; [head, neck, spine, eyeL, eyeR].forEach(b => { if (b) base[b.name] = b.rotation.clone(); });
    const hp = new T.Vector3(); head.getWorldPosition(hp);
    const tgt = new T.Vector3(0, hp.y - 0.04, 0);

    box.appendChild(cv); box.classList.add("av-3d");
    const size = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); };
    addEventListener("resize", size); size();
    cam.position.set(0, hp.y + 0.01, 1.3); cam.lookAt(tgt);

    // para onde ela olha
    let ax = 0, ay = 0, lastMove = -1e9, dragging = false;
    const aim = (x, y) => { const r = box.getBoundingClientRect(); ax = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width * 0.7))); ay = Math.max(-1, Math.min(1, (y - (r.top + r.height * 0.35)) / (r.height * 0.7))); lastMove = performance.now(); };
    box.addEventListener("pointerdown", e => { dragging = true; aim(e.clientX, e.clientY); });
    addEventListener("pointermove", e => { if (dragging || e.pointerType === "mouse") aim(e.clientX, e.clientY); }, { passive: true });
    addEventListener("pointerup", () => { dragging = false; });
    let nod = 0; box.addEventListener("click", () => { nod = 1; });

    // estado
    let lx = 0, ly = 0, blinkT = 0, nextBlink = 1.2, sacc = [0, 0], nextSacc = 0.8, smile = 0.3, jaw = 0, vis = {}, visT = 0, visCur = "viseme_aa", last = performance.now();
    const VIS = ["viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_PP", "viseme_FF", "viseme_SS", "viseme_nn", "viseme_DD", "viseme_kk", "viseme_CH", "viseme_RR"];
    const VISW = [5, 4, 3, 3, 2, 2, 2, 3, 2, 2, 1, 1, 2];
    const pickVis = () => { let s = VISW.reduce((a, b) => a + b, 0) * Math.random(); for (let i = 0; i < VIS.length; i++) { s -= VISW[i]; if (s <= 0) return VIS[i]; } return "viseme_aa"; };
    const noise = (t, a, b) => Math.sin(t * a) * 0.6 + Math.sin(t * b + 1.3) * 0.4;
    function loop(now){
      requestAnimationFrame(loop);
      if (document.hidden || (typeof current !== "undefined" && current !== "inicio") || box.classList.contains("diving")) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
      let mode = "idle", en = 0.18, sp = 0; try { mode = coreMode; en = energy; sp = spike; } catch {}
      const idle = now - lastMove > 3000 && !dragging;
      const gx = idle ? (reduce ? 0 : noise(t, 0.21, 0.53) * 0.25) : ax, gy = idle ? (reduce ? 0 : noise(t, 0.17, 0.41) * 0.12) : ay;
      lx += (gx - lx) * Math.min(1, dt * 3.5); ly += (gy - ly) * Math.min(1, dt * 3.5);
      nod = Math.max(0, nod - dt * 2);
      // cabeça, pescoço, respiração
      const thinking = mode === "think", listening = mode === "listen";
      const hx = ly * 0.22 + Math.sin(nod * Math.PI) * 0.12 + (thinking ? -0.05 : 0) + (reduce ? 0 : noise(t, 0.6, 1.1) * 0.012);
      const hy = lx * 0.38 + (thinking ? 0.12 : 0) + (reduce ? 0 : noise(t, 0.37, 0.9) * 0.02);
      const hz = (listening ? 0.07 : 0) + (reduce ? 0 : noise(t, 0.29, 0.7) * 0.025) - lx * 0.04;
      if (head) { head.rotation.set(base.Head.x + hx * 0.6, base.Head.y + hy * 0.6, base.Head.z + hz); }
      if (neck) { neck.rotation.set(base.Neck.x + hx * 0.4, base.Neck.y + hy * 0.4, base.Neck.z); }
      if (spine) spine.rotation.x = base.Spine2.x + (reduce ? 0 : Math.sin(t * 1.3) * 0.012);
      // olhos: olhar + pequenas sacadas
      nextSacc -= dt; if (nextSacc <= 0) { sacc = [(Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05]; nextSacc = 0.6 + Math.random() * 2.2; }
      const ex = (thinking ? -0.18 : ly * 0.15) + sacc[1], ey = (thinking ? 0.2 : lx * 0.3) + sacc[0];
      [eyeL, eyeR].forEach(e => { if (e) { e.rotation.x = base[e.name].x + ex; e.rotation.y = base[e.name].y + ey; } });
      // piscar
      nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0.15; nextBlink = 2 + Math.random() * 4 + (Math.random() < 0.15 ? -1.6 : 0); }
      let bl = 0; if (blinkT > 0) { blinkT -= dt; bl = Math.sin(Math.max(0, blinkT) / 0.15 * Math.PI); }
      setM("eyeBlinkLeft", bl); setM("eyeBlinkRight", bl);
      setM("eyeWideLeft", listening ? 0.25 : 0); setM("eyeWideRight", listening ? 0.25 : 0);
      setM("browInnerUp", listening ? 0.35 : thinking ? 0.2 : 0.05 + Math.max(0, noise(t, 0.3, 0.8)) * 0.08);
      setM("eyeSquintLeft", thinking ? 0.25 : 0.08); setM("eyeSquintRight", thinking ? 0.25 : 0.08);
      // sorriso e fala
      const speaking = mode === "speak";
      smile += ((speaking ? 0.22 : thinking ? 0.05 : 0.4) - smile) * Math.min(1, dt * 2);
      setM("mouthSmileLeft", smile); setM("mouthSmileRight", smile); setM("cheekSquintLeft", smile * 0.35); setM("cheekSquintRight", smile * 0.35);
      if (speaking) { visT -= dt; if (visT <= 0) { visCur = pickVis(); visT = 0.07 + Math.random() * 0.09; } }
      const amp = speaking ? Math.min(1, 0.45 + sp * 0.6) : 0;
      for (const v of VIS) { const to = v === visCur ? amp : 0; vis[v] = (vis[v] || 0) + (to - (vis[v] || 0)) * Math.min(1, dt * 22); setM(v, vis[v] * 0.85); }
      const jt = speaking ? (["viseme_aa", "viseme_O", "viseme_E"].includes(visCur) ? 0.22 : 0.08) * amp : 0; jaw += (jt - jaw) * Math.min(1, dt * 20); setM("jawOpen", jaw);
      box.style.setProperty("--pulse", Math.min(1.2, (mode === "idle" ? 0.25 : 0.5 + en * 0.4) + jaw).toFixed(3));
      R.render(scene, cam);
    }
    requestAnimationFrame(loop);
  })();
})();
