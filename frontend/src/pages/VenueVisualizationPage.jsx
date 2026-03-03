import { useEffect, useRef, useState } from 'react';

const TABLE_TYPES = [
  { id: 'round8', label: 'Okrągły 8-os.', icon: '⭕', seats: 8, r: 1.2 },
  { id: 'round6', label: 'Okrągły 6-os.', icon: '⭕', seats: 6, r: 1.0 },
  { id: 'rect10', label: 'Prostokątny 10-os.', icon: '▭', seats: 10, w: 3.2, d: 1.2 },
  { id: 'head',   label: 'Stół Pary Młodej', icon: '👑', seats: 14, w: 5.0, d: 1.2 },
];
const DECO_TYPES = [
  { id: 'flowers', label: 'Kompozycja kwiatowa', icon: '💐' },
  { id: 'candle',  label: 'Świecznik',           icon: '🕯️' },
  { id: 'arch',    label: 'Łuk weselny',         icon: '🌸' },
];

export default function VenueVisualizationPage() {
  const mountRef = useRef(null);
  const stateRef = useRef({ objects: [], scene: null, camera: null, renderer: null });
  const camRef   = useRef({ theta: 0.5, phi: 0.9, dist: 32, rotating: false, sx:0, sy:0, st:0, sp:0 });
  const animRef  = useRef(null);

  const [loaded,  setLoaded]  = useState(false);
  const [tab,     setTab]     = useState('tables');
  const [tool,    setTool]    = useState('round8');
  const [objList, setObjList] = useState([]);
  const [hint,    setHint]    = useState('LPM = dodaj element • PPM = obróć widok • Scroll = zoom');

  useEffect(() => {
    if (window.THREE) { setLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!loaded || !mountRef.current) return;
    const T = window.THREE;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const camera = new T.PerspectiveCamera(48, W/H, 0.1, 200);
    const scene  = new T.Scene();
    scene.background = new T.Color(0xe8e0d0);

    // Lights
    scene.add(new T.AmbientLight(0xfff8f0, 0.75));
    const sun = new T.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(8,20,8); sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    ['left','right','top','bottom'].forEach(k => sun.shadow.camera[k] = k==='left'||k==='bottom' ? -22 : 22);
    sun.shadow.camera.far = 60;
    scene.add(sun);
    [[-4,9.5,0],[4,9.5,0]].forEach(([x,y,z]) => { const p = new T.PointLight(0xffd080,1.1,20); p.position.set(x,y,z); scene.add(p); });
    [[-9.5,3,-5],[-9.5,3,5],[9.5,3,-5],[9.5,3,5]].forEach(([x,y,z]) => { const p = new T.PointLight(0xfff0d0,0.25,12); p.position.set(x,y,z); scene.add(p); });

    // Floor - kremowe płytki
    const floor = new T.Mesh(new T.PlaneGeometry(22,18), new T.MeshLambertMaterial({color:0xd8cdb8}));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
    const grout = new T.LineBasicMaterial({color:0xb0a898});
    for(let i=-11;i<=11;i+=1.2){ const g=new T.BufferGeometry().setFromPoints([new T.Vector3(i,.005,-9),new T.Vector3(i,.005,9)]); scene.add(new T.Line(g,grout)); }
    for(let j=-9;j<=9;j+=1.2){ const g=new T.BufferGeometry().setFromPoints([new T.Vector3(-11,.005,j),new T.Vector3(11,.005,j)]); scene.add(new T.Line(g,grout)); }

    // Walls
    const wm = new T.MeshLambertMaterial({color:0xe8dcc8});
    const addBox = (w,h,d,x,y,z) => { const m=new T.Mesh(new T.BoxGeometry(w,h,d),wm); m.position.set(x,y,z); m.receiveShadow=true; scene.add(m); };
    addBox(22,10,0.3, 0,5,-9);   // tył
    addBox(8.5,10,0.3, -6.75,5,9); // przód lewy
    addBox(8.5,10,0.3,  6.75,5,9); // przód prawy
    addBox(3.8,2.8,0.3, 0,9.1,9);  // nadproże
    addBox(0.3,10,18, -11,5,0);  // lewa
    addBox(0.3,10,18,  11,5,0);  // prawa

    // Arch wejścia
    const archMat = new T.MeshLambertMaterial({color:0x3d2010});
    const arch = new T.Mesh(new T.TorusGeometry(1.5,0.12,8,20,Math.PI),archMat);
    arch.position.set(0,7.5,8.85); arch.rotation.z=Math.PI; scene.add(arch);
    [[-1.5],[1.5]].forEach(([px]) => { const f=new T.Mesh(new T.BoxGeometry(0.18,3.5,0.18),archMat); f.position.set(px,5.3,8.85); scene.add(f); });

    // Ceiling kasetonowy
    const cm = new T.MeshLambertMaterial({color:0xf5f2ee});
    const ceil = new T.Mesh(new T.PlaneGeometry(22,18),cm); ceil.rotation.x=Math.PI/2; ceil.position.y=10; scene.add(ceil);
    const sm = new T.MeshLambertMaterial({color:0xe0dbd0});
    [[22,.25,.4,0,9.9,-7],[22,.25,.4,0,9.9,7],[.4,.25,18,-9.8,9.9,0],[.4,.25,18,9.8,9.9,0],[22,.3,.4,0,9.85,0],[.4,.3,18,0,9.85,0]].forEach(([w,h,d,x,y,z]) => { const b=new T.Mesh(new T.BoxGeometry(w,h,d),sm); b.position.set(x,y,z); scene.add(b); });
    const corn = new T.MeshLambertMaterial({color:0xf0ebe0});
    [[22.6,.4,.3,0,9.6,-8.85],[22.6,.4,.3,0,9.6,8.85],[.3,.4,18.6,-10.85,9.6,0],[.3,.4,18.6,10.85,9.6,0]].forEach(([w,h,d,x,y,z]) => { const b=new T.Mesh(new T.BoxGeometry(w,h,d),corn); b.position.set(x,y,z); scene.add(b); });

    // Pillars
    const pm = new T.MeshLambertMaterial({color:0x8a8a8a});
    [[-2.5,0],[2.5,0]].forEach(([x,z]) => { const p=new T.Mesh(new T.BoxGeometry(.7,10,.7),pm); p.position.set(x,5,z); p.castShadow=true; scene.add(p); });

    // Windows
    const buildWin = (side, positions) => {
      const fm = new T.MeshLambertMaterial({color:0x3d2010});
      const gl = new T.MeshLambertMaterial({color:0xc8e8f8,transparent:true,opacity:.35});
      const ct = new T.MeshLambertMaterial({color:0xfffcf4,transparent:true,opacity:.85});
      const gm = new T.MeshLambertMaterial({color:0xD4AF37});
      const sl = side==='left';
      positions.forEach(([x,y,z]) => {
        const frame=new T.Mesh(new T.BoxGeometry(.15,2.0,1.6),fm); frame.position.set(x,y,z); scene.add(frame);
        const glass=new T.Mesh(new T.BoxGeometry(.05,1.7,1.4),gl); glass.position.set(x+(sl?.06:-.06),y,z); scene.add(glass);
        const sill=new T.Mesh(new T.BoxGeometry(.3,.1,1.8),new T.MeshLambertMaterial({color:0xf0ebe0})); sill.position.set(x+(sl?.12:-.12),y-1.1,z); scene.add(sill);
        const rad=new T.Mesh(new T.BoxGeometry(.15,.5,1.4),new T.MeshLambertMaterial({color:0xfafafa})); rad.position.set(x+(sl?.2:-.2),y-1.65,z); scene.add(rad);
        const cL=new T.Mesh(new T.BoxGeometry(.08,2.2,.5),ct); cL.position.set(x+(sl?.1:-.1),y+.1,z-.6); scene.add(cL);
        const cR=cL.clone(); cR.position.z=z+.6; scene.add(cR);
        const rod=new T.Mesh(new T.CylinderGeometry(.03,.03,2,6),fm); rod.rotation.z=Math.PI/2; rod.position.set(x+(sl?.1:-.1),y+1.3,z); scene.add(rod);
        const h1=new T.Mesh(new T.TorusGeometry(.12,.03,6,12),gm); h1.rotation.x=Math.PI/2; h1.position.set(x+(sl?.15:-.15),y-.2,z-.35); scene.add(h1);
        const h2=h1.clone(); h2.position.z=z+.35; scene.add(h2);
      });
    };
    buildWin('left',  [[-9.9,2.5,-5],[-9.9,2.5,0],[-9.9,2.5,5]]);
    buildWin('right', [[9.9,2.5,-5],[9.9,2.5,0],[9.9,2.5,5]]);

    // Chandeliers
    const buildChand = (cx,cy,cz) => {
      const gd=new T.MeshLambertMaterial({color:0xD4AF37});
      const cr=new T.MeshLambertMaterial({color:0xf0f0f8,transparent:true,opacity:.7});
      const g=new T.Group();
      const b=new T.Mesh(new T.CylinderGeometry(.35,.35,.2,16),gd); b.position.y=0; g.add(b);
      const n=new T.Mesh(new T.CylinderGeometry(.15,.15,.5,12),gd); n.position.y=-.35; g.add(n);
      const tb=new T.Mesh(new T.SphereGeometry(.4,16,16),cr); tb.position.y=-.85; g.add(tb);
      const n2=new T.Mesh(new T.CylinderGeometry(.12,.22,.6,12),gd); n2.position.y=-1.35; g.add(n2);
      const crown=new T.Mesh(new T.CylinderGeometry(.9,1.1,.5,24),cr); crown.position.y=-1.85; g.add(crown);
      const bowl=new T.Mesh(new T.SphereGeometry(1.0,16,8,0,Math.PI*2,0,Math.PI/2),cr); bowl.position.y=-2.1; g.add(bowl);
      const ring=new T.Mesh(new T.TorusGeometry(1.0,.06,8,24),gd); ring.position.y=-2.1; g.add(ring);
      for(let i=0;i<16;i++){ const a=(i/16)*Math.PI*2; const d=new T.Mesh(new T.SphereGeometry(.07,6,6),cr); d.position.set(Math.cos(a)*1.0,-2.4,Math.sin(a)*1.0); g.add(d); }
      g.position.set(cx,cy,cz); scene.add(g);
    };
    buildChand(-4,9.8,0); buildChand(4,9.8,0);

    // Click plane
    const cp = new T.Mesh(new T.PlaneGeometry(22,18),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));
    cp.rotation.x=-Math.PI/2; cp.name='clickPlane'; scene.add(cp);

    stateRef.current = { ...stateRef.current, scene, camera, renderer, raycaster: new T.Raycaster(), clickPlane: cp };
    updateCam(camera, camRef.current);

    const loop = () => { animRef.current=requestAnimationFrame(loop); renderer.render(scene,camera); };
    loop();

    const onResize = () => { const W2=el.clientWidth,H2=el.clientHeight; camera.aspect=W2/H2; camera.updateProjectionMatrix(); renderer.setSize(W2,H2); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize',onResize); cancelAnimationFrame(animRef.current); renderer.dispose(); if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const el = mountRef.current;
    const onMD=e=>{ if(e.button!==2)return; camRef.current.rotating=true; camRef.current.sx=e.clientX; camRef.current.sy=e.clientY; camRef.current.st=camRef.current.theta; camRef.current.sp=camRef.current.phi; };
    const onMM=e=>{ if(!camRef.current.rotating)return; camRef.current.theta=camRef.current.st+(e.clientX-camRef.current.sx)*.012; camRef.current.phi=Math.max(.25,Math.min(1.45,camRef.current.sp-(e.clientY-camRef.current.sy)*.012)); updateCam(stateRef.current.camera,camRef.current); };
    const onMU=()=>{ camRef.current.rotating=false; };
    const onW=e=>{ camRef.current.dist=Math.max(8,Math.min(45,camRef.current.dist+e.deltaY*.05)); updateCam(stateRef.current.camera,camRef.current); };
    const onCtx=e=>e.preventDefault();
    el.addEventListener('mousedown',onMD); el.addEventListener('mousemove',onMM); el.addEventListener('mouseup',onMU); el.addEventListener('wheel',onW); el.addEventListener('contextmenu',onCtx);
    return ()=>{ el.removeEventListener('mousedown',onMD); el.removeEventListener('mousemove',onMM); el.removeEventListener('mouseup',onMU); el.removeEventListener('wheel',onW); el.removeEventListener('contextmenu',onCtx); };
  }, [loaded]);

  const handleClick = e => {
    if(camRef.current.rotating || !stateRef.current.scene) return;
    const T=window.THREE;
    const el=mountRef.current;
    const rect=el.getBoundingClientRect();
    const mouse=new T.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    const {raycaster,camera,clickPlane,scene}=stateRef.current;
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObject(clickPlane);
    if(!hits.length) return;
    const {x,z}=hits[0].point;
    const cx=Math.max(-10,Math.min(10,x)), cz=Math.max(-8,Math.min(8,z));
    const allTypes=[...TABLE_TYPES,...DECO_TYPES];
    const type=allTypes.find(t=>t.id===tool);
    if(!type) return;
    const mesh = tab==='tables' ? buildTable(T,type) : buildDeco(T,type);
    mesh.position.set(cx,0,cz);
    const id=Date.now()+Math.random();
    mesh.userData={id};
    scene.add(mesh);
    stateRef.current.objects.push({id,mesh});
    setObjList(prev=>[...prev,{id,label:type.label,icon:type.icon}]);
    setHint('Dodano: '+type.label);
  };

  const removeObj = id => {
    const {scene,objects}=stateRef.current;
    const o=objects.find(x=>x.id===id);
    if(o) scene.remove(o.mesh);
    stateRef.current.objects=objects.filter(x=>x.id!==id);
    setObjList(prev=>prev.filter(x=>x.id!==id));
  };
  const clearAll = () => {
    stateRef.current.objects.forEach(o=>stateRef.current.scene.remove(o.mesh));
    stateRef.current.objects=[];
    setObjList([]);
    setHint('Sala wyczyszczona.');
  };

  return (
    <div className="flex flex-col" style={{height:'calc(100vh - 56px)',marginTop:'-1rem'}}>
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-gray-800">🏛️ Wizualizacja sali 3D — Perła Pienin</h1>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        <div className="flex gap-2 text-xs items-center shrink-0">
          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded hidden md:inline">🖱️ LPM = dodaj</span>
          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded hidden md:inline">PPM = obróć</span>
          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded hidden md:inline">⚙️ Scroll = zoom</span>
          {objList.length>0 && <button onClick={clearAll} className="bg-red-50 text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-100">🗑️ Wyczyść</button>}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex border-b border-gray-100">
            {[['tables','🪑 Stoły'],['deco','💐 Deko']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} className={`flex-1 py-2 text-xs font-medium transition-colors ${tab===k?'bg-rose-50 text-rose-700 border-b-2 border-rose-400':'text-gray-500 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
          <div className="p-2 space-y-1">
            {(tab==='tables'?TABLE_TYPES:DECO_TYPES).map(t=>(
              <button key={t.id} onClick={()=>setTool(t.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-left transition-all border-2 ${tool===t.id?'border-rose-300 bg-rose-50 text-rose-700':'border-transparent hover:bg-gray-50 text-gray-700'}`}>
                <span className="text-lg">{t.icon}</span>
                <div><p className="text-xs font-semibold leading-tight">{t.label}</p>{t.seats&&<p className="text-xs text-gray-400">{t.seats} miejsc</p>}</div>
              </button>
            ))}
          </div>
          {objList.length>0 && (
            <div className="border-t border-gray-100 p-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1 px-1">Dodane ({objList.length})</p>
              {objList.map(o=>(
                <div key={o.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600 truncate">{o.icon} {o.label}</span>
                  <button onClick={()=>removeObj(o.id)} className="text-red-400 hover:text-red-600 text-xs ml-1 shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={mountRef} className="flex-1 cursor-crosshair" onClick={handleClick}>
          {!loaded && (
            <div className="flex items-center justify-center h-full bg-amber-50">
              <div className="text-center"><div className="animate-spin w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-3"/><p className="text-amber-700 text-sm">Ładowanie wizualizacji 3D...</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function updateCam(camera,c) {
  if(!camera) return;
  camera.position.set(c.dist*Math.sin(c.phi)*Math.sin(c.theta), c.dist*Math.cos(c.phi), c.dist*Math.sin(c.phi)*Math.cos(c.theta));
  camera.lookAt(0,1,0);
}

function buildTable(T, type) {
  const wm=new T.MeshLambertMaterial({color:0x6B3A2A});
  const cm=new T.MeshLambertMaterial({color:0xFFFAF2});
  const ch=new T.MeshLambertMaterial({color:0x4a2a18});
  const g=new T.Group();
  if(type.r) {
    const top=new T.Mesh(new T.CylinderGeometry(type.r,type.r,.12,32),wm); top.position.y=.88; top.castShadow=true; g.add(top);
    const leg=new T.Mesh(new T.CylinderGeometry(.08,.12,.88,8),wm); leg.position.y=.44; g.add(leg);
    const cloth=new T.Mesh(new T.CylinderGeometry(type.r+.05,type.r+.15,.05,32),cm); cloth.position.y=.96; g.add(cloth);
    const dc=new T.Mesh(new T.CylinderGeometry(.07,.07,.28,10),new T.MeshLambertMaterial({color:0xD4AF37})); dc.position.y=1.04; g.add(dc);
    const fl=new T.Mesh(new T.SphereGeometry(.18,8,8),new T.MeshLambertMaterial({color:0xFF69B4})); fl.position.y=1.24; g.add(fl);
    for(let i=0;i<type.seats;i++){ const a=(i/type.seats)*Math.PI*2; const c=makeChair(T,ch); c.position.set(Math.cos(a)*(type.r+.6),0,Math.sin(a)*(type.r+.6)); c.rotation.y=a+Math.PI; g.add(c); }
  } else {
    const top=new T.Mesh(new T.BoxGeometry(type.w,.12,type.d),wm); top.position.y=.88; top.castShadow=true; g.add(top);
    const cloth=new T.Mesh(new T.BoxGeometry(type.w+.2,.05,type.d+.2),cm); cloth.position.y=.96; g.add(cloth);
    [[type.w/2-.18,type.d/2-.18],[-type.w/2+.18,type.d/2-.18],[type.w/2-.18,-type.d/2+.18],[-type.w/2+.18,-type.d/2+.18]].forEach(([lx,lz])=>{ const l=new T.Mesh(new T.CylinderGeometry(.05,.05,.88,6),wm); l.position.set(lx,.44,lz); g.add(l); });
    const spp=Math.floor(type.seats/2);
    for(let i=0;i<spp;i++){ const cx=-type.w/2+.5+i*(type.w/spp); [-type.d/2-.6,type.d/2+.6].forEach((cz,si)=>{ const c=makeChair(T,ch); c.position.set(cx,0,cz); c.rotation.y=si===0?0:Math.PI; g.add(c); }); }
    const dc=new T.Mesh(new T.CylinderGeometry(.06,.06,.25,10),new T.MeshLambertMaterial({color:0xD4AF37})); dc.position.y=1.04; g.add(dc);
    const fl=new T.Mesh(new T.SphereGeometry(.16,8,8),new T.MeshLambertMaterial({color:0xFF69B4})); fl.position.y=1.21; g.add(fl);
  }
  return g;
}

function makeChair(T,mat) {
  const g=new T.Group();
  const s=new T.Mesh(new T.BoxGeometry(.42,.06,.38),mat); s.position.y=.5; g.add(s);
  const b=new T.Mesh(new T.BoxGeometry(.42,.38,.05),mat); b.position.set(0,.71,-.17); g.add(b);
  [[.17,.18],[-.17,.18],[.17,-.17],[-.17,-.17]].forEach(([lx,lz])=>{ const l=new T.Mesh(new T.CylinderGeometry(.022,.022,.5,4),mat); l.position.set(lx,.25,lz); g.add(l); });
  return g;
}

function buildDeco(T, type) {
  const g=new T.Group();
  if(type.id==='flowers') {
    const st=new T.Mesh(new T.CylinderGeometry(.04,.04,1.1,6),new T.MeshLambertMaterial({color:0x2d7a2d})); st.position.y=.55; g.add(st);
    const lf=new T.Mesh(new T.SphereGeometry(.28,8,8),new T.MeshLambertMaterial({color:0x2d7a2d})); lf.scale.set(1,.35,1); lf.position.y=.65; g.add(lf);
    [0,1,2,3,4,5].forEach(i=>{ const f=new T.Mesh(new T.SphereGeometry(.16,8,8),new T.MeshLambertMaterial({color:[0xFF69B4,0xFFB6C1,0xFF1493,0xFFC0CB,0xFFFFFF,0xFFD700][i]})); f.position.set(Math.cos(i*1.05)*.22,1.15+Math.sin(i*.9)*.08,Math.sin(i*1.05)*.22); g.add(f); });
  } else if(type.id==='candle') {
    const h=new T.Mesh(new T.CylinderGeometry(.2,.16,.08,16),new T.MeshLambertMaterial({color:0xD4AF37})); h.position.y=.04; g.add(h);
    const c=new T.Mesh(new T.CylinderGeometry(.09,.09,.7,12),new T.MeshLambertMaterial({color:0xFFF8DC})); c.position.y=.43; g.add(c);
    const fl=new T.Mesh(new T.SphereGeometry(.055,8,8),new T.MeshBasicMaterial({color:0xFF9900})); fl.scale.set(1,1.6,1); fl.position.y=.83; g.add(fl);
  } else if(type.id==='arch') {
    const pm=new T.MeshLambertMaterial({color:0xdeb887});
    [[-1.6,0],[1.6,0]].forEach(([px])=>{ const p=new T.Mesh(new T.CylinderGeometry(.1,.1,3.5,8),pm); p.position.set(px,1.75,0); g.add(p); });
    const ar=new T.Mesh(new T.TorusGeometry(1.6,.14,8,20,Math.PI),new T.MeshLambertMaterial({color:0xffb6c1})); ar.rotation.z=Math.PI; ar.position.y=3.5; g.add(ar);
    for(let i=0;i<=10;i++){ const a=(i/10)*Math.PI; const f=new T.Mesh(new T.SphereGeometry(.13,6,6),new T.MeshLambertMaterial({color:[0xFF69B4,0xFFFFFF,0xFFD700][i%3]})); f.position.set(-Math.cos(a)*1.6,Math.sin(a)*1.6+3.5,0); g.add(f); }
  }
  return g;
}
