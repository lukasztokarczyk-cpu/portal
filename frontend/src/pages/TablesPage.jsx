import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

const CANVAS_W = 900;
const CANVAS_H = 600;

function TableShape({ table, selected, onSelect, onDragStart, isDraggable }) {
  const isRound = table.shape === 'round';
  const W = isRound ? 90 : 130;
  const H = isRound ? 90 : 70;
  const filled = table.guests?.length || 0;
  const pct = filled / table.capacity;
  const fillColor = pct >= 1 ? '#fca5a5' : pct > 0.7 ? '#fde68a' : '#d1fae5';
  const strokeColor = selected ? '#e11d48' : '#fda4af';

  return (
    <g
      transform={`translate(${table.posX},${table.posY})`}
      style={{ cursor: isDraggable ? 'grab' : 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onSelect(table); }}
      onMouseDown={isDraggable ? (e) => onDragStart(e, table) : undefined}
    >
      {isRound ? (
        <circle cx={45} cy={45} r={44} fill={fillColor} stroke={strokeColor} strokeWidth={selected ? 3 : 1.5} />
      ) : (
        <rect width={W} height={H} rx={8} fill={fillColor} stroke={strokeColor} strokeWidth={selected ? 3 : 1.5} />
      )}
      <text x={W / 2} y={H / 2 - 6} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#be123c" fontWeight="700">
        {table.name.length > 12 ? table.name.slice(0, 12) + '…' : table.name}
      </text>
      <text x={W / 2} y={H / 2 + 10} textAnchor="middle" fontSize="10" fill="#6b7280">
        {filled}/{table.capacity} os.
      </text>
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
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', shape: 'round', capacity: 8 });
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', isChild: false });
  const [editTable, setEditTable] = useState(null);
  const dragging = useRef(null);
  const svgRef = useRef();
  const positionsRef = useRef({});

  // Load weddings
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
    }).catch(console.error);
  }, [weddingId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Update selected table from tables list
  useEffect(() => {
    if (selected) {
      const updated = tables.find(t => t.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [tables]);

  const handleDragStart = (e, table) => {
    e.preventDefault();
    const svg = svgRef.current.getBoundingClientRect();
    const startX = e.clientX - svg.left - table.posX;
    const startY = e.clientY - svg.top - table.posY;
    dragging.current = { id: table.id };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const x = Math.max(0, Math.min(CANVAS_W - 140, ev.clientX - svg.left - startX));
      const y = Math.max(0, Math.min(CANVAS_H - 100, ev.clientY - svg.top - startY));
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

  const addTable = async () => {
    if (!newTable.name.trim()) return toast.error('Podaj nazwę stolika');
    const maxCap = newTable.shape === 'round' ? 12 : 24;
    const minCap = newTable.shape === 'round' ? 1 : 6;
    const cap = Math.min(maxCap, Math.max(minCap, parseInt(newTable.capacity) || 8));
    try {
      await api.post(`/tables/wedding/${weddingId}`, {
        name: newTable.name,
        shape: newTable.shape,
        capacity: cap,
        posX: 80 + Math.random() * 500,
        posY: 80 + Math.random() * 300,
      });
      setNewTable({ name: '', shape: 'round', capacity: 8 });
      setShowAddTable(false);
      toast.success('Stolik dodany');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const deleteTable = async (id) => {
    if (!confirm('Usunąć stolik i odznaczyć gości?')) return;
    try {
      await api.delete(`/tables/${id}`);
      setSelected(null);
      toast.success('Stolik usunięty');
      refresh();
    } catch { toast.error('Błąd'); }
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
      await api.patch(`/tables/${editTable.id}`, { name: editTable.name, shape: editTable.shape, capacity: editTable.capacity });
      toast.success('Zapisano');
      setEditTable(null);
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const selectedTable = selected ? tables.find(t => t.id === selected.id) : null;
  const unassignedGuests = guests.filter(g => !g.tableId);
  const totalGuests = guests.length;
  const assignedGuests = guests.filter(g => g.tableId).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Plan stołów</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={weddingId || ''} onChange={e => setWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w.brideName} i {w.groomName}</option>)}
            </select>
          )}
          {isAdmin && (
            <label className="btn-secondary text-sm cursor-pointer">
              🖼️ Wgraj rzut sali
              <input type="file" accept="image/*" className="hidden" onChange={uploadFloorPlan} />
            </label>
          )}
          <button onClick={() => setShowAddTable(true)} className="btn-primary text-sm">+ Dodaj stolik</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>🪑 Stoliki: {tables.length}</span>
        <span>👥 Gości: {assignedGuests}/{totalGuests} przypisanych</span>
        <span>⚠️ Nieprzypisanych: {unassignedGuests.length}</span>
      </div>

      {/* Modal dodawania stolika */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="card w-96 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Nowy stolik</h2>
            <input className="input w-full" placeholder="Nazwa stolika (np. Stół 1)" value={newTable.name} onChange={e => setNewTable(p => ({ ...p, name: e.target.value }))} />
            <div>
              <p className="text-sm text-gray-600 mb-2">Kształt:</p>
              <div className="flex gap-3">
                <button onClick={() => setNewTable(p => ({ ...p, shape: 'round', capacity: 8 }))} className={`flex-1 py-2 rounded-xl border-2 text-sm ${newTable.shape === 'round' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200'}`}>
                  ⬤ Okrągły (max 12)
                </button>
                <button onClick={() => setNewTable(p => ({ ...p, shape: 'rectangular', capacity: 10 }))} className={`flex-1 py-2 rounded-xl border-2 text-sm ${newTable.shape === 'rectangular' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200'}`}>
                  ⬛ Prostokątny (6-24)
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Pojemność: {newTable.shape === 'round' ? '(max 12)' : '(6-24)'}</label>
              <input type="number" className="input w-full mt-1"
                min={newTable.shape === 'round' ? 1 : 6}
                max={newTable.shape === 'round' ? 12 : 24}
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
      <div className="flex gap-4 items-start">
        {/* Canvas SVG */}
        <div className="flex-1 card p-0 overflow-hidden rounded-xl border border-gray-200">
          <svg
            ref={svgRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block w-full"
            style={{ background: floorPlanUrl ? `url(${floorPlanUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #fff7f7 0%, #fdf2f8 100%)' }}
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
            {tables.map(t => (
              <TableShape
                key={t.id}
                table={t}
                selected={selected?.id === t.id}
                onSelect={setSelected}
                onDragStart={handleDragStart}
                isDraggable={true}
              />
            ))}
          </svg>
        </div>

        {/* Panel boczny */}
        <div className="w-72 space-y-3 shrink-0">
          {/* Wybrany stolik */}
          {selectedTable ? (
            <div className="card space-y-3">
              {editTable?.id === selectedTable.id ? (
                <>
                  <input className="input w-full font-bold" value={editTable.name} onChange={e => setEditTable(p => ({ ...p, name: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditTable(p => ({ ...p, shape: 'round' }))} className={`flex-1 text-xs py-1.5 rounded-lg border ${editTable.shape === 'round' ? 'border-rose-500 bg-rose-50' : 'border-gray-200'}`}>⬤ Okrągły</button>
                    <button onClick={() => setEditTable(p => ({ ...p, shape: 'rectangular' }))} className={`flex-1 text-xs py-1.5 rounded-lg border ${editTable.shape === 'rectangular' ? 'border-rose-500 bg-rose-50' : 'border-gray-200'}`}>⬛ Prostokątny</button>
                  </div>
                  <input type="number" className="input w-full" min={editTable.shape === 'round' ? 1 : 6} max={editTable.shape === 'round' ? 12 : 24} value={editTable.capacity} onChange={e => setEditTable(p => ({ ...p, capacity: parseInt(e.target.value) }))} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditTable(null)} className="btn-secondary flex-1 text-sm">Anuluj</button>
                    <button onClick={saveTableEdit} className="btn-primary flex-1 text-sm">Zapisz</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{selectedTable.name}</h3>
                    {isAdmin && <button onClick={() => setEditTable({ ...selectedTable })} className="text-gray-400 hover:text-gray-600 text-sm">✏️</button>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedTable.shape === 'round' ? '⬤ Okrągły' : '⬛ Prostokątny'} • {selectedTable.guests?.length || 0}/{selectedTable.capacity} miejsc
                  </p>
                </>
              )}

              {/* Lista gości przy stoliku */}
              <div className="space-y-1">
                {(selectedTable.guests || []).map(g => (
                  <div key={g.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-2 py-1">
                    <span>{g.firstName} {g.lastName} {g.isChild ? '👶' : ''}</span>
                    <button onClick={() => assignGuest(g.id, null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                  </div>
                ))}
                {(selectedTable.guests?.length || 0) < selectedTable.capacity && (
                  <button onClick={() => setShowAddGuest(true)} className="w-full text-xs text-rose-500 border border-rose-200 rounded-lg py-1.5 hover:bg-rose-50 mt-1">
                    + Dodaj gościa
                  </button>
                )}
              </div>

              {/* Dodaj nowego gościa */}
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

              {/* Przypisz z listy nieprzypisanych */}
              {unassignedGuests.length > 0 && !showAddGuest && (selectedTable.guests?.length || 0) < selectedTable.capacity && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Przypisz z listy gości:</p>
                  <select className="input text-sm w-full" onChange={e => { if (e.target.value) { assignGuest(e.target.value, selectedTable.id); e.target.value = ''; } }}>
                    <option value="">— wybierz —</option>
                    {unassignedGuests.map(g => (
                      <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                    ))}
                  </select>
                </div>
              )}

              {isAdmin && (
                <button onClick={() => deleteTable(selectedTable.id)} className="w-full text-sm text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">
                  🗑️ Usuń stolik
                </button>
              )}
            </div>
          ) : (
            <div className="card text-center text-gray-400 text-sm py-8">
              <p>🪑 Kliknij stolik<br />aby go wybrać</p>
            </div>
          )}

          {/* Nieprzypisani goście */}
          {unassignedGuests.length > 0 && (
            <div className="card">
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Nieprzypisani ({unassignedGuests.length})</h4>
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
          <div className="card text-xs space-y-1 text-gray-500">
            <p className="font-medium text-gray-600 mb-1">Legenda:</p>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100 border border-green-300"/><span>Wolne miejsca</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"/><span>Ponad 70% zajęte</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border border-red-300"/><span>Pełny stolik</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
