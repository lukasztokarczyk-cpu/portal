import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

const SECTION_LABELS = {
  ZUPA:         'Zupa',
  DANIE_GLOWNE: 'Danie główne',
  SUROWKI:      'Surówki do obiadu',
  DESER:        'Deser',
  CIEPLA_1:     '1. ciepłe danie',
  CIEPLA_2:     '2. ciepłe danie',
  CIEPLA_3:     '3. ciepłe danie',
  ZIMNA_PLYTA:  'Zimna płyta',
  SALATKI:      'Sałatki',
};

// Ile slotów na sekcję (dla pary)
const getMaxSlots = (section, config) => {
  if (section === 'DANIE_GLOWNE') return config?.mainCourseMode === 'polmisek' ? 3 : 2;
  if (section === 'SUROWKI') return 3;
  if (section === 'ZIMNA_PLYTA') return 3;
  if (section === 'SALATKI') return 2;
  return 1;
};

// Kolejność sekcji wyświetlania
const getSectionOrder = (dessertChoice) => {
  const base = ['ZUPA', 'DANIE_GLOWNE', 'SUROWKI'];
  // Deser lub tort na pierwszej pozycji
  base.push('DESER');
  base.push('CIEPLA_1');
  // Między CIEPLA_1 a CIEPLA_2: jeśli wybrali deser -> tort, jeśli tort -> deser
  if (dessertChoice === 'deser') base.push('_TORT');
  if (dessertChoice === 'tort') base.push('_DESER_Z_MENU');
  base.push('CIEPLA_2', 'CIEPLA_3', 'ZIMNA_PLYTA', 'SALATKI');
  return base;
};

export default function MenuPage() {
  const { user } = useAuth();
  const isCouple = user?.role === 'couple';
  const isAdmin = ['admin', 'coordinator'].includes(user?.role);

  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [config, setConfig] = useState({ mainCourseMode: null, dessertChoice: null, locked: false });
  const [loading, setLoading] = useState(false);

  // Admin: zarządzanie daniami
  const [dishes, setDishes] = useState({});
  const [adminView, setAdminView] = useState('menu'); // 'menu' | 'dishes'
  const [newDish, setNewDish] = useState({ section: 'ZUPA', name: '', description: '' });

  // Załaduj wesela
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

  // Załaduj menu wesela
  useEffect(() => {
    if (!selectedWeddingId) return;
    setLoading(true);
    api.get(`/menu/wedding/${selectedWeddingId}`)
      .then(r => {
        setMenuData(r.data);
        setConfig(r.data.config);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedWeddingId]);

  const refreshMenu = () => {
    api.get(`/menu/wedding/${selectedWeddingId}`).then(r => {
      setMenuData(r.data);
      setConfig(r.data.config);
    });
  };

  const updateConfig = async (updates) => {
    try {
      const res = await api.patch(`/menu/wedding/${selectedWeddingId}/config`, updates);
      setConfig(res.data);
      refreshMenu();
    } catch { toast.error('Błąd aktualizacji'); }
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
      toast.success('Danie usunięte');
    } catch { toast.error('Błąd'); }
  };

  // Pobierz wybraną potrawę dla slotu
  const getSelection = (section, slotIndex = 0) => {
    if (!menuData) return null;
    const sels = menuData.selectionsBySection[section] || [];
    return sels.find(s => s.slotIndex === slotIndex)?.dish || null;
  };

  // Render selecta z daniami
  const DishSelect = ({ section, slotIndex = 0, label }) => {
    const currentDish = getSelection(section, slotIndex);
    const available = menuData?.dishesBySection[section] || [];
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
        {currentDish && <p className="text-xs text-rose-600 mt-1">✓ Wybrano: {currentDish.name}</p>}
      </div>
    );
  };

  // WIDOK ADMINA — zarządzanie daniami
  if (isAdmin && adminView === 'dishes') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Zarządzanie daniami</h1>
          <button onClick={() => setAdminView('menu')} className="btn-secondary">← Wróć do menu</button>
        </div>

        {/* Dodaj nowe danie */}
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

        {/* Lista dań per sekcja */}
        {Object.entries(SECTION_LABELS).map(([section, label]) => (
          <div key={section} className="card">
            <h3 className="font-semibold text-gray-700 mb-3">{label}</h3>
            {(dishes[section]?.dishes || []).length === 0 ? (
              <p className="text-gray-400 text-sm">Brak dań w tej kategorii</p>
            ) : (
              <div className="space-y-2">
                {(dishes[section]?.dishes || []).map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{d.name}</span>
                      {d.description && <span className="text-sm text-gray-500 ml-2">— {d.description}</span>}
                    </div>
                    <button onClick={() => deleteDish(d.id)} className="text-red-500 hover:text-red-700 text-sm px-2">✕ Usuń</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // WIDOK MENU WESELA
  const sectionOrder = getSectionOrder(config.dessertChoice);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Menu weselne</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={selectedWeddingId || ''} onChange={e => setSelectedWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w.brideName} i {w.groomName}</option>)}
            </select>
          )}
          {isAdmin && (
            <button onClick={() => setAdminView('dishes')} className="btn-secondary text-sm">
              🍽️ Zarządzaj daniami
            </button>
          )}
          {isAdmin && (
            <button onClick={() => updateConfig({ locked: !config.locked })} className="btn-secondary text-sm">
              {config.locked ? '🔓 Odblokuj' : '🔒 Zatwierdź'}
            </button>
          )}
          {config.locked && <span className="text-sm text-orange-600 font-medium">🔒 Menu zatwierdzone</span>}
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Ładowanie...</div>}

      {!loading && menuData && (
        <div className="space-y-5">

          {/* ZUPA */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🍲 Zupa</h2>
            <DishSelect section="ZUPA" slotIndex={0} label="Wybór zupy" />
          </div>

          {/* DANIE GŁÓWNE */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🥩 Danie główne</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Sposób serwowania:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => updateConfig({ mainCourseMode: 'polmisek' })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${config.mainCourseMode === 'polmisek' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-rose-300'}`}
                >
                  🍖 Na półmiskach (3 mięsa)
                </button>
                <button
                  onClick={() => updateConfig({ mainCourseMode: 'talerz' })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${config.mainCourseMode === 'talerz' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-rose-300'}`}
                >
                  🍽️ Na talerzu (2 mięsa)
                </button>
              </div>
            </div>
            {config.mainCourseMode && (
              <div className="space-y-2">
                {Array.from({ length: getMaxSlots('DANIE_GLOWNE', config) }).map((_, i) => (
                  <DishSelect key={i} section="DANIE_GLOWNE" slotIndex={i} label={`Mięso ${i + 1}`} />
                ))}
              </div>
            )}
            {!config.mainCourseMode && <p className="text-gray-400 text-sm">Wybierz sposób serwowania powyżej</p>}
          </div>

          {/* SURÓWKI */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🥗 Surówki do obiadu</h2>
            {[0, 1, 2].map(i => (
              <DishSelect key={i} section="SUROWKI" slotIndex={i} label={`Surówka ${i + 1}`} />
            ))}
          </div>

          {/* DESER */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🍰 Deser</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Wybór:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => updateConfig({ dessertChoice: 'deser' })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${config.dessertChoice === 'deser' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-rose-300'}`}
                >
                  🍮 Deser z menu
                </button>
                <button
                  onClick={() => updateConfig({ dessertChoice: 'tort' })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${config.dessertChoice === 'tort' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-rose-300'}`}
                >
                  🎂 Tort
                </button>
              </div>
            </div>
            {config.dessertChoice === 'deser' && (
              <DishSelect section="DESER" slotIndex={0} label="Wybór deseru" />
            )}
            {config.dessertChoice === 'tort' && (
              <p className="text-rose-600 font-medium">🎂 Wybrано tort weselny</p>
            )}
          </div>

          {/* 1. CIEPŁE DANIE */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🍛 1. ciepłe danie</h2>
            <DishSelect section="CIEPLA_1" slotIndex={0} label="Wybór dania" />
          </div>

          {/* MIĘDZY 1 A 2 CIEPŁYM: odwrotny deser */}
          {config.dessertChoice === 'deser' && (
            <div className="card border-2 border-rose-100 bg-rose-50">
              <h2 className="font-bold text-gray-800 text-lg mb-2">🎂 Tort weselny</h2>
              <p className="text-gray-600 text-sm">Ponieważ wybrano deser z menu, tutaj serwowany jest tort weselny.</p>
            </div>
          )}
          {config.dessertChoice === 'tort' && (
            <div className="card border-2 border-rose-100 bg-rose-50">
              <h2 className="font-bold text-gray-800 text-lg mb-4">🍮 Deser wieczorny</h2>
              <DishSelect section="DESER" slotIndex={0} label="Wybór deseru wieczornego" />
            </div>
          )}

          {/* 2. CIEPŁE DANIE */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🍲 2. ciepłe danie</h2>
            <DishSelect section="CIEPLA_2" slotIndex={0} label="Wybór dania" />
          </div>

          {/* 3. CIEPŁE DANIE */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🥘 3. ciepłe danie</h2>
            <DishSelect section="CIEPLA_3" slotIndex={0} label="Wybór dania" />
          </div>

          {/* ZIMNA PŁYTA */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🧀 Zimna płyta</h2>
            {[0, 1, 2].map(i => (
              <DishSelect key={i} section="ZIMNA_PLYTA" slotIndex={i} label={`Opcja ${i + 1}`} />
            ))}
          </div>

          {/* SAŁATKI */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🥙 Sałatki</h2>
            {[0, 1].map(i => (
              <DishSelect key={i} section="SALATKI" slotIndex={i} label={`Sałatka ${i + 1}`} />
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
