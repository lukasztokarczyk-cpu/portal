import { useEffect, useRef, useState } from 'react';

const TABLE_TYPES = [
  { id: 'round8', label: 'Okrągły 8-os.', icon: '⭕', color: 0x8B4513, radius: 1.2, seats: 8 },
  { id: 'round6', label: 'Okrągły 6-os.', icon: '⭕', color: 0xA0522D, radius: 1.0, seats: 6 },
  { id: 'rect10', label: 'Prostokątny 10-os.', icon: '▭', color: 0x6B3A2A, w: 3.0, d: 1.2, seats: 10 },
  { id: 'head', label: 'Stół Pary Młodej', icon: '👑', color: 0xB8860B, w: 4.0, d: 1.2, seats: 12 },
];

const DECORATION_TYPES = [
  { id: 'flowers', label: 'Kompozycja kwiatowa', icon: '💐', color: 0xff69b4 },
  { id: 'candle', label: 'Świecznik', icon: '🕯️', color: 0xFFD700 },
  { id: 'arch', label: 'Łuk kwiatowy', icon: '🌸', color: 0xff9999 },
];

export default function VenueVisualizationPage() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectsRef = useRef([]);
  const selectedRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  const [selectedTool, setSelectedTool] = useState('round8');
  const [selectedTab, setSelectedTab] = useState('tables'); // tables | decorations
  const [info, setInfo] = useState('Kliknij na salę aby dodać element. Przeciągnij aby obracać widok.');
  const [objects, setObjects] = useState([]);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [selectedObj, setSelectedObj] = useState(null);

  // Załaduj Three.js
  useEffect(() => {
    if (window.THREE) { setThreeLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => setThreeLoaded(true);
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // Inicjalizuj scenę po załadowaniu Three.js
  useEffect(() => {
    if (!threeLoaded || !mountRef.current) return;
    const THREE = window.THREE;
    const container = mountRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Kamera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 18, 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Scena
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 40, 80);
    sceneRef.current = scene;

    // Światła
    const ambient = new THREE.AmbientLight(0xfff5e0, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff0c0, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Punktowe świece
    [-6, 0, 6].forEach(x => {
      const pt = new THREE.PointLight(0xffaa44, 0.4, 20);
      pt.position.set(x, 4, -6);
      scene.add(pt);
    });

    // Podłoga — parkiet
    const floorGeo = new THREE.PlaneGeometry(24, 20, 24, 20);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);

    // Wzór parkietu — linie
    const gridHelper = new THREE.GridHelper(24, 24, 0x5a4010, 0x5a4010);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Ściany
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a1f10, side: THREE.BackSide });
    const roomGeo = new THREE.BoxGeometry(26, 12, 22);
    const room = new THREE.Mesh(roomGeo, wallMat);
    room.position.y = 5;
    scene.add(room);

    // Sufit z żyrandolami
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
    const ceilGeo = new THREE.PlaneGeometry(24, 20);
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 11;
    scene.add(ceil);

    // Żyrandole
    [[-6, -4], [0, 0], [6, -4], [-6, 4], [6, 4]].forEach(([x, z]) => {
      const chandGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const chandMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const chand = new THREE.Mesh(chandGeo, chandMat);
      chand.position.set(x, 10.2, z);
      scene.add(chand);
      const pt2 = new THREE.PointLight(0xfff5c0, 0.5, 12);
      pt2.position.set(x, 9.5, z);
      scene.add(pt2);
    });

    // Płaszczyzna do detekcji kliknięć
    const clickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    clickPlane.rotation.x = -Math.PI / 2;
    clickPlane.position.y = 0;
    clickPlane.name = 'clickPlane';
    scene.add(clickPlane);

    // Animacja
    let camTheta = Math.atan2(16, 18);
    let camPhi = Math.atan2(Math.sqrt(16*16 + 18*18), 18);
    let camDist = Math.sqrt(16*16 + 18*18);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const W2 = container.clientWidth;
      const H2 = container.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [threeLoaded]);

  // Dodaj stół / dekorację przy kliknięciu
  const handleCanvasClick = (e) => {
    if (!threeLoaded || !sceneRef.current || isDraggingRef.current) return;
    const THREE = window.THREE;
    const container = mountRef.current;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const plane = sceneRef.current.getObjectByName('clickPlane');
    const hits = raycaster.intersectObject(plane);
    if (!hits.length) return;
    const pt = hits[0].point;

    // Ogranicz do sali (24x20)
    const x = Math.max(-11, Math.min(11, pt.x));
    const z = Math.max(-9, Math.min(9, pt.z));

    addObject(x, z);
  };

  const addObject = (x, z) => {
    const THREE = window.THREE;
    const scene = sceneRef.current;
    const allTypes = [...TABLE_TYPES, ...DECORATION_TYPES];
    const type = allTypes.find(t => t.id === selectedTool);
    if (!type) return;

    let mesh;

    if (selectedTab === 'tables') {
      const mat = new THREE.MeshLambertMaterial({ color: type.color });
      if (type.radius) {
        // Okrągły stół
        const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(type.radius, type.radius, 0.15, 32), mat);
        tableTop.position.y = 0.9;
        tableTop.castShadow = true;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.85, 8), new THREE.MeshLambertMaterial({ color: 0x5a3010 }));
        leg.position.y = 0.42;
        const group = new THREE.Group();
        group.add(tableTop); group.add(leg);
        // Krzesła
        for (let i = 0; i < type.seats; i++) {
          const angle = (i / type.seats) * Math.PI * 2;
          const cx = Math.cos(angle) * (type.radius + 0.55);
          const cz = Math.sin(angle) * (type.radius + 0.55);
          const chair = makeChair(THREE);
          chair.position.set(cx, 0, cz);
          chair.rotation.y = angle + Math.PI;
          group.add(chair);
        }
        mesh = group;
      } else {
        // Prostokątny stół
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(type.w, 0.15, type.d), mat);
        tableTop.position.y = 0.9;
        tableTop.castShadow = true;
        const group = new THREE.Group();
        group.add(tableTop);
        [[type.w / 2 - 0.2, type.d / 2 - 0.2], [-type.w / 2 + 0.2, type.d / 2 - 0.2],
         [type.w / 2 - 0.2, -type.d / 2 + 0.2], [-type.w / 2 + 0.2, -type.d / 2 + 0.2]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), new THREE.MeshLambertMaterial({ color: 0x5a3010 }));
          leg.position.set(lx, 0.42, lz);
          group.add(leg);
        });
        // Krzesła dookoła
        const seatsPerSide = Math.floor(type.seats / 2);
        for (let i = 0; i < seatsPerSide; i++) {
          const cx = -type.w / 2 + 0.5 + i * (type.w / seatsPerSide);
          [-type.d / 2 - 0.55, type.d / 2 + 0.55].forEach((cz, si) => {
            const chair = makeChair(THREE);
            chair.position.set(cx, 0, cz);
            chair.rotation.y = si === 0 ? 0 : Math.PI;
            group.add(chair);
          });
        }
        mesh = group;
      }

      // Obrus — biały krąg/kwadrat na stole
      const clothMat = new THREE.MeshLambertMaterial({ color: 0xFFFAF0, transparent: true, opacity: 0.9 });
      if (type.radius) {
        const cloth = new THREE.Mesh(new THREE.CylinderGeometry(type.radius - 0.05, type.radius - 0.05, 0.02, 32), clothMat);
        cloth.position.y = 0.98;
        mesh.add(cloth);
        // Dekoracja na środku
        const deco = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshLambertMaterial({ color: 0xFF69B4 }));
        deco.position.y = 1.08;
        mesh.add(deco);
      } else {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(type.w + 0.1, 0.02, type.d + 0.1), clothMat);
        cloth.position.y = 0.98;
        mesh.add(cloth);
      }

    } else {
      // Dekoracje
      mesh = makeDecoration(THREE, type);
    }

    const id = Date.now();
    mesh.position.set(x, 0, z);
    mesh.userData = { id, typeId: selectedTool, label: type.label };
    sceneRef.current.add(mesh);
    objectsRef.current.push({ id, mesh });
    setObjects(prev => [...prev, { id, typeId: selectedTool, label: type.label, x: x.toFixed(1), z: z.toFixed(1) }]);
    setInfo(`Dodano: ${type.label}`);
  };

  const makeChair = (THREE) => {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a2800 });
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.4), mat);
    seat.position.y = 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), mat);
    back.position.set(0, 0.72, -0.18);
    group.add(seat); group.add(back);
    [[0.18, 0.2], [-0.18, 0.2], [0.18, -0.18], [-0.18, -0.18]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), mat);
      leg.position.set(lx, 0.25, lz);
      group.add(leg);
    });
    return group;
  };

  const makeDecoration = (THREE, type) => {
    const group = new THREE.Group();
    if (type.id === 'flowers') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), new THREE.MeshLambertMaterial({ color: 0x228B22 }));
      stem.position.y = 0.6;
      group.add(stem);
      [0, 1, 2, 3, 4].forEach(i => {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshLambertMaterial({ color: [0xFF69B4, 0xFFB6C1, 0xFF1493, 0xFFC0CB, 0xFF007F][i] }));
        flower.position.set(Math.cos(i * 1.26) * 0.25, 1.2 + Math.sin(i * 1.1) * 0.1, Math.sin(i * 1.26) * 0.25);
        group.add(flower);
      });
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshLambertMaterial({ color: 0x228B22 }));
      leaves.scale.set(1, 0.4, 1);
      leaves.position.y = 0.7;
      group.add(leaves);
    } else if (type.id === 'candle') {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0xFFF8DC }));
      candle.position.y = 0.4;
      group.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFAA00 }));
      flame.scale.set(1, 1.5, 1);
      flame.position.y = 0.88;
      group.add(flame);
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0xFFD700 }));
      holder.position.y = 0.05;
      group.add(holder);
    } else if (type.id === 'arch') {
      const archMat = new THREE.MeshLambertMaterial({ color: 0xFF9999 });
      const archGeo = new THREE.TorusGeometry(1.5, 0.15, 8, 20, Math.PI);
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.rotation.z = Math.PI;
      arch.position.y = 3.0;
      group.add(arch);
      [[-1.5, 0], [1.5, 0]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), new THREE.MeshLambertMaterial({ color: 0xDEB887 }));
        post.position.set(px, 1.5, pz);
        group.add(post);
      });
      // Kwiaty na łuku
      for (let i = 0; i <= 8; i++) {
        const angle = (i / 8) * Math.PI;
        const fx = Math.cos(angle) * 1.5;
        const fy = Math.sin(angle) * 1.5 + 3.0;
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshLambertMaterial({ color: [0xFF69B4, 0xFFFFFF, 0xFF1493][i % 3] }));
        fl.position.set(-fx, fy, 0);
        group.add(fl);
      }
    }
    return group;
  };

  // Obracanie kamery myszą
  useEffect(() => {
    if (!threeLoaded) return;
    const container = mountRef.current;
    let startX, startY, startTheta, startPhi;
    let theta = 0.8, phi = 1.0, dist = 24;

    const onMouseDown = (e) => {
      if (e.button !== 2) return; // tylko prawy przycisk = rotate
      isRotatingRef.current = true;
      startX = e.clientX; startY = e.clientY;
      startTheta = theta; startPhi = phi;
    };
    const onMouseMove = (e) => {
      if (!isRotatingRef.current) return;
      theta = startTheta + (e.clientX - startX) * 0.01;
      phi = Math.max(0.3, Math.min(1.4, startPhi - (e.clientY - startY) * 0.01));
      const x = dist * Math.sin(phi) * Math.sin(theta);
      const y = dist * Math.cos(phi);
      const z = dist * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(0, 0, 0);
    };
    const onMouseUp = () => { isRotatingRef.current = false; };
    const onWheel = (e) => {
      dist = Math.max(8, Math.min(40, dist + e.deltaY * 0.05));
      const x = dist * Math.sin(phi) * Math.sin(theta);
      const y = dist * Math.cos(phi);
      const z = dist * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(0, 0, 0);
    };
    const onContext = (e) => e.preventDefault();

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel);
    container.addEventListener('contextmenu', onContext);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('contextmenu', onContext);
    };
  }, [threeLoaded]);

  const removeObject = (id) => {
    const obj = objectsRef.current.find(o => o.id === id);
    if (obj) {
      sceneRef.current.remove(obj.mesh);
      objectsRef.current = objectsRef.current.filter(o => o.id !== id);
    }
    setObjects(prev => prev.filter(o => o.id !== id));
  };

  const clearAll = () => {
    objectsRef.current.forEach(o => sceneRef.current.remove(o.mesh));
    objectsRef.current = [];
    setObjects([]);
    setInfo('Sala wyczyszczona.');
  };

  return (
    <div className="flex flex-col h-screen -m-4 md:-m-8" style={{ height: 'calc(100vh - 60px)' }}>

      {/* Pasek górny */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">🏛️ Wizualizacja sali 3D</h1>
          <p className="text-xs text-gray-400">{info}</p>
        </div>
        <div className="flex gap-2 text-xs text-gray-500 items-center">
          <span className="bg-gray-100 px-2 py-1 rounded">🖱️ LPM = dodaj</span>
          <span className="bg-gray-100 px-2 py-1 rounded">PPM = obróć</span>
          <span className="bg-gray-100 px-2 py-1 rounded">🔄 Scroll = zoom</span>
          {objects.length > 0 && (
            <button onClick={clearAll} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors">
              🗑️ Wyczyść
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Panel boczny */}
        <div className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">

          {/* Zakładki */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setSelectedTab('tables')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${selectedTab === 'tables' ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-400' : 'text-gray-500 hover:bg-gray-50'}`}>
              🪑 Stoły
            </button>
            <button onClick={() => setSelectedTab('decorations')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${selectedTab === 'decorations' ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-400' : 'text-gray-500 hover:bg-gray-50'}`}>
              💐 Dekoracje
            </button>
          </div>

          <div className="p-3 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Wybierz element</p>
            {(selectedTab === 'tables' ? TABLE_TYPES : DECORATION_TYPES).map(type => (
              <button key={type.id} onClick={() => setSelectedTool(type.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${selectedTool === type.id ? 'bg-rose-50 text-rose-700 border-2 border-rose-300' : 'border-2 border-transparent hover:bg-gray-50 text-gray-700'}`}>
                <span className="text-xl">{type.icon}</span>
                <div>
                  <p className="text-xs font-semibold leading-tight">{type.label}</p>
                  {type.seats && <p className="text-xs text-gray-400">{type.seats} miejsc</p>}
                </div>
              </button>
            ))}
          </div>

          {/* Lista dodanych elementów */}
          {objects.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Dodane ({objects.length})</p>
              <div className="space-y-1">
                {objects.map(obj => (
                  <div key={obj.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                    <span className="text-xs text-gray-600 truncate">{obj.label}</span>
                    <button onClick={() => removeObject(obj.id)}
                      className="text-red-400 hover:text-red-600 transition-colors text-xs ml-1 shrink-0">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas 3D */}
        <div
          ref={mountRef}
          className="flex-1 cursor-crosshair"
          onClick={handleCanvasClick}
          style={{ background: '#1a1a2e' }}
        >
          {!threeLoaded && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="animate-spin w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p>Ładowanie wizualizacji 3D...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
