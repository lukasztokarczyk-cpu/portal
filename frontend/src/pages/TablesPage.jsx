import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

const CANVAS_W = 900;
const CANVAS_H = 600;

// Specjalne typy stolów prostokątnych (tylko przy trybie okrągłym)
const SPECIAL_RECT_TYPES = [
  { value: 'couple', label: '💍 Stół Pary Młodej' },
  { value: 'dj', label: '🎧 DJ / Zespół' },
  { value: 'photographer', label: '📷 Fotograf' },
];

function TableShape({ table, selected, onSelect, onDragStart }) {
  const isRound = table.shape === 'round';
  const rotated = (table.rotation || 0) === 90;
  // Okrągły: 210cm ~84px; Prostokątny: 140x90cm ~112x72px (obrócony: 72x112px)
  const W = isRound ? 84 : (rotated ? 72 : 112);
  const H = isRound ? 84 : (rotated ? 112 : 72);
  const filled = table.guests?.length || 0;
  const pct = filled / table.capacity;
  const fillColor = pct >= 1 ? '#fca5a5' : pct > 0.7 ? '#fde68a' : '#d1fae5';
  const strokeColor = selected ? '#e11d48' : table.specialType ? '#7c3aed' : '#fda4af';
  const strokeWidth = selected ? 3 : table.specialType ? 2.5 : 1.5;

  return (
    <g
      transform={`translate(${table.posX},${table.posY})`}
      style={{ cursor: 'grab' }}
      onClick={(e) => { e.stopPropagation(); onSelect(table); }}
      onMouseDown={(e) => onDragStart(e, table)}
    >
      {isRound ? (
        <circle cx={42} cy={42} r={42} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      ) : (
        <rect width={W} height={H} rx={8} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
      <text x={W/2} y={H/2 - 7} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#be123c" fontWeight="700">
        {table.name.length > 14 ? table.name.slice(0, 14) + '…' : table.name}
      </text>
      <text x={W/2} y={H/2 + 9} textAnchor="middle" fontSize="9" fill="#6b7280">
        {filled}/{table.capacity} os.
      </text>
      {!isRound && (
        <text x={W/2} y={H - 6} textAnchor="middle" fontSize="8" fill="#9ca3af">
          {rotated ? '↕' : '↔'}
        </text>
      )}
    </g>
  );
}

export default function TablesPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'coordinator'].includes(user?.role);
  const isCouple = user?.role === 'couple';

  const [weddingId, setWeddingId] = useState(null);
  const [weddings, setWeddings] = useState([]);
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [floorPlanUrl, setFloorPlanUrl] = useState(null);
  const [tableMode, setTableMode] = useState(null); // 'round' | 'rectangular'
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', shape: 'round', capacity: 8, specialType: '' });
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', isChild: false });
  const [editTable, setEditTable] = useState(null);
  const dragging = useRef(null);
  const svgRef = useRef();
  const positionsRef = useRef({});

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then(r => setWeddingId(r.data.id)).catch(console.error);
    } else {
      api.get('/weddings').then(r => {
        setWeddings(r.data);
        if (r.data[0]) setWeddingId(r.data[0].id);
      }).catch(console.error);
    }
  }, [isCouple]);

  const refresh = useCallback(() => {
    if (!weddingId) return;
    Promise.all([
      api.get(`/tables/wedding/${weddingId}`),
      api.get(`/guests/wedding/${weddingId}`),
      api.get(`/tables/wedding/${weddingId}/floor-plan`),
    ]).then(([t, g, fp]) => {
      const tablesData = t.data;
      setTables(tablesData);
      tablesData.forEach(t => { positionsRef.current[t.id] = { posX: t.posX, posY: t.posY }; });
      setGuests(g.data.guests || g.data);
      setFloorPlanUrl(fp.data.url);
      // Wykryj tryb stołów (na podstawie stołów bez specialType)
      const normalTables = tablesData.filter(t => !t.specialType);
      if (normalTables.length > 0) {
        const hasRound = normalTables.some(t => t.shape === 'round');
        setTableMode(hasRound ? 'round' : 'rectangular');
      }
    }).catch(console.error);
  }, [weddingId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (selected) {
      const updated = tables.find(t => t.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [tables]);

  // Aktualizuj newTable.shape gdy zmienia się tableMode
  useEffect(() => {
    if (tableMode === 'rectangular') {
      setNewTable(p => ({ ...p, shape: 'rectangular', capacity: 10, specialType: '' }));
    } else if (tableMode === 'round') {
      setNewTable(p => ({ ...p, shape: 'round', capacity: 8, specialType: '' }));
    }
  }, [tableMode]);

  const handleDragStart = (e, table) => {
    e.preventDefault();
    const svg = svgRef.current.getBoundingClientRect();
    const startX = e.clientX - svg.left - table.posX;
    const startY = e.clientY - svg.top - table.posY;
    dragging.current = { id: table.id };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const tableWidth = 150;
      const tableHeight = 100;
      const x = Math.max(0, Math.min(CANVAS_W - tableWidth, ev.clientX - svg.left - startX));
      const y = Math.max(0, Math.min(CANVAS_H - tableHeight, ev.clientY - svg.top - startY));
      positionsRef.current[dragging.current.id] = { posX: x, posY: y };
      setTables(prev => prev.map(t => t.id === dragging.current?.id ? { ...t, posX: x, posY: y } : t));
    };

    const onUp = async () => {
      if (!dragging.current) return;
      const pos = positionsRef.current[dragging.current.id];
      if (pos) {
        try {
          await api.patch(`/tables/${dragging.current.id}/position`, { posX: pos.posX, posY: pos.posY, rotation: 0 });
        } catch { toast.error('Błąd zapisu pozycji'); }
      }
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const setMode = (mode) => {
    if (tables.filter(t => !t.specialType).length > 0) {
      toast.error('Nie można zmienić trybu — usuń najpierw wszystkie stoliki gości');
      return;
    }
    setTableMode(mode);
  };

  const addTable = async () => {
    if (!newTable.name.trim()) return toast.error('Podaj nazwę stolika');

    let shape = newTable.shape;
    let capacity = parseInt(newTable.capacity) || 8;

    if (newTable.specialType) {
      // Specjalny prostokątny stół (przy trybie okrągłym)
      shape = 'rectangular';
      capacity = Math.min(24, Math.max(6, capacity));
    } else if (tableMode === 'round') {
      shape = 'round';
      capacity = Math.min(12, Math.max(1, capacity));
    } else {
      shape = 'rectangular';
      capacity = Math.min(24, Math.max(6, capacity));
    }

    try {
      await api.post(`/tables/wedding/${weddingId}`, {
        name: newTable.name,
        shape,
        capacity,
        specialType: newTable.specialType || null,
        posX: 80 + Math.random() * 500,
        posY: 80 + Math.random() * 300,
      });
      setNewTable({ name: '', shape: tableMode === 'round' ? 'round' : 'rectangular', capacity: tableMode === 'round' ? 8 : 10, specialType: '' });
      setShowAddTable(false);
      toast.success('Stolik dodany');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const deleteTable = async (id) => {
    if (!confirm('Usunąć stolik? Goście zostaną odpisani.')) return;
    try {
      await api.delete(`/tables/${id}`);
      setSelected(null);
      toast.success('Stolik usunięty');
      refresh();
    } catch { toast.error('Błąd usuwania'); }
  };

  const addGuestToTable = async () => {
    if (!newGuest.firstName.trim() || !newGuest.lastName.trim()) return toast.error('Podaj imię i nazwisko');
    try {
      await api.post(`/tables/${selected.id}/guests`, newGuest);
      setNewGuest({ firstName: '', lastName: '', isChild: false });
      setShowAddGuest(false);
      toast.success('Gość dodany');
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  const assignGuest = async (guestId, tableId) => {
    try {
      await api.patch(`/tables/wedding/${weddingId}/assign-guest`, { guestId, tableId });
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Stolik pełny'); }
  };

  const uploadFloorPlan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('floorPlan', file);
    try {
      await api.post(`/tables/wedding/${weddingId}/floor-plan`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Rzut sali wgrany');
      refresh();
    } catch { toast.error('Błąd uploadu'); }
  };

  const saveTableEdit = async () => {
    if (!editTable) return;
    try {
      await api.patch(`/tables/${editTable.id}`, { name: editTable.name, capacity: editTable.capacity });
      toast.success('Zapisano');
      setEditTable(null);
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const rotateTable = async (table) => {
    if (table.shape === 'round') return;
    const newRotation = (table.rotation || 0) === 0 ? 90 : 0;
    try {
      await api.patch(`/tables/${table.id}/position`, { posX: table.posX, posY: table.posY, rotation: newRotation });
      refresh();
    } catch { toast.error('Błąd rotacji'); }
  };

  const [approved, setApproved] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [planPreview, setPlanPreview] = useState(null); // { html, coupleEmail }

  const approvePlan = async () => {
    if (!confirm('Zatwierdzić plan stołów? Po zatwierdzeniu będzie można go wydrukować lub wysłać emailem.')) return;
    setApproved(true);
    toast.success('Plan zatwierdzony!');
  };

  const printPlan = () => { window.print(); };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await api.post(`/tables/wedding/${weddingId}/send-plan`);
      if (res.data.noSmtp || !res.data.sentTo) {
        // Brak SMTP lub brak emaila — pokaż podgląd planu
        setPlanPreview({ html: res.data.html, coupleEmail: res.data.coupleEmail });
      } else {
        toast.success(`Plan wysłany na ${res.data.sentTo}!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Błąd wysyłania');
    } finally { setSendingEmail(false); }
  };

  const selectedTable = selected ? tables.find(t => t.id === selected.id) : null;
  const unassignedGuests = guests.filter(g => !g.tableId);
  const assignedGuests = guests.filter(g => g.tableId).length;

  // Czy można dodać specjalny prostokątny stół
  const canAddSpecialRect = tableMode === 'round';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Plan stołów</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={weddingId || ''} onChange={e => setWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w?.couple?.name || w?.couple?.email}</option>)}
            </select>
          )}
          {isAdmin && (
            <label className="btn-secondary text-sm cursor-pointer">
              🖼️ Rzut sali
              <input type="file" accept="image/*" className="hidden" onChange={uploadFloorPlan} />
            </label>
          )}
          <button onClick={() => setShowAddTable(true)} className="btn-primary text-sm">+ Dodaj stolik</button>
          {tables.length > 0 && !approved && (
            <button onClick={approvePlan} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all">
              ✅ Zatwierdź plan
            </button>
          )}
          {approved && (
            <>
              <button onClick={printPlan} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all">
                🖨️ Drukuj
              </button>
              <button onClick={sendEmail} disabled={sendingEmail} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                {sendingEmail ? '...' : '📧 Wyślij emailem'}
              </button>
              <button onClick={() => setApproved(false)} className="text-sm text-gray-400 hover:text-gray-600">
                ✏️ Edytuj
              </button>
            </>
          )}
        </div>
      </div>

      {/* Wybór trybu stołów */}
      {!tableMode && tables.length === 0 && (
        <div className="card border-2 border-rose-100 bg-rose-50">
          <h2 className="font-bold text-gray-800 mb-3">Wybierz typ stołów dla gości:</h2>
          <div className="flex gap-4 flex-wrap">
            <button onClick={() => setMode('round')} className="flex-1 min-w-48 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-rose-400 transition-all text-center">
              <div className="text-3xl mb-1">⬤</div>
              <p className="font-semibold text-gray-800">Stoły okrągłe</p>
              <p className="text-xs text-gray-500 mt-1">max 12 gości / stół</p>
              <p className="text-xs text-gray-400 mt-1">+ można dodać prostokątny dla Pary / DJ / Fotografa</p>
            </button>
            <button onClick={() => setMode('rectangular')} className="flex-1 min-w-48 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-rose-400 transition-all text-center">
              <div className="text-3xl mb-1">⬛</div>
              <p className="font-semibold text-gray-800">Stoły prostokątne</p>
              <p className="text-xs text-gray-500 mt-1">6–24 gości / stół</p>
              <p className="text-xs text-gray-400 mt-1">tylko prostokątne dla wszystkich</p>
            </button>
          </div>
        </div>
      )}

      {/* Tryb aktywny */}
      {tableMode && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Tryb: <strong>{tableMode === 'round' ? '⬤ Okrągłe' : '⬛ Prostokątne'}</strong></span>
          {tables.filter(t => !t.specialType).length === 0 && (
            <button onClick={() => setTableMode(null)} className="text-xs text-rose-500 underline">Zmień tryb</button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
        <span>🪑 Stoliki: {tables.length}</span>
        <span>👥 Gości: {assignedGuests}/{guests.length} przypisanych</span>
        <span className={unassignedGuests.length > 0 ? 'text-orange-500' : 'text-green-600'}>
          {unassignedGuests.length > 0 ? `⚠️ Nieprzypisanych: ${unassignedGuests.length}` : '✅ Wszyscy przypisani'}
        </span>
      </div>

      {/* Modal dodawania stolika */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Nowy stolik</h2>

            <input className="input w-full" placeholder="Nazwa stolika (np. Stół 1)" value={newTable.name}
              onChange={e => setNewTable(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTable()}
            />

            {/* Przy trybie okrągłym — można dodać specjalny prostokątny */}
            {canAddSpecialRect && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Typ stolika:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewTable(p => ({ ...p, specialType: '', shape: 'round', capacity: 8 }))}
                    className={`py-2 rounded-xl border-2 text-sm ${!newTable.specialType ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200'}`}
                  >
                    ⬤ Okrągły (gość)
                  </button>
                  {SPECIAL_RECT_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => setNewTable(p => ({ ...p, specialType: t.value, shape: 'rectangular', capacity: 10 }))}
                      className={`py-2 rounded-xl border-2 text-sm ${newTable.specialType === t.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pojemność */}
            <div>
              <label className="text-sm text-gray-600">
                Pojemność {newTable.specialType || tableMode === 'rectangular' ? '(6–24)' : '(max 12)'}:
              </label>
              <input type="number" className="input w-full mt-1"
                min={newTable.specialType || tableMode === 'rectangular' ? 6 : 1}
                max={newTable.specialType || tableMode === 'rectangular' ? 24 : 12}
                value={newTable.capacity}
                onChange={e => setNewTable(p => ({ ...p, capacity: parseInt(e.target.value) || p.capacity }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddTable(false)} className="btn-secondary flex-1">Anuluj</button>
              <button onClick={addTable} className="btn-primary flex-1">Dodaj</button>
            </div>
          </div>
        </div>
      )}

      {/* Główny widok */}
      <div className="flex gap-4 items-start flex-col lg:flex-row">
        {/* Canvas SVG */}
        <div className="flex-1 w-full card p-0 overflow-hidden rounded-xl border border-gray-200">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="block w-full"
            style={{
              background: floorPlanUrl ? '#f8f8f8' : 'linear-gradient(135deg, #fff7f7 0%, #fdf2f8 100%)',
              minHeight: '300px',
              maxHeight: '600px',
            }}
            onClick={() => setSelected(null)}
          >
            {!floorPlanUrl && (
              <>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />
              </>
            )}
            {floorPlanUrl && (
              <image
                href={floorPlanUrl}
                x="0"
                y="0"
                width={CANVAS_W}
                height={CANVAS_H}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            {tables.map(t => (
              <TableShape key={t.id} table={t} selected={selected?.id === t.id} onSelect={setSelected} onDragStart={handleDragStart} />
            ))}
          </svg>
        </div>

        {/* Panel boczny */}
        <div className="w-full lg:w-72 space-y-3 shrink-0">
          {/* Wybrany stolik */}
          {selectedTable ? (
            <div className="card space-y-3">
              {editTable?.id === selectedTable.id ? (
                <>
                  <input className="input w-full font-bold" value={editTable.name} onChange={e => setEditTable(p => ({ ...p, name: e.target.value }))} />
                  <input type="number" className="input w-full"
                    min={selectedTable.shape === 'round' ? 1 : 6}
                    max={selectedTable.shape === 'round' ? 12 : 24}
                    value={editTable.capacity}
                    onChange={e => setEditTable(p => ({ ...p, capacity: parseInt(e.target.value) }))}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditTable(null)} className="btn-secondary flex-1 text-sm">Anuluj</button>
                    <button onClick={saveTableEdit} className="btn-primary flex-1 text-sm">Zapisz</button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedTable.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedTable.shape === 'round' ? '⬤ Okrągły' : '⬛ Prostokątny'}
                      {selectedTable.specialType && ` • ${SPECIAL_RECT_TYPES.find(t => t.value === selectedTable.specialType)?.label || ''}`}
                      {' '}• {selectedTable.guests?.length || 0}/{selectedTable.capacity} miejsc
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && <button onClick={() => setEditTable({ ...selectedTable })} className="text-gray-400 hover:text-gray-600">✏️</button>}
                    {selectedTable.shape !== 'round' && (
                      <button onClick={() => rotateTable(selectedTable)} className="text-blue-400 hover:text-blue-600" title="Obróć stolik">
                        {(selectedTable.rotation || 0) === 0 ? '↕' : '↔'}
                      </button>
                    )}
                    <button onClick={() => deleteTable(selectedTable.id)} className="text-red-400 hover:text-red-600" title="Usuń stolik">🗑️</button>
                  </div>
                </div>
              )}

              {/* Goście przy stoliku */}
              <div className="space-y-1">
                {(selectedTable.guests || []).map(g => (
                  <div key={g.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-2 py-1.5">
                    <span>{g.firstName} {g.lastName} {g.isChild ? '👶' : ''}</span>
                    <button onClick={() => assignGuest(g.id, null)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">✕</button>
                  </div>
                ))}
                {(selectedTable.guests?.length || 0) < selectedTable.capacity && !showAddGuest && (
                  <button onClick={() => setShowAddGuest(true)} className="w-full text-xs text-rose-500 border border-rose-200 rounded-lg py-1.5 hover:bg-rose-50">
                    + Nowy gość
                  </button>
                )}
              </div>

              {/* Formularz nowego gościa */}
              {showAddGuest && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">Nowy gość:</p>
                  <input className="input w-full text-sm" placeholder="Imię" value={newGuest.firstName} onChange={e => setNewGuest(p => ({ ...p, firstName: e.target.value }))} />
                  <input className="input w-full text-sm" placeholder="Nazwisko" value={newGuest.lastName} onChange={e => setNewGuest(p => ({ ...p, lastName: e.target.value }))} />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={newGuest.isChild} onChange={e => setNewGuest(p => ({ ...p, isChild: e.target.checked }))} />
                    Dziecko
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddGuest(false)} className="btn-secondary flex-1 text-xs">Anuluj</button>
                    <button onClick={addGuestToTable} className="btn-primary flex-1 text-xs">Dodaj</button>
                  </div>
                </div>
              )}

              {/* Przypisz z listy */}
              {unassignedGuests.length > 0 && !showAddGuest && (selectedTable.guests?.length || 0) < selectedTable.capacity && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Przypisz z listy gości:</p>
                  <select className="input text-sm w-full" onChange={e => { if (e.target.value) { assignGuest(e.target.value, selectedTable.id); e.target.value = ''; } }}>
                    <option value="">— wybierz gościa —</option>
                    {unassignedGuests.map(g => (
                      <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center text-gray-400 text-sm py-8">
              <p>🪑 Kliknij stolik<br />aby go wybrać i zarządzać</p>
            </div>
          )}

          {/* Nieprzypisani */}
          {unassignedGuests.length > 0 && (
            <div className="card">
              <h4 className="font-medium text-gray-700 mb-2 text-sm">⚠️ Nieprzypisani ({unassignedGuests.length})</h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {unassignedGuests.map(g => (
                  <div key={g.id} className="text-xs text-gray-600 py-1 px-2 bg-gray-50 rounded">
                    {g.firstName} {g.lastName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legenda */}
          <div className="card text-xs space-y-1.5 text-gray-500">
            <p className="font-medium text-gray-600 mb-1">Legenda:</p>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100 border border-green-300" /><span>Wolne miejsca</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" /><span>&gt;70% zajęte</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border border-red-300" /><span>Pełny stolik</span></div>
            {tableMode === 'round' && <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-purple-400" /><span>Stół specjalny</span></div>}
          </div>
        </div>
      </div>

      {/* Modal podglądu planu */}
      {planPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-lg text-gray-800">📋 Podgląd planu stołów</h3>
                {planPreview.coupleEmail
                  ? <p className="text-sm text-gray-500">Email: {planPreview.coupleEmail}</p>
                  : <p className="text-sm text-amber-600">⚠️ Para nie ma adresu email — możesz tylko wydrukować</p>
                }
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    w.document.write(planPreview.html);
                    w.document.close();
                    w.print();
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl"
                >
                  🖨️ Drukuj plan
                </button>
                <button onClick={() => setPlanPreview(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl">
                  Zamknij
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <div dangerouslySetInnerHTML={{ __html: planPreview.html }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
