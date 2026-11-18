/* ÍRIS · dentro de Andrômeda.
   A pinça (ou "Entrar") leva para dentro da galáxia: estrelas, núcleo e poeira em volta, e as áreas como planetas 3D
   em distâncias diferentes. Planetas são desenhados por shader (ruído 3D procedural), então ficam nítidos em qualquer zoom.
   Tocar num planeta voa até ele; arrastar gira; pinça aproxima; "Abrir" leva para a área. */
const CX_HOME = [0, 0.8, 30];
const around = (a, d, y) => [CX_HOME[0] + Math.sin(Math.PI + a) * d, CX_HOME[1] + y, CX_HOME[2] + Math.cos(Math.PI + a) * d];
const CX_PLANETS = [
  { k: "pessoal",    type: 2, r: 1.15, pos: around(0.35, 7, 0.8), seed: 1.7, c: ["#2E5F7E", "#5E93B4", "#E9D9CB", "#C59E8E"], atm: "#BFD9FF" },
  { k: "trabalho",   type: 1, r: 1.35, pos: around(-0.6, 10, -1.2), seed: 4.2, c: ["#4A4166", "#8B80A9", "#CFC6E6", "#F2EEFA"], atm: "#D8CFF5" },
  { k: "faculdade",  type: 3, r: 0.95, pos: around(1.2, 6, 1.6), seed: 7.9, c: ["#5D7FB8", "#A9C6F0", "#E3EEFF", "#FFFFFF"], atm: "#CFE4FF" },
  { k: "casa",       type: 0, r: 1.9,  pos: around(-1.5, 14, 2.5),  seed: 2.3, c: ["#A77E62", "#D9B99B", "#F3E6D6", "#FFF8EF"], atm: "#FFE6CC", ring: [1.45, 2.3, "#F1DECB"] },
  { k: "financeiro", type: 0, r: 2.6,  pos: around(2.2, 16, -2), seed: 5.5, c: ["#A8873F", "#E3C98A", "#FBF3DC", "#FFFFFF"], atm: "#FFF0C8", storm: 1 },
  { k: "moto",       type: 0, r: 1.05, pos: around(0.9, 4.5, -0.6),  seed: 8.8, c: ["#B0627F", "#EFA9C8", "#FFE6F0", "#FFFFFF"], atm: "#FFD0E4" },
  { k: "metas",      type: 2, r: 1.25, pos: around(-2.4, 9, 1.2),  seed: 3.1, c: ["#1F5E57", "#3F8C80", "#D7EEDF", "#9CCBB2"], atm: "#C8FFEA" },
  { k: "projetos",   type: 1, r: 1.6,  pos: around(2.9, 12, -2.5), seed: 6.4, c: ["#5B4885", "#9D86C7", "#D9CBE9", "#F6F0FF"], atm: "#E1D2FF", ring: [1.35, 2.0, "#DCCFF2"] },
  { k: "biblioteca", type: 1, r: 1.0,  pos: around(-0.15, 18, -0.4), seed: 9.6, c: ["#6E4B3C", "#B98C72", "#E8D2C0", "#FFF4EA"], atm: "#FFE2CC" }
];
const CX = { open: false, built: false };

function cosmosOpen(){
  try { nnSetZoom(1); nnSaveZoom(); } catch {}
  if (CX.open) return;
  const load = src => new Promise((res, rej) => { if (src.includes("three") && window.THREE) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  load("js/vendor/three.r128.min.js").then(() => { if (!CX.built) cosmosBuild(); CX.enter(); }).catch(() => {});
}

function cosmosBuild(){
  CX.built = true;
  const T = THREE, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = document.createElement("div"); el.id = "cosmos"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Dentro de Andrômeda");
  el.innerHTML = `<canvas class="cx-c" aria-hidden="true"></canvas><div class="cx-labels" aria-hidden="true"></div>
    <div class="cx-top"><span class="cx-t">Andrômeda</span><button type="button" class="cx-x" aria-label="Sair de Andrômeda">×</button></div>
    <p class="cx-hint">Arraste para olhar em volta · toque num planeta</p>
    <nav class="cx-list" aria-label="Planetas">${CX_PLANETS.map((p, i) => `<button type="button" data-i="${i}">${nnLabel(p.k)}</button>`).join("")}</nav>
    <section class="cx-info" hidden aria-live="polite"><small>Planeta</small><h2></h2><p class="cx-sub"></p><p class="cx-st"></p>
      <div class="cx-btns"><button type="button" class="btn olive cx-open">Abrir</button><button type="button" class="btn ghost cx-back">Voltar</button></div></section>`;
  document.body.appendChild(el);
  const cv = el.querySelector(".cx-c"), labels = el.querySelector(".cx-labels"), info = el.querySelector(".cx-info");
  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(innerWidth < 700 ? 1.6 : 2, devicePixelRatio || 1)); R.setClearColor(0x040208, 1); R.outputEncoding = T.sRGBEncoding;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(55, 1, 0.02, 600);
  const g = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // ---- Andrômeda por dentro: disco de estrelas (a câmera fica dentro dele), bojo, faixas de poeira ----
  const N = innerWidth < 700 ? 26000 : 60000, P = new Float32Array(N * 3), C = new Float32Array(N * 3), S = new Float32Array(N), PH = new Float32Array(N);
  const tints = [[1, .985, .975], [1, .93, .95], [.95, .93, 1], [.9, .95, 1], [1, .97, .92]];
  let i = 0;
  while (i < N) {
    const k = Math.random(); let x, y, z, s, c;
    if (k < 0.12) { const r = Math.abs(g()) * 3.2, a = Math.random() * 6.283; x = Math.cos(a) * r; z = Math.sin(a) * r; y = g() * r * 0.5; s = 1.4 + Math.random() * 2.4; c = Math.random() < .7 ? tints[0] : tints[4]; }
    else {
      const r = Math.min(110, -Math.log(1 - Math.random() * 0.98) * 26 + 1.5);
      const lane = 1 - Math.max(Math.exp(-Math.pow((r - 14) / 1.6, 2)) * .75, Math.exp(-Math.pow((r - 22) / 2, 2)) * .6, Math.exp(-Math.pow((r - 34) / 2.6, 2)) * .5);
      if (Math.random() > lane) continue;
      const a = Math.random() * 6.283 + Math.sin(r * .3) * .3; x = Math.cos(a) * r; z = Math.sin(a) * r; y = g() * (0.35 + r * 0.03);
      s = 0.6 + Math.random() * 1.6; c = tints[Math.floor(Math.random() * tints.length)];
    }
    P.set([x, y, z], i * 3); C.set(c, i * 3); S[i] = s; PH[i] = Math.random() * 6.283; i++;
  }
  const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(P, 3)); sg.setAttribute("color", new T.BufferAttribute(C, 3)); sg.setAttribute("size", new T.BufferAttribute(S, 1)); sg.setAttribute("phase", new T.BufferAttribute(PH, 1));
  const UT = { value: 0 }, UPX = { value: R.getPixelRatio() };
  const starM = new T.ShaderMaterial({ uniforms: { uT: UT, uPx: UPX }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
    vertexShader: `attribute float size;attribute float phase;uniform float uT,uPx;varying vec3 vC;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);float tw=.78+.22*sin(uT*1.5+phase*3.);gl_PointSize=clamp(size*uPx*(26./-mv.z),.6,uPx*4.);vC=color*tw;vA=clamp(18./-mv.z,.25,1.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d);if(r>.25)discard;float a=exp(-r*16.)*vA;gl_FragColor=vec4(vC*a,a);}` });
  scene.add(new T.Points(sg, starM));
  // céu distante
  const FN = 4000, FP = new Float32Array(FN * 3); for (let j = 0; j < FN; j++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), d = 400; FP.set([Math.sin(b) * Math.cos(a) * d, Math.cos(b) * d, Math.sin(b) * Math.sin(a) * d], j * 3); }
  const fg = new T.BufferGeometry(); fg.setAttribute("position", new T.BufferAttribute(FP, 3));
  scene.add(new T.Points(fg, new T.PointsMaterial({ color: 0xfff6fb, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false })));
  // núcleo e nebulosas
  const soft = (stops, n = 256) => { const c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d"); const gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); stops.forEach(s => gr.addColorStop(s[0], s[1])); x.fillStyle = gr; x.fillRect(0, 0, n, n); return new T.CanvasTexture(c); };
  const coreTex = soft([[0, "rgba(255,255,255,1)"], [.12, "rgba(255,250,248,.8)"], [.4, "rgba(240,232,248,.2)"], [1, "rgba(230,225,245,0)"]]);
  const core = new T.Sprite(new T.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); core.scale.set(26, 26, 1); scene.add(core);
  const coreH = new T.Sprite(new T.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .25 })); coreH.scale.set(90, 90, 1); /* halo grande removido: pesava na tela inteira */
  const nebTex = (() => { const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d"); for (let j = 0; j < 40; j++) { const px = n / 2 + g() * n * .14, py = n / 2 + g() * n * .14, rr = n * (.08 + Math.random() * .2), gr = x.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, "rgba(255,255,255,.10)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, n, n); } return new T.CanvasTexture(c); })();
  const nebC = [0xf6d8ea, 0xdcd2f6, 0xd6e4fa, 0xfff0f4];
  for (let j = 0; j < 10; j++) { const a = Math.random() * 6.283, r = 40 + Math.random() * 50; const s = new T.Sprite(new T.SpriteMaterial({ map: nebTex, color: nebC[j % 4], transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .12 + Math.random() * .14 })); s.position.set(Math.cos(a) * r, g() * 3, Math.sin(a) * r); const sc = 30 + Math.random() * 40; s.scale.set(sc, sc * .6, 1); scene.add(s); }

  // ---- planetas procedurais ----
  const NOISE = `vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  float fbm(vec3 p,int o){float a=.5,s=0.;for(int i=0;i<9;i++){if(i>=o)break;s+=a*sn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
  float ridged(vec3 p,int o){float a=.5,s=0.;for(int i=0;i<8;i++){if(i>=o)break;s+=a*(1.-abs(sn(p)));p=p*2.1+vec3(4.3,1.1,7.7);a*=.5;}return s;}`;
  const planetVS = `varying vec3 vN;varying vec3 vP;void main(){vN=normal;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  /* textura procedural "assada" uma vez por planeta (cor, relevo/rugosidade, nuvens); por quadro só se lê a textura */
  const bakeVS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  const bakeFS = `precision highp float;uniform int uType,uMode;uniform vec3 c0,c1,c2,c3;uniform float uSeed,uStorm;varying vec2 vUv;${NOISE}
  float H(vec3 n){int o=8;
    if(uType==0){return 0.;}
    if(uType==1){float h=fbm(n*2.2+uSeed,o);float cr=0.;for(int k=0;k<3;k++){float s=pow(2.,float(k));float c=sn(n*(3.5*s)+uSeed*7.+float(k)*3.);cr+=smoothstep(.55,.75,c)*(.6/s)-smoothstep(.75,.95,c)*(.9/s);}return h*.6+cr*.35;}
    if(uType==2){return fbm(n*1.6+uSeed,o);}
    return ridged(n*2.6+uSeed,7)*.5;}
  vec3 albedo(vec3 n,float h){
    if(uType==0){float lat=n.y;float w=fbm(n*vec3(2.,7.,2.)+uSeed,8);float b=sin(lat*14.+w*3.2+uSeed);float b2=sin(lat*37.+w*5.);float b3=fbm(n*vec3(3.,30.,3.)+uSeed*2.,6);
      vec3 col=mix(c0,c1,smoothstep(-1.,1.,b));col=mix(col,c2,smoothstep(.2,1.,b2)*.55);col=mix(col,c3,smoothstep(.6,1.,b)*.35);col*=.92+.16*b3;
      if(uStorm>0.){vec3 sc=normalize(vec3(.75,-.28,.6));float d=distance(n,sc);float sw=fbm(n*9.+uSeed,6);col=mix(col,mix(c1,c3,.6),smoothstep(.2,.05,d+sw*.06)*.85);}
      return col;}
    if(uType==1){vec3 col=mix(c0,c1,smoothstep(-.4,.3,h));col=mix(col,c2,smoothstep(.2,.6,h));col=mix(col,c3,smoothstep(.55,.8,h)*.6);return col*(.85+.15*sn(n*40.+uSeed));}
    if(uType==2){float land=smoothstep(.03,.08,h);vec3 sea=mix(c0,c1,smoothstep(-.5,.05,h));vec3 ld=mix(c2,c3,smoothstep(.1,.5,h));ld=mix(ld,vec3(1.),smoothstep(.75,.9,abs(n.y)));return mix(sea,ld,land);}
    float cr=smoothstep(.42,.5,h);vec3 col=mix(c2,c3,smoothstep(.2,.45,h));col=mix(col,c0,cr*.7);col=mix(col,c1,smoothstep(.0,.25,sn(n*5.+uSeed))*.3);return col;}
  void main(){float th=3.14159265*(1.-vUv.y),ph=6.2831853*vUv.x;vec3 n=vec3(-cos(ph)*sin(th),cos(th),sin(ph)*sin(th));
    float h=H(n);
    if(uMode==0){gl_FragColor=vec4(albedo(n,h),1.);return;}
    if(uMode==1){float r=uType==2?mix(.28,.92,smoothstep(.03,.08,h)):uType==3?.45:uType==0?.75:.92;float hh=uType==2?max(h,.04):h;gl_FragColor=vec4(hh*.5+.5,r,0.,1.);return;}
    float cl=smoothstep(.05,.55,fbm(n*2.6+uSeed*3.,8));gl_FragColor=vec4(1.,1.,1.,cl*.9);}`;
  const bakeCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), bakeScene = new T.Scene(), bakeQuad = new T.Mesh(new T.PlaneGeometry(2, 2)); bakeScene.add(bakeQuad);
  function bake(p, mode, w){
    const rt = new T.WebGLRenderTarget(w, w / 2, { minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, generateMipmaps: true, wrapS: T.RepeatWrapping, depthBuffer: false });
    bakeQuad.material = new T.ShaderMaterial({ vertexShader: bakeVS, fragmentShader: bakeFS, uniforms: { uType: { value: p.type }, uMode: { value: mode }, c0: { value: col(p.c[0]) }, c1: { value: col(p.c[1]) }, c2: { value: col(p.c[2]) }, c3: { value: col(p.c[3]) }, uSeed: { value: p.seed }, uStorm: { value: p.storm || 0 } }, depthTest: false, transparent: mode === 2 });
    const old = R.getRenderTarget(); R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(bakeScene, bakeCam); R.setRenderTarget(old); R.setClearColor(0x040208, 1);
    bakeQuad.material.dispose(); rt.texture.anisotropy = R.capabilities.getMaxAnisotropy(); return rt;
  }
  const atmFS = `uniform vec3 uAtm,uL,uV;varying vec3 vN;varying vec3 vP;void main(){vec3 n=normalize(vN);vec3 V=normalize(uV-vP);float f=pow(1.-abs(dot(n,V)),2.6);float l=smoothstep(-.4,.7,dot(n,normalize(uL)));gl_FragColor=vec4(uAtm*f*l*1.3,f*l);}`;
  const ringFS = `uniform vec3 uCol,uL;uniform float uIn,uOut,uSeed;varying vec3 vP;${NOISE}void main(){float r=length(vP.xy);float t=(r-uIn)/(uOut-uIn);if(t<0.||t>1.)discard;float b=.55+.45*sn(vec3(t*38.+uSeed,0.,0.))*.8+.25*sn(vec3(t*120.,uSeed,0.));float gap=smoothstep(.0,.02,abs(t-.62)-.02);float a=b*gap*smoothstep(0.,.06,t)*smoothstep(1.,.9,t)*.85;gl_FragColor=vec4(uCol*(.35+.65*b),a);}`;
  const ringVS = `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const col = h => new T.Color(h).convertSRGBToLinear();
  const sun = new T.PointLight(0xfff6f0, 1.7, 0, 0); sun.position.set(0, 0, 0); scene.add(sun); scene.add(new T.AmbientLight(0xe8e0f4, 0.16)); const fill = new T.DirectionalLight(0xd8d0ff, 0.12); scene.add(fill);
  const LDIR = new T.Vector3(0, 0, 0), tmp = new T.Vector3(), inv = new T.Matrix4();
  const planets = CX_PLANETS.map((p, idx) => {
    const grp = new T.Group(); grp.position.set(...p.pos); grp.rotation.z = (Math.random() - .5) * .5; scene.add(grp);
    const U = { uAtm: { value: col(p.atm) }, uL: { value: new T.Vector3() } };
    const W0 = innerWidth < 700 ? 1024 : 2048, rtA = bake(p, 0, W0), rtH = p.type === 0 ? null : bake(p, 1, W0);
    const mat = new T.MeshStandardMaterial({ map: rtA.texture, roughness: p.type === 0 ? .75 : 1, metalness: 0 });
    if (rtH) { mat.bumpMap = rtH.texture; mat.bumpScale = p.type === 2 ? .012 : p.type === 3 ? .01 : .028; mat.roughnessMap = rtH.texture; }
    const body = new T.Mesh(new T.SphereGeometry(p.r, 128, 96), mat);
    let clouds = null; if (p.type === 2) { const rtC = bake(p, 2, W0); clouds = new T.Mesh(new T.SphereGeometry(p.r * 1.012, 96, 72), new T.MeshStandardMaterial({ map: rtC.texture, transparent: true, depthWrite: false, roughness: 1 })); grp.add(clouds); }
    body.userData.i = idx; grp.add(body);
    const atmU = { uAtm: U.uAtm, uL: U.uL, uV: { value: new T.Vector3() } };
    const atm = new T.Mesh(new T.SphereGeometry(p.r * 1.045, 64, 48), new T.ShaderMaterial({ uniforms: atmU, vertexShader: planetVS, fragmentShader: atmFS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide }));
    grp.add(atm);
    let ring = null;
    if (p.ring) { const rU = { uCol: { value: col(p.ring[2]) }, uL: U.uL, uIn: { value: p.r * p.ring[0] }, uOut: { value: p.r * p.ring[1] }, uSeed: { value: p.seed } };
      ring = new T.Mesh(new T.RingGeometry(p.r * p.ring[0], p.r * p.ring[1], 256, 1), new T.ShaderMaterial({ uniforms: rU, vertexShader: ringVS, fragmentShader: ringFS, transparent: true, depthWrite: false, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2 + 0.35; grp.add(ring); }
    const lab = document.createElement("span"); lab.className = "cx-lab"; lab.textContent = nnLabel(p.k); labels.appendChild(lab);
    return { p, grp, body, clouds, atm, U, atmU, ring, lab, spin: 0.04 + Math.random() * 0.06 };
  });

  // ---- câmera: livre (olhar em volta) ou focada num planeta ----
  const HOME = new T.Vector3(...CX_HOME);
  const st = { mode: "free", yaw: Math.PI, pitch: -0.02, focus: -1, oy: 0.6, op: 0.15, dist: 4, tw: null, idle: 0, fov: 55 };
  const dirOf = (yaw, pitch) => new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const focusPose = i => { const pl = planets[i]; const c = pl.grp.position, d = st.dist; return { pos: new T.Vector3(c.x + Math.sin(st.oy) * Math.cos(st.op) * d, c.y + Math.sin(st.op) * d, c.z + Math.cos(st.oy) * Math.cos(st.op) * d), look: c.clone().add(new T.Vector3(0, -planets[i].p.r * 0.75, 0)) }; };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curLook = new T.Vector3();
  function tween(toPos, toLook, dur, done){ st.tw = { a: cam.position.clone(), b: toPos, la: curLook.clone(), lb: toLook, t: 0, dur, done }; }
  function focus(i){
    const pl = planets[i]; st.focus = i; st.dist = pl.p.r * 3.4 * Math.max(1, 0.8 / cam.aspect);
    if (!pl.hd && innerWidth < 700) { pl.hd = true; const m = pl.body.material, oa = m.map, oh = m.bumpMap; m.map = bake(pl.p, 0, 2048).texture; if (pl.p.type !== 0) { const h = bake(pl.p, 1, 2048).texture; m.bumpMap = h; m.roughnessMap = h; } m.needsUpdate = true; oa && oa.dispose(); oh && oh.dispose(); }
    tmp.copy(pl.grp.position).negate().normalize(); st.oy = Math.atan2(tmp.x, tmp.z) + 1.05; st.op = 0.18;
    const f = focusPose(i); st.mode = "tween"; tween(f.pos, f.look, 1.6, () => { st.mode = "focus"; });
    info.hidden = false; info.querySelector("h2").textContent = nnLabel(pl.p.k);
    info.querySelector(".cx-sub").textContent = (AREAS[pl.p.k] && AREAS[pl.p.k].sub) || (pl.p.k === "moto" ? "Sua Lead 110" : pl.p.k === "financeiro" ? "Dinheiro, metas e parcelas" : "");
    let s = ""; try { if (pl.p.k === "moto") { const F = motoFuel(); s = F.level != null ? `Tanque: ${F.level.toFixed(1).replace(".", ",")} L` : "Garagem"; } else s = nnInfo(pl.p.k); } catch {}
    info.querySelector(".cx-st").textContent = s; el.classList.add("focused");
  }
  function unfocus(){
    if (st.focus < 0) return; const pl = planets[st.focus]; info.hidden = true; el.classList.remove("focused");
    const back = HOME.clone(); tmp.copy(pl.grp.position).sub(back).normalize(); st.yaw = Math.atan2(tmp.x, tmp.z); st.pitch = Math.asin(tmp.y);
    st.mode = "tween"; tween(back, back.clone().add(dirOf(st.yaw, st.pitch)), 1.4, () => { st.mode = "free"; st.focus = -1; });
  }
  CX.enter = () => {
    el.hidden = false; document.documentElement.classList.add("cx-lock"); CX.open = true; resize();
    cam.position.set(0, 60, 120); curLook.set(0, 0, 0); cam.lookAt(curLook); st.yaw = Math.PI; st.pitch = -0.02; st.focus = -1; info.hidden = true; el.classList.remove("focused");
    st.mode = "tween"; tween(HOME.clone(), HOME.clone().add(dirOf(st.yaw, st.pitch)), reduce ? .01 : 2.6, () => { st.mode = "free"; });
    requestAnimationFrame(t => { el.classList.add("in"); }); last = performance.now(); if (!CX.run) { CX.run = true; requestAnimationFrame(loop); }
    setTimeout(() => el.querySelector(".cx-x").focus(), 50);
  };
  function exit(){ el.classList.remove("in"); CX.open = false; document.documentElement.classList.remove("cx-lock"); setTimeout(() => { el.hidden = true; }, 450); try { $("core").focus(); } catch {} }
  CX.exit = exit; CX.dbg = { scene, planets, R };
  el.querySelector(".cx-x").addEventListener("click", exit);
  el.querySelector(".cx-back").addEventListener("click", unfocus);
  el.querySelector(".cx-open").addEventListener("click", () => { const k = planets[st.focus].p.k; exit(); location.hash = "#" + k; });
  el.querySelectorAll(".cx-list button").forEach(b => b.addEventListener("click", () => focus(+b.dataset.i)));
  el.addEventListener("keydown", e => { if (e.key === "Escape") { st.focus >= 0 ? unfocus() : exit(); } });

  // gestos
  const ptrs = new Map(); let pinch0 = 0, val0 = 0, downAt = null; const ray = new T.Raycaster(), ndc = new T.Vector2();
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); st.idle = 0; downAt = ptrs.size === 1 ? [e.clientX, e.clientY, performance.now()] : null;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); val0 = st.mode === "focus" ? st.dist : st.fov; } });
  cv.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return; const pv = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); st.idle = 0;
    if (ptrs.size === 1) { const dx = e.clientX - pv[0], dy = e.clientY - pv[1];
      if (st.mode === "focus") { st.oy -= dx * 0.008; st.op = Math.max(-1.2, Math.min(1.2, st.op + dy * 0.005)); }
      else if (st.mode === "free") { st.yaw += dx * 0.0035; st.pitch = Math.max(-1.2, Math.min(1.2, st.pitch + dy * 0.003)); } }
    else if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const k = pinch0 / Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (st.mode === "focus") { const r = planets[st.focus].p.r; st.dist = Math.max(r * 1.35, Math.min(r * 14, val0 * k)); if (val0 * k > r * 14.5) { pinch0 = 0; unfocus(); } }
      else if (st.mode === "free") { st.fov = Math.max(18, Math.min(75, val0 * k)); if (val0 * k > 82) { pinch0 = 0; exit(); } } }
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8 && performance.now() - downAt[2] < 400 && st.mode === "free") {
      const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(planets.map(p => p.body))[0]; if (hit) focus(hit.object.userData.i);
      else { // toque perto de um rótulo
        let best = -1, bd = 40; planets.forEach((pl, i) => { if (pl.lab.style.opacity === "0") return; const lr = pl.lab.getBoundingClientRect(); const d = Math.hypot(e.clientX - (lr.left + lr.width / 2), e.clientY - (lr.top + lr.height / 2)); if (d < bd) { bd = d; best = i; } }); if (best >= 0) focus(best); }
    }
    downAt = null;
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); downAt = null; });
  cv.addEventListener("wheel", e => { e.preventDefault(); st.idle = 0; if (st.mode === "focus") { const r = planets[st.focus].p.r; st.dist = Math.max(r * 1.35, Math.min(r * 14, st.dist * (1 + e.deltaY * .001))); } else if (st.mode === "free") st.fov = Math.max(18, Math.min(75, st.fov * (1 + e.deltaY * .001))); }, { passive: false });

  function resize(){ const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener("resize", () => { if (CX.open) resize(); });

  let last = performance.now(), fa = 0.016, fc = 0;
  function loop(now){
    if (!CX.open && !el.classList.contains("in")) { if (el.hidden) { CX.run = false; return; } }
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000; UT.value = t; st.idle += dt;
    if (st.mode === "tween" && st.tw) { const w = st.tw; w.t += dt / w.dur; const k = ease(Math.min(1, w.t)); cam.position.lerpVectors(w.a, w.b, k); curLook.lerpVectors(w.la, w.lb, k); if (w.t >= 1) { st.tw = null; w.done && w.done(); } }
    else if (st.mode === "free") { if (!reduce && st.idle > 4) st.yaw += dt * 0.02; cam.position.copy(HOME); curLook.copy(HOME).add(dirOf(st.yaw, st.pitch)); }
    else if (st.mode === "focus") { if (!reduce && st.idle > 4) st.oy += dt * 0.05; const f = focusPose(st.focus); cam.position.copy(f.pos); curLook.copy(f.look); }
    fill.position.copy(cam.position);
    cam.fov += ((st.mode === "free" ? st.fov : 50) - cam.fov) * Math.min(1, dt * 6); cam.updateProjectionMatrix(); cam.lookAt(curLook);
    const W = innerWidth, Hh = innerHeight;
    planets.forEach((pl, i) => {
      if (!reduce) { pl.body.rotation.y += dt * pl.spin; if (pl.clouds) pl.clouds.rotation.y += dt * pl.spin * 1.25; }
      pl.atm.updateMatrixWorld(); inv.copy(pl.atm.matrixWorld).invert();
      tmp.copy(LDIR).applyMatrix4(inv); pl.U.uL.value.copy(tmp).normalize();
      tmp.copy(cam.position).applyMatrix4(inv); pl.atmU.uV.value.copy(tmp);
      tmp.copy(pl.grp.position); tmp.y += pl.p.r * 1.25; tmp.project(cam);
      const vis = tmp.z < 1 && st.mode !== "focus" && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      pl.lab.style.opacity = vis ? "1" : "0"; if (vis) pl.lab.style.transform = `translate(${((tmp.x * .5 + .5) * W).toFixed(1)}px,${((-tmp.y * .5 + .5) * Hh).toFixed(1)}px)`;
    });
    R.render(scene, cam);
    // resolução adaptativa: se o aparelho não aguentar, desenha com menos pixels
    fa = fa * 0.95 + dt * 0.05; if (++fc % 30 === 0) { const pr = R.getPixelRatio(); if (fa > 0.026 && pr > 1) { R.setPixelRatio(Math.max(1, pr - 0.25)); resize(); UPX.value = R.getPixelRatio(); } }
  }
}

/* a pinça além do limite e o botão "Entrar" agora entram em Andrômeda (em vez das sinapses) */
nnDeepEnter = function(){ cosmosOpen(); };
