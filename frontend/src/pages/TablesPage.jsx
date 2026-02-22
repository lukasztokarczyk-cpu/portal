import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CANVAS_W = 800;
const CANVAS_H = 550;

function Table({ table, selected, onSelect, onDragStart }) {
  const isRound = table.shape === 'round';
  const w = isRound ? 80 : 120;
  const h = isRound ? 80 : 60;

  return (
    <g
      transform={`translate(${table.posX},${table.posY}) rotate(${table.rotation || 0},${w / 2},${h / 2})`}
      style={{ cursor: 'grab' }}
      onClick={(e) => { e.stopPropagation(); onSelect(table); }}
      onMouseDown={(e) => onDragStart(e, table)}
    >
      {isRound ? (
        <circle cx={40} cy={40} r={40} fill={selected ? '#fecdd3' : '#fff7f7'} stroke={selected ? '#e11d48' : '#fda4af'} strokeWidth="2" />
      ) : (
        <rect width={w} height={h} rx={6} fill={selected ? '#fecdd3' : '#fff7f7'} stroke={selected ? '#e11d48' : '#fda4af'} strokeWidth="2" />
      )}
      <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#be123c" fontWeight="600">
        {table.name.length > 10 ? table.name.slice(0, 10) + '…' : table.name}
      </text>
      <text x={w / 2} y={h / 2 + 14} textAnchor="middle" fontSize="9" fill="#9f1239">
        {table.guests?.length || 0}/{table.capacity}
      </text>
    </g>
  );
}

export default function TablesPage() {
  const [wedding, setWedding] = useState(null);
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newTableName, setNewTableName] = useState('');
  const dragging = useRef(null);
  const svgRef = useRef();

  useEffect(() => {
    api.get('/weddings/my').then((res) => {
      setWedding(res.data);
      return Promise.all([api.get(`/tables/wedding/${res.data.id}`), api.get(`/guests/wedding/${res.data.id}`)]);
    }).then(([t, g]) => { setTables(t.data); setGuests(g.data.guests); }).catch(console.error);
  }, []);

  const refresh = () => {
    if (!wedding) return;
    Promise.all([api.get(`/tables/wedding/${wedding.id}`), api.get(`/guests/wedding/${wedding.id}`)]).then(([t, g]) => { setTables(t.data); setGuests(g.data.guests); });
  };

  const handleDragStart = (e, table) => {
    e.preventDefault();
    const svg = svgRef.current.getBoundingClientRect();
    dragging.current = { id: table.id, startX: e.clientX - svg.left - table.posX, startY: e.clientY - svg.top - table.posY };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const x = Math.max(0, Math.min(CANVAS_W - 100, ev.clientX - svg.left - dragging.current.startX));
      const y = Math.max(0, Math.min(CANVAS_H - 100, ev.clientY - svg.top - dragging.current.startY));
      setTables((prev) => prev.map((t) => t.id === dragging.current.id ? { ...t, posX: x, posY: y } : t));
    };

    const onUp = async () => {
      if (!dragging.current) return;
      const moved = tables.find((t) => t.id === dragging.current.id);
      if (moved) {
        try {
          await api.patch(`/tables/${moved.id}/position`, { posX: moved.posX, posY: moved.posY, rotation: moved.rotation || 0 });
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
    if (!newTableName.trim()) return;
    try {
      await api.post(`/tables/wedding/${wedding.id}`, { name: newTableName, shape: 'round', capacity: 8, posX: 100 + Math.random() * 400, posY: 100 + Math.random() * 200 });
      setNewTableName('');
      toast.success('Stolik dodany');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const deleteTable = async (id) => {
    if (!confirm('Usunąć stolik?')) return;
    try {
      await api.delete(`/tables/${id}`);
      setSelected(null);
      toast.success('Stolik usunięty');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const assignGuest = async (guestId, tableId) => {
    try {
      await api.patch(`/guests/${guestId}`, { tableId: tableId || null });
      toast.success('Gość przypisany');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const selectedTable = selected ? tables.find((t) => t.id === selected.id) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Plan stołów 2D</h1>

      <div className="flex gap-3 items-center">
        <input className="input max-w-xs" placeholder="Nazwa stolika" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTable()} />
        <button onClick={addTable} className="btn-primary">+ Dodaj stolik</button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Canvas */}
        <div className="card p-0 overflow-hidden flex-1">
          <svg ref={svgRef} width={CANVAS_W} height={CANVAS_H} className="bg-gradient-to-br from-rose-50 to-white block" onClick={() => setSelected(null)}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />
            {tables.map((t) => (
              <Table key={t.id} table={t} selected={selected?.id === t.id} onSelect={setSelected} onDragStart={handleDragStart} />
            ))}
          </svg>
        </div>

        {/* Side panel */}
        <div className="w-72 space-y-3">
          {selectedTable ? (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">{selectedTable.name}</h3>
              <p className="text-sm text-gray-500 mb-2">Miejsca: {selectedTable.guests?.length}/{selectedTable.capacity}</p>

              <div className="space-y-1 mb-4">
                {selectedTable.guests?.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span>{g.lastName} {g.firstName}</span>
                    <button onClick={() => assignGuest(g.id, null)} className="text-red-400 text-xs hover:text-red-600">✕</button>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Dodaj gościa:</p>
                <select className="input text-sm" onChange={(e) => { if (e.target.value) { assignGuest(e.target.value, selectedTable.id); e.target.value = ''; } }}>
                  <option value="">— wybierz —</option>
                  {guests.filter((g) => !g.tableId).map((g) => (
                    <option key={g.id} value={g.id}>{g.lastName} {g.firstName}</option>
                  ))}
                </select>
              </div>

              <button onClick={() => deleteTable(selectedTable.id)} className="w-full mt-3 text-sm text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">Usuń stolik</button>
            </div>
          ) : (
            <div className="card text-center text-gray-400 text-sm">
              <p>Kliknij stolik,<br />aby go wybrać</p>
            </div>
          )}

          <div className="card">
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Nieprzypisani ({guests.filter((g) => !g.tableId).length})</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {guests.filter((g) => !g.tableId).map((g) => (
                <div key={g.id} className="text-xs text-gray-600 py-0.5">{g.lastName} {g.firstName}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
