import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

const SECTION_LABELS = {
  ZUPA:             'Zupa',
  DANIE_GLOWNE:     'Danie główne',
  DODATKI_GLOWNE:   'Dodatki do dania głównego',
  SUROWKI:          'Surówki do obiadu',
  DESER:            'Deser',
  CIEPLA_1:         '1. ciepłe danie',
  DODATKI_CIEPLA_1: 'Dodatek do 1. ciepłego',
  SUROWKA_CIEPLA_1: 'Surówka do 1. ciepłego',
  CIEPLA_2:         '2. ciepłe danie',
  DODATKI_CIEPLA_2: 'Dodatek do 2. ciepłego',
  SUROWKA_CIEPLA_2: 'Surówka do 2. ciepłego',
  CIEPLA_3:         '3. ciepłe danie',
  DODATKI_CIEPLA_3: 'Dodatek do 3. ciepłego',
  SUROWKA_CIEPLA_3: 'Surówka do 3. ciepłego',
  ZIMNA_PLYTA:      'Zimna płyta',
  SALATKI:          'Sałatki',
};

export default function MenuPage() {
  const { user } = useAuth();
  const isCouple = user?.role === 'couple';
  const isAdmin = ['admin', 'coordinator'].includes(user?.role);

  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [config, setConfig] = useState({ mainCourseMode: null, dessertChoice: null, locked: false, cakeSource: null, cakeFlavors: '', sweetTableChoice: null, sweetTableAmount: '', guestPackageChoice: null, guestPackagePrice: '', wiejskiStol: null });
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState({});
  const [adminView, setAdminView] = useState('menu');
  const [newDish, setNewDish] = useState({ section: 'ZUPA', name: '', description: '' });
  const [cakeImageUrl, setCakeImageUrl] = useState(null);
  const cakeFileRef = useRef();

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then(r => setSelectedWeddingId(r.data.id)).catch(console.error);
    } else {
      api.get('/weddings').then(r => {
        setWeddings(r.data);
        if (r.data[0]) setSelectedWeddingId(r.data[0].id);
      }).catch(console.error);
    }
    if (isAdmin) {
      api.get('/menu/dishes').then(r => setDishes(r.data)).catch(console.error);
    }
  }, [isCouple, isAdmin]);

  useEffect(() => {
    if (!selectedWeddingId) return;
    setLoading(true);
    api.get(`/menu/wedding/${selectedWeddingId}`)
      .then(r => {
        setMenuData(r.data);
        setConfig(prev => ({ ...prev, ...r.data.config }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // Załaduj zdjęcie tortu
    api.get(`/menu/wedding/${selectedWeddingId}/cake-image`)
      .then(r => setCakeImageUrl(r.data.url))
      .catch(() => setCakeImageUrl(null));
  }, [selectedWeddingId]);

  const refreshMenu = () => {
    api.get(`/menu/wedding/${selectedWeddingId}`).then(r => {
      setMenuData(r.data); setConfig(prev => ({ ...prev, ...r.data.config }));
    });
  };

  const uploadCakeImage = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/menu/wedding/${selectedWeddingId}/cake-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const r = await api.get(`/menu/wedding/${selectedWeddingId}/cake-image`);
      setCakeImageUrl(r.data.url);
      toast.success('Zdjęcie tortu wgrane!');
    } catch { toast.error('Błąd uploadu'); }
  };

  const updateConfig = async (updates) => {
    try {
      const res = await api.patch(`/menu/wedding/${selectedWeddingId}/config`, updates);
      setConfig(res.data);
      refreshMenu();
    } catch { toast.error('Błąd aktualizacji'); }
  };

  const [showSummary, setShowSummary] = useState(false);

  const approveMeniu = async () => {
    try {
      const res = await api.patch(`/menu/wedding/${selectedWeddingId}/config`, { locked: true });
      setConfig(res.data);
      refreshMenu();
      setShowSummary(true);
      toast.success('Menu zatwierdzone wstępnie!');
    } catch { toast.error('Błąd'); }
  };

  const selectDish = async (section, slotIndex, dishId) => {
    try {
      await api.post(`/menu/wedding/${selectedWeddingId}/select`, { section, slotIndex, dishId: dishId || '' });
      refreshMenu();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  const addDish = async () => {
    if (!newDish.name.trim()) return toast.error('Podaj nazwę dania');
    try {
      await api.post('/menu/dishes', newDish);
      const r = await api.get('/menu/dishes');
      setDishes(r.data);
      setNewDish(d => ({ ...d, name: '', description: '' }));
      toast.success('Danie dodane');
    } catch { toast.error('Błąd'); }
  };

  const deleteDish = async (id) => {
    try {
      await api.delete(`/menu/dishes/${id}`);
      const r = await api.get('/menu/dishes');
      setDishes(r.data);
      toast.success('Usunięto');
    } catch { toast.error('Błąd'); }
  };

  const getSelection = (section, slotIndex = 0) => {
    if (!menuData) return null;
    const sels = menuData.selectionsBySection[section] || [];
    return sels.find(s => s.slotIndex === slotIndex)?.dish || null;
  };

  const DishSelect = ({ section, slotIndex = 0, label }) => {
    const currentDish = getSelection(section, slotIndex);
    const available = menuData?.dishesBySection[section] || [];
    if (available.length === 0) return (
      <div className="mb-3">
        <label className="text-sm text-gray-500 mb-1 block">{label}</label>
        <p className="text-xs text-gray-400 italic">Brak dań w tej kategorii — admin musi je dodać</p>
      </div>
    );
    return (
      <div className="mb-3">
        <label className="text-sm text-gray-600 mb-1 block">{label}</label>
        <select
          className="input w-full"
          value={currentDish?.id || ''}
          onChange={e => selectDish(section, slotIndex, e.target.value)}
          disabled={config.locked && isCouple}
        >
          <option value="">— Wybierz —</option>
          {available.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.description ? ` (${d.description})` : ''}</option>
          ))}
        </select>
        {currentDish && <p className="text-xs text-rose-600 mt-1">✓ {currentDish.name}</p>}
      </div>
    );
  };

  const ModeButton = ({ value, current, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${current === value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-rose-300'}`}
    >
      {children}
    </button>
  );

  // WIDOK ADMIN - zarządzanie daniami
  if (isAdmin && adminView === 'dishes') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Zarządzanie daniami</h1>
          <button onClick={() => setAdminView('menu')} className="btn-secondary">← Wróć</button>
        </div>
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700">Dodaj nowe danie</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="input" value={newDish.section} onChange={e => setNewDish(d => ({ ...d, section: e.target.value }))}>
              {Object.entries(SECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" placeholder="Nazwa dania" value={newDish.name} onChange={e => setNewDish(d => ({ ...d, name: e.target.value }))} />
            <input className="input" placeholder="Opis (opcjonalnie)" value={newDish.description} onChange={e => setNewDish(d => ({ ...d, description: e.target.value }))} />
          </div>
          <button onClick={addDish} className="btn-primary">+ Dodaj danie</button>
        </div>
        {Object.entries(SECTION_LABELS).map(([section, label]) => (
          <div key={section} className="card">
            <h3 className="font-semibold text-gray-700 mb-3">{label}</h3>
            {(dishes[section]?.dishes || []).length === 0 ? (
              <p className="text-gray-400 text-sm italic">Brak dań</p>
            ) : (
              <div className="space-y-2">
                {(dishes[section]?.dishes || []).map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{d.name}</span>
                      {d.description && <span className="text-sm text-gray-500 ml-2">— {d.description}</span>}
                    </div>
                    <button onClick={() => deleteDish(d.id)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // WIDOK PODSUMOWANIA
  if (showSummary && menuData) {
    const sel = (section, slot = 0) => menuData.selectionsBySection?.[section]?.find(s => s.slotIndex === slot)?.dish;
    const CAKE_SOURCE = { nas: 'Od nas', zewnetrzna: 'Z firmy zewnętrznej' };
    const SWEET = { nas: 'Zamawiamy u Was', zewnetrzna: 'Firma zewnętrzna', rezygnuje: 'Rezygnujemy' };
    const PACKAGES = { nas: 'Zamawiamy u Was', zewnetrzna: 'Firma zewnętrzna', nie: 'Nie, dziękujemy' };
    const MAIN_MODE = { polmisek: 'Na półmiskach', talerz: 'Na talerzach' };

    const Row = ({ label, value }) => value ? (
      <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-gray-500 text-sm">{label}</span>
        <span className="text-gray-800 text-sm font-medium text-right max-w-[60%]">{value}</span>
      </div>
    ) : null;

    const Section = ({ title, children }) => (
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 text-base mb-2 pb-1 border-b-2 border-rose-100">{title}</h3>
        {children}
      </div>
    );

    return (
      <div className="space-y-5">
        {/* Nagłówek */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <h1 className="text-2xl font-bold text-gray-800">Podsumowanie menu</h1>
          <div className="flex gap-3">
            <button onClick={() => { setShowSummary(false); if (isCouple) updateConfig({ locked: false }); }} className="btn-secondary">
              ✏️ Edytuj menu
            </button>
            <button onClick={() => window.print()} className="btn-primary">
              🖨️ Drukuj
            </button>
          </div>
        </div>

        {/* Nagłówek do druku */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">Menu weselne</h1>
          {menuData.wedding?.couple?.name && <p className="text-gray-600 mt-1">{menuData.wedding.couple.name}</p>}
          {menuData.wedding?.weddingDate && <p className="text-gray-500 text-sm">{new Date(menuData.wedding.weddingDate).toLocaleDateString('pl-PL')}</p>}
        </div>

        <div id="menu-summary" className="bg-white rounded-2xl shadow p-6 space-y-2">

          <Section title="🍲 Zupa">
            <Row label="Zupa" value={sel('ZUPA')?.name} />
          </Section>

          <Section title="🥩 Danie główne">
            <Row label="Sposób serwowania" value={MAIN_MODE[config.mainCourseMode]} />
            {config.mainCourseMode === 'polmisek' ? (
              <>
                <Row label="Mięso 1" value={sel('DANIE_GLOWNE', 0)?.name} />
                <Row label="Mięso 2" value={sel('DANIE_GLOWNE', 1)?.name} />
                <Row label="Mięso 3" value={sel('DANIE_GLOWNE', 2)?.name} />
              </>
            ) : (
              <Row label="Danie" value={sel('DANIE_GLOWNE', 0)?.name} />
            )}
            <Row label="Dodatek 1" value={sel('DODATKI_GLOWNE', 0)?.name} />
            <Row label="Dodatek 2" value={sel('DODATKI_GLOWNE', 1)?.name} />
            <Row label="Surówka 1" value={sel('SUROWKI', 0)?.name} />
            <Row label="Surówka 2" value={sel('SUROWKI', 1)?.name} />
            <Row label="Surówka 3" value={sel('SUROWKI', 2)?.name} />
          </Section>

          <Section title="🍰 Deser / Tort">
            <Row label="Wybór" value={config.dessertChoice === 'deser' ? 'Deser z menu' : 'Tort weselny'} />
            {config.dessertChoice === 'deser' && <Row label="Deser" value={sel('DESER', 0)?.name} />}
            {config.dessertChoice === 'tort' && (
              <>
                <Row label="Źródło tortu" value={CAKE_SOURCE[config.cakeSource]} />
                {config.cakeSource === 'nas' && <Row label="Smak tortu" value={config.cakeFlavors} />}
              </>
            )}
            {cakeImageUrl && config.cakeSource === 'nas' && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">Zdjęcie tortu:</p>
                <img src={cakeImageUrl} alt="Tort" className="rounded-xl max-h-40 object-contain border border-gray-200" />
              </div>
            )}
          </Section>

          <Section title="🍛 1. Ciepłe danie (wieczorowe)">
            <Row label="Danie" value={sel('CIEPLA_1', 0)?.name} />
            <Row label="Dodatek" value={sel('DODATKI_CIEPLA_1', 0)?.name} />
            <Row label="Surówka" value={sel('SUROWKA_CIEPLA_1', 0)?.name} />
          </Section>

          {config.dessertChoice === 'deser' && (
            <Section title="🎂 Tort weselny (między daniami)">
              <Row label="Źródło tortu" value={CAKE_SOURCE[config.cakeSource]} />
              {config.cakeSource === 'nas' && <Row label="Smak tortu" value={config.cakeFlavors} />}
            </Section>
          )}
          {config.dessertChoice === 'tort' && (
            <Section title="🍮 Deser wieczorny">
              <Row label="Deser" value={sel('DESER', 0)?.name} />
            </Section>
          )}

          <Section title="🍲 2. Ciepłe danie">
            <Row label="Danie" value={sel('CIEPLA_2', 0)?.name} />
            <Row label="Dodatek" value={sel('DODATKI_CIEPLA_2', 0)?.name} />
            <Row label="Surówka" value={sel('SUROWKA_CIEPLA_2', 0)?.name} />
          </Section>

          <Section title="🥘 3. Ciepłe danie">
            <Row label="Danie" value={sel('CIEPLA_3', 0)?.name} />
            <Row label="Dodatek" value={sel('DODATKI_CIEPLA_3', 0)?.name} />
            <Row label="Surówka" value={sel('SUROWKA_CIEPLA_3', 0)?.name} />
          </Section>

          <Section title="🧀 Zimna płyta">
            <Row label="Opcja 1" value={sel('ZIMNA_PLYTA', 0)?.name} />
            <Row label="Opcja 2" value={sel('ZIMNA_PLYTA', 1)?.name} />
            <Row label="Opcja 3" value={sel('ZIMNA_PLYTA', 2)?.name} />
          </Section>

          <Section title="🥙 Sałatki">
            <Row label="Sałatka 1" value={sel('SALATKI', 0)?.name} />
            <Row label="Sałatka 2" value={sel('SALATKI', 1)?.name} />
          </Section>

          <Section title="🍬 Słodki stół">
            <Row label="Wybór" value={SWEET[config.sweetTableChoice]} />
            {config.sweetTableChoice === 'nas' && config.sweetTableAmount && (
              <Row label="Kwota" value={`${parseFloat(config.sweetTableAmount).toFixed(2)} zł`} />
            )}
          </Section>

          <Section title="🎁 Paczki dla gości">
            <Row label="Wybór" value={PACKAGES[config.guestPackageChoice]} />
            {config.guestPackageChoice === 'nas' && (
              <>
                {config.guestPackagePrice && <Row label="Cena / os." value={`${parseFloat(config.guestPackagePrice).toFixed(2)} zł`} />}
                {config.guestPackageCount && <Row label="Liczba paczek" value={`${config.guestPackageCount} szt.`} />}
              </>
            )}
          </Section>

          <Section title="🌾 Wiejski stół">
            <Row label="Wybór" value={config.wiejskiStol === 'tak' ? 'Tak — bezpłatny' : config.wiejskiStol === 'nie' ? 'Nie, dziękujemy' : null} />
          </Section>

        </div>

        <div className="card bg-green-50 border border-green-200 print:hidden">
          <p className="text-sm text-green-700 text-center">✅ Menu zatwierdzone wstępnie. Możesz je wydrukować lub wrócić do edycji.</p>
        </div>
      </div>
    );
  }

  // WIDOK MENU WESELA
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Menu weselne</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={selectedWeddingId || ''} onChange={e => setSelectedWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w?.couple?.name || w?.couple?.email}</option>)}
            </select>
          )}
          {isAdmin && <button onClick={() => setAdminView('dishes')} className="btn-secondary text-sm">🍽️ Zarządzaj daniami</button>}
          {isAdmin && (
            <button onClick={() => updateConfig({ locked: !config.locked })} className="btn-secondary text-sm">
              {config.locked ? '🔓 Odblokuj' : '🔒 Zatwierdź'}
            </button>
          )}
          {config.locked && <span className="text-sm text-orange-600 font-medium">🔒 Zatwierdzone</span>}
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Ładowanie...</div>}

      {!loading && menuData && (<>

        {/* ZUPA */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🍲 Zupa</h2>
          <DishSelect section="ZUPA" slotIndex={0} label="Wybór zupy" />
        </div>

        {/* DANIE GŁÓWNE */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🥩 Danie główne</h2>
          <p className="text-sm text-gray-600 mb-3">Sposób serwowania:</p>
          <div className="flex gap-3 mb-4 flex-wrap">
            <ModeButton value="polmisek" current={config.mainCourseMode} onClick={() => updateConfig({ mainCourseMode: 'polmisek' })}>
              🍖 Na półmiskach (3 mięsa)
            </ModeButton>
            <ModeButton value="talerz" current={config.mainCourseMode} onClick={() => updateConfig({ mainCourseMode: 'talerz' })}>
              🍽️ Na talerzu (2 mięsa)
            </ModeButton>
          </div>
          {config.mainCourseMode ? (
            <div className="space-y-1">
              {Array.from({ length: config.mainCourseMode === 'polmisek' ? 3 : 2 }).map((_, i) => (
                <DishSelect key={i} section="DANIE_GLOWNE" slotIndex={i} label={`Mięso ${i + 1}`} />
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">Wybierz sposób serwowania powyżej</p>}

          {/* Dodatki do dania głównego */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Dodatki (2 do wyboru):</p>
            <DishSelect section="DODATKI_GLOWNE" slotIndex={0} label="Dodatek 1" />
            <DishSelect section="DODATKI_GLOWNE" slotIndex={1} label="Dodatek 2" />
          </div>

          {/* Surówki do obiadu */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Surówki do obiadu (3 do wyboru):</p>
            <DishSelect section="SUROWKI" slotIndex={0} label="Surówka 1" />
            <DishSelect section="SUROWKI" slotIndex={1} label="Surówka 2" />
            <DishSelect section="SUROWKI" slotIndex={2} label="Surówka 3" />
          </div>
        </div>

        {/* DESER / TORT */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🍰 Deser / Tort</h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            <ModeButton value="deser" current={config.dessertChoice} onClick={() => updateConfig({ dessertChoice: 'deser' })}>
              🍮 Deser z menu
            </ModeButton>
            <ModeButton value="tort" current={config.dessertChoice} onClick={() => updateConfig({ dessertChoice: 'tort' })}>
              🎂 Tort weselny
            </ModeButton>
          </div>
          {config.dessertChoice === 'deser' && <DishSelect section="DESER" slotIndex={0} label="Wybór deseru" />}
          {config.dessertChoice === 'tort' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <ModeButton value="nas" current={config.cakeSource} onClick={() => updateConfig({ cakeSource: 'nas' })}>
                  🏠 Tort od nas
                </ModeButton>
                <ModeButton value="zewnetrzna" current={config.cakeSource} onClick={() => updateConfig({ cakeSource: 'zewnetrzna' })}>
                  🏢 Tort z firmy zewnętrznej
                </ModeButton>
              </div>
              {config.cakeSource === 'nas' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="label">Smak tortu</label>
                    <input
                      className="input w-full"
                      placeholder="np. czekoladowy z malinami, waniliowy..."
                      value={config.cakeFlavors || ''}
                      onChange={e => setConfig(p => ({...p, cakeFlavors: e.target.value}))}
                      onBlur={() => updateConfig({ cakeFlavors: config.cakeFlavors })}
                    />
                  </div>
                  <div>
                    <label className="label">Zdjęcie tortu (inspiracja)</label>
                    <input ref={cakeFileRef} type="file" accept="image/*" className="hidden" onChange={e => uploadCakeImage(e.target.files[0])} />
                    <button onClick={() => cakeFileRef.current?.click()} className="btn-secondary text-sm">
                      📷 {cakeImageUrl ? 'Zmień zdjęcie' : 'Wgraj zdjęcie'}
                    </button>
                    {cakeImageUrl && (
                      <div className="mt-3">
                        <img src={cakeImageUrl} alt="Tort" className="rounded-xl max-h-48 object-contain border border-gray-200" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {config.cakeSource === 'zewnetrzna' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
                  ℹ️ Tort zostanie dostarczony z firmy zewnętrznej. Prosimy o poinformowanie koordynatora o szczegółach dostawy.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1. CIEPŁE DANIE */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🍛 1. ciepłe danie</h2>
          <DishSelect section="CIEPLA_1" slotIndex={0} label="Danie" />
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2">
            <DishSelect section="DODATKI_CIEPLA_1" slotIndex={0} label="Dodatek" />
            <DishSelect section="SUROWKA_CIEPLA_1" slotIndex={0} label="Surówka" />
          </div>
        </div>

        {/* MIĘDZY 1 A 2: odwrotny deser/tort */}
        {config.dessertChoice === 'deser' && (
          <div className="card border-2 border-amber-100 bg-amber-50">
            <h2 className="font-bold text-gray-800 text-lg mb-3">🎂 Tort weselny</h2>
            <p className="text-gray-500 text-sm mb-4">Serwowany między daniami wieczorowymi</p>
            <div className="flex gap-3 flex-wrap mb-4">
              <ModeButton value="nas" current={config.cakeSource} onClick={() => updateConfig({ cakeSource: 'nas' })}>
                🏠 Tort od nas
              </ModeButton>
              <ModeButton value="zewnetrzna" current={config.cakeSource} onClick={() => updateConfig({ cakeSource: 'zewnetrzna' })}>
                🏢 Tort z firmy zewnętrznej
              </ModeButton>
            </div>
            {config.cakeSource === 'nas' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Smak tortu</label>
                  <input
                    className="input w-full"
                    placeholder="np. czekoladowy z malinami, waniliowy..."
                    value={config.cakeFlavors || ''}
                    onChange={e => setConfig(p => ({...p, cakeFlavors: e.target.value}))}
                    onBlur={() => updateConfig({ cakeFlavors: config.cakeFlavors })}
                  />
                </div>
                <div>
                  <label className="label">Zdjęcie tortu (inspiracja)</label>
                  <input ref={cakeFileRef} type="file" accept="image/*" className="hidden" onChange={e => uploadCakeImage(e.target.files[0])} />
                  <button onClick={() => cakeFileRef.current?.click()} className="btn-secondary text-sm">
                    📷 {cakeImageUrl ? 'Zmień zdjęcie' : 'Wgraj zdjęcie'}
                  </button>
                  {cakeImageUrl && (
                    <div className="mt-3">
                      <img src={cakeImageUrl} alt="Tort" className="rounded-xl max-h-48 object-contain border border-gray-200" />
                    </div>
                  )}
                </div>
              </div>
            )}
            {config.cakeSource === 'zewnetrzna' && (
              <div className="p-3 bg-amber-100 rounded-xl text-sm text-amber-900">
                ℹ️ Tort zostanie dostarczony z firmy zewnętrznej. Prosimy o poinformowanie koordynatora o szczegółach dostawy.
              </div>
            )}
          </div>
        )}
        {config.dessertChoice === 'tort' && (
          <div className="card border-2 border-rose-100 bg-rose-50">
            <h2 className="font-bold text-gray-800 text-lg mb-3">🍮 Deser wieczorny</h2>
            <DishSelect section="DESER" slotIndex={0} label="Wybór deseru wieczornego" />
          </div>
        )}

        {/* 2. CIEPŁE DANIE */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🍲 2. ciepłe danie</h2>
          <DishSelect section="CIEPLA_2" slotIndex={0} label="Danie" />
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2">
            <DishSelect section="DODATKI_CIEPLA_2" slotIndex={0} label="Dodatek" />
            <DishSelect section="SUROWKA_CIEPLA_2" slotIndex={0} label="Surówka" />
          </div>
        </div>

        {/* 3. CIEPŁE DANIE */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🥘 3. ciepłe danie</h2>
          <DishSelect section="CIEPLA_3" slotIndex={0} label="Danie" />
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2">
            <DishSelect section="DODATKI_CIEPLA_3" slotIndex={0} label="Dodatek" />
            <DishSelect section="SUROWKA_CIEPLA_3" slotIndex={0} label="Surówka" />
          </div>
        </div>

        {/* ZIMNA PŁYTA */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🧀 Zimna płyta (3 opcje)</h2>
          <DishSelect section="ZIMNA_PLYTA" slotIndex={0} label="Opcja 1" />
          <DishSelect section="ZIMNA_PLYTA" slotIndex={1} label="Opcja 2" />
          <DishSelect section="ZIMNA_PLYTA" slotIndex={2} label="Opcja 3" />
        </div>

        {/* SAŁATKI */}
        <div className="card">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🥙 Sałatki (2 opcje)</h2>
          <DishSelect section="SALATKI" slotIndex={0} label="Sałatka 1" />
          <DishSelect section="SALATKI" slotIndex={1} label="Sałatka 2" />
        </div>

        {/* SŁODKI STÓŁ */}
        <div className="card border-t-4 border-pink-200">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🍬 Słodki stół</h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            <ModeButton value="nas" current={config.sweetTableChoice} onClick={() => updateConfig({ sweetTableChoice: 'nas' })}>
              🏠 Zamawiamy u Was
            </ModeButton>
            <ModeButton value="zewnetrzna" current={config.sweetTableChoice} onClick={() => updateConfig({ sweetTableChoice: 'zewnetrzna' })}>
              🏢 Firma zewnętrzna
            </ModeButton>
            <ModeButton value="rezygnuje" current={config.sweetTableChoice} onClick={() => updateConfig({ sweetTableChoice: 'rezygnuje' })}>
              ❌ Rezygnujemy
            </ModeButton>
          </div>
          {config.sweetTableChoice === 'nas' && (
            <div className="pt-2">
              <label className="label">Kwota za słodki stół (zł)</label>
              {isAdmin ? (
                <input
                  type="number"
                  className="input w-48"
                  placeholder="np. 1500"
                  value={config.sweetTableAmount || ''}
                  onChange={e => setConfig(p => ({...p, sweetTableAmount: e.target.value}))}
                  onBlur={() => updateConfig({ sweetTableAmount: config.sweetTableAmount })}
                />
              ) : (
                <p className="text-gray-700 font-semibold">
                  {config.sweetTableAmount ? `${parseFloat(config.sweetTableAmount).toFixed(2)} zł` : 'Kwota zostanie ustalona z koordynatorem'}
                </p>
              )}
            </div>
          )}
          {config.sweetTableChoice === 'zewnetrzna' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
              ℹ️ Słodki stół z firmy zewnętrznej — prosimy o kontakt z koordynatorem w celu ustalenia szczegółów.
            </div>
          )}
          {config.sweetTableChoice === 'rezygnuje' && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
              Zrezygnowano ze słodkiego stołu.
            </div>
          )}
        </div>

        {/* PACZKI DLA GOŚCI */}
        <div className="card border-t-4 border-amber-200">
          <h2 className="font-bold text-gray-800 text-lg mb-4">🎁 Paczki dla gości (ciasto)</h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            <ModeButton value="nas" current={config.guestPackageChoice} onClick={() => updateConfig({ guestPackageChoice: 'nas' })}>
              🏠 Zamawiamy u Was
            </ModeButton>
            <ModeButton value="zewnetrzna" current={config.guestPackageChoice} onClick={() => updateConfig({ guestPackageChoice: 'zewnetrzna' })}>
              🏢 Firma zewnętrzna
            </ModeButton>
            <ModeButton value="nie" current={config.guestPackageChoice} onClick={() => updateConfig({ guestPackageChoice: 'nie' })}>
              ❌ Nie, dziękujemy
            </ModeButton>
          </div>
          {config.guestPackageChoice === 'nas' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="label">Cena za paczkę (zł / os.)</label>
                {isAdmin ? (
                  <input
                    type="number"
                    className="input w-48"
                    placeholder="np. 25"
                    value={config.guestPackagePrice || ''}
                    onChange={e => setConfig(p => ({...p, guestPackagePrice: e.target.value}))}
                    onBlur={() => updateConfig({ guestPackagePrice: config.guestPackagePrice })}
                  />
                ) : (
                  <p className="text-gray-700 font-semibold">
                    {config.guestPackagePrice ? `${parseFloat(config.guestPackagePrice).toFixed(2)} zł / os.` : 'Cena zostanie ustalona z koordynatorem'}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Liczba paczek</label>
                <p className="text-xs text-gray-400 mb-1">💡 Zazwyczaj 1 paczka na zaproszenie (1 na parę / rodzinę)</p>
                <input
                  type="number"
                  className="input w-48"
                  placeholder="np. 80"
                  min={1}
                  value={config.guestPackageCount || ''}
                  onChange={e => setConfig(p => ({...p, guestPackageCount: e.target.value}))}
                  onBlur={() => updateConfig({ guestPackageCount: config.guestPackageCount ? parseInt(config.guestPackageCount) : null })}
                />
              </div>
            </div>
          )}
          {config.guestPackageChoice === 'zewnetrzna' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
              ℹ️ Paczki dla gości z firmy zewnętrznej — prosimy o kontakt z koordynatorem.
            </div>
          )}
        </div>

        {/* WIEJSKI STÓŁ */}
        <div className="card border-t-4 border-green-200">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
            <h2 className="font-bold text-gray-800 text-lg">🌾 Wiejski stół</h2>
            <span style={{ background: '#f0f9f0', color: '#2d6a2d', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px', border: '1px solid #b6ddb6' }}>
              BEZPŁATNY
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Tradycyjny wiejski stół z lokalnymi przysmakami — pieczywo, sery, wędliny, przetwory. Dostępny bezpłatnie w ramach Waszego wesela.
          </p>
          <div className="flex gap-3 flex-wrap">
            <ModeButton value="tak" current={config.wiejskiStol} onClick={() => updateConfig({ wiejskiStol: 'tak' })}>
              ✅ Tak, chcemy
            </ModeButton>
            <ModeButton value="nie" current={config.wiejskiStol} onClick={() => updateConfig({ wiejskiStol: 'nie' })}>
              ❌ Nie, dziękujemy
            </ModeButton>
          </div>
          {config.wiejskiStol === 'tak' && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200 text-sm text-green-800">
              🌾 Świetnie! Wiejski stół zostanie przygotowany — skontaktujemy się w sprawie szczegółów.
            </div>
          )}
        </div>

        {/* PRZYCISK ZATWIERDZENIA — tylko para, gdy nie zatwierdzone */}
        {isCouple && !config.locked && (
          <div className="card border-2 border-green-200 bg-green-50 text-center py-6">
            <p className="text-gray-600 mb-4">Gdy skończysz wybierać, zatwierdź wstępnie menu. Będziesz mógł je wydrukować i wrócić do edycji.</p>
            <button onClick={approveMeniu} className="btn-primary px-8 py-3 text-base">
              ✅ Zatwierdź wstępnie menu
            </button>
          </div>
        )}

      </>)}
    </div>
  );
}
