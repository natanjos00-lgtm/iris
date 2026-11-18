/* ÍRIS · retrato vivo: o retrato vira um holograma 2.5D em WebGL.
   Profundidade estimada (cabeça e busto) para virar o rosto conforme o dedo ou o mouse,
   piscadas, respiração, boca acompanhando a voz quando ela fala, linhas da armadura pulsando com a energia. */
(function () {
  const img = document.querySelector(".corebox .iris-av"); if (!img) return;
  const box = img.parentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.createElement("canvas"); cv.className = "iris-av iris-live"; cv.setAttribute("aria-hidden", "true");
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true }); if (!gl) return;
  const VS = "attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}";
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D T;uniform vec2 S;uniform vec2 tilt;uniform float t,blink,jaw,glow,breath;
  float ell(vec2 p,vec2 c,vec2 r){vec2 q=(p-c)/r;return clamp(1.-dot(q,q),0.,1.);}
  void main(){
    vec2 p=v*S;
    float head=sqrt(ell(p,vec2(316.,212.),vec2(122.,170.)));
    float body=sqrt(ell(p,vec2(320.,560.),vec2(340.,250.)))*.55;
    float nose=ell(p,vec2(318.,232.),vec2(26.,40.))*.35;
    float d=max(head+nose,body);
    vec2 sp=p-tilt*d*vec2(15.,9.);
    sp.y=571.-(571.-sp.y)*(1.-breath*.007*smoothstep(300.,380.,p.y));
    float j=ell(p,vec2(317.,312.),vec2(60.,46.))*step(279.,p.y);
    sp.y-=jaw*10.*j;
    float m=ell(p,vec2(317.,282.+jaw*2.),vec2(36.,3.+jaw*7.));
    float e1=ell(p,vec2(277.,184.),vec2(27.,13.)),e2=ell(p,vec2(368.,190.),vec2(27.,13.));
    sp.y-=blink*11.*max(e1,e2)*smoothstep(-14.,4.,p.y-187.);
    vec4 c=texture2D(T,sp/S);
    c.rgb=mix(c.rgb,c.rgb*vec3(.35,.18,.2),m*jaw*.8);
    float org=smoothstep(.12,.35,c.r-c.b)*smoothstep(.55,.9,c.r)*step(330.,p.y);
    float pulse=.5+.5*sin(p.y*.045-t*2.4+p.x*.012);
    c.rgb+=vec3(1.,.66,.3)*org*(.12+.55*pulse*glow)*c.a;
    float band=exp(-pow((p.y-mod(t*70.,900.)+160.)/20.,2.));
    c.rgb+=vec3(1.,.82,.55)*band*.10*c.a;
    c.rgb*=.99+.01*sin(p.y*1.7+t*5.);
    gl_FragColor=vec4(c.rgb*c.a,c.a);
  }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  let prog; try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw 0; } catch { return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aL = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aL); gl.vertexAttribPointer(aL, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n), u = { S: U("S"), tilt: U("tilt"), t: U("t"), blink: U("blink"), jaw: U("jaw"), glow: U("glow"), breath: U("breath") };
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const tex = gl.createTexture(), pic = new Image();
  pic.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform2f(u.S, pic.naturalWidth, pic.naturalHeight);
    img.after(cv); img.style.visibility = "hidden"; box.classList.add("av-live"); size(); requestAnimationFrame(loop);
  };
  pic.src = img.currentSrc || img.src;

  function size(){ const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr); if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); } }
  addEventListener("resize", size);

  // para onde ela olha: dedo/mouse sobre a área dela (e o mouse na tela inteira no computador)
  let tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9, dragging = false;
  const aim = (x, y) => { const r = box.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width * 0.6))); ty = Math.max(-1, Math.min(1, (y - (r.top + r.height * 0.42)) / (r.height * 0.6))); lastMove = performance.now(); };
  box.addEventListener("pointerdown", e => { dragging = true; aim(e.clientX, e.clientY); });
  addEventListener("pointermove", e => { if (dragging || e.pointerType === "mouse") aim(e.clientX, e.clientY); }, { passive: true });
  addEventListener("pointerup", () => { dragging = false; });
  box.addEventListener("click", () => { nod = 1; });

  let nod = 0, blinkT = 0, nextBlink = 1.5, jawS = 0, glowS = 0.3, last = performance.now();
  function loop(now){
    requestAnimationFrame(loop);
    if (document.hidden || (typeof current !== "undefined" && current !== "inicio") || box.classList.contains("diving")) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    size();
    const idle = now - lastMove > 2500 && !dragging;
    const ix = reduce ? 0 : Math.sin(t * 0.33) * 0.32 + Math.sin(t * 0.81) * 0.08, iy = reduce ? 0 : Math.sin(t * 0.27) * 0.16;
    const gx = idle ? ix : tx, gy = idle ? iy : ty;
    cx += (gx - cx) * Math.min(1, dt * 4); cy += (gy - cy) * Math.min(1, dt * 4);
    nod = Math.max(0, nod - dt * 2.2);
    // piscar
    nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0.16; nextBlink = 2.5 + Math.random() * 4 + (Math.random() < 0.18 ? -2.2 : 0); }
    let blink = 0; if (blinkT > 0) { blinkT -= dt; blink = Math.sin(Math.max(0, blinkT) / 0.16 * Math.PI); }
    // boca e brilho com a voz
    let mode = "idle", en = 0.18, sp = 0; try { mode = coreMode; en = energy; sp = spike; } catch {}
    const jawT = mode === "speak" ? Math.min(1, 0.15 + sp * 0.75 + 0.35 * Math.abs(Math.sin(t * 9.5)) * Math.abs(Math.sin(t * 3.1))) : 0;
    jawS += (jawT - jawS) * Math.min(1, dt * 18);
    glowS += ((mode === "idle" ? 0.25 : 0.55 + en * 0.45) - glowS) * Math.min(1, dt * 3);
    box.style.setProperty("--pulse", (glowS + jawS * 0.4).toFixed(3));
    gl.uniform2f(u.tilt, cx, cy + Math.sin(nod * Math.PI) * 0.35);
    gl.uniform1f(u.t, t); gl.uniform1f(u.blink, blink); gl.uniform1f(u.jaw, jawS); gl.uniform1f(u.glow, glowS);
    gl.uniform1f(u.breath, reduce ? 0 : Math.sin(t * 1.25));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
})();
