import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

export default function MenuPage() {
  const { user } = useAuth();
  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selections, setSelections] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [locked, setLocked] = useState(false);

  const isCouple = user?.role === 'couple';
  const canLock = ['admin', 'coordinator'].includes(user?.role);
  const showPrices = !isCouple; // para młoda nie widzi cen

  // Load wedding(s)
  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then((res) => {
        setSelectedWeddingId(res.data.id);
        setGuestCount(res.data.guestCount);
      }).catch(console.error);
    } else {
      api.get('/weddings').then((res) => {
        setWeddings(res.data);
        if (res.data.length > 0) {
          setSelectedWeddingId(res.data[0].id);
          setGuestCount(res.data[0].guestCount || 0);
        }
      }).catch(console.error);
    }
  }, [isCouple]);

  // Load menu when wedding selected
  useEffect(() => {
    if (!selectedWeddingId) return;
    Promise.all([
      api.get('/menu/categories'),
      api.get(`/menu/wedding/${selectedWeddingId}/selections`),
    ]).then(([cats, sel]) => {
      setCategories(cats.data);
      setSelections(sel.data.selections);
      setTotalCost(sel.data.totalCost);
      setLocked(sel.data.selections.some((s) => s.locked));
    }).catch(console.error);
  }, [selectedWeddingId]);

  const isSelected = (itemId) => selections.some((s) => s.menuItemId === itemId);

  const toggle = async (itemId) => {
    if (locked && !canLock) return toast.error('Menu jest zablokowane');
    try {
      await api.post(`/menu/wedding/${selectedWeddingId}/select`, { menuItemId: itemId });
      const updSel = await api.get(`/menu/wedding/${selectedWeddingId}/selections`);
      setSelections(updSel.data.selections);
      setTotalCost(updSel.data.totalCost);
      toast.success('Zaktualizowano menu');
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  const handleLock = async () => {
    try {
      await api.post(`/menu/wedding/${selectedWeddingId}/lock`, { locked: !locked });
      setLocked(!locked);
      toast.success(locked ? 'Menu odblokowane' : 'Menu zatwierdzone');
    } catch { toast.error('Błąd'); }
  };

  const handleWeddingChange = (id) => {
    setSelectedWeddingId(id);
    const w = weddings.find((w) => w.id === id);
    setGuestCount(w?.guestCount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Menu weselne</h1>
        <div className="flex items-center gap-3">
          {/* Wedding selector for admin/coordinator */}
          {!isCouple && weddings.length > 1 && (
            <select
              className="input w-auto"
              value={selectedWeddingId || ''}
              onChange={(e) => handleWeddingChange(e.target.value)}
            >
              {weddings.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.brideName} i {w.groomName}
                </option>
              ))}
            </select>
          )}
          {locked && <span className="badge-in-progress">🔒 Zablokowane</span>}
          {canLock && (
            <button onClick={handleLock} className="btn-secondary text-sm">
              {locked ? '🔓 Odblokuj menu' : '🔒 Zatwierdź menu'}
            </button>
          )}
        </div>
      </div>

      {/* Cost summary - tylko dla admina/koordynatora */}
      {showPrices && (
        <div className="card bg-gradient-to-r from-rose-50 to-pink-50 border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-700">Szacowany koszt menu</p>
              <p className="text-3xl font-bold text-rose-800">{Number(totalCost).toLocaleString('pl')} zł</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Liczba gości</p>
              <p className="text-2xl font-bold text-gray-800">{guestCount}</p>
            </div>
          </div>
        </div>
      )}

      {!selectedWeddingId ? (
        <div className="text-center py-12 text-gray-400">Brak wesela do wyświetlenia.</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Brak pozycji menu. Dodaj kategorie i dania w panelu administratora.</div>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <h2 className="font-bold text-gray-700 text-lg border-b pb-2">{cat.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.items.map((item) => {
                const sel = isSelected(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${sel ? 'border-rose-400 bg-rose-50' : 'border-gray-100 bg-white hover:border-rose-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        {item.description && <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>}
                      </div>
                      {/* Ceny widoczne tylko dla admina/koordynatora */}
                      {showPrices && (
                        <div className="text-right shrink-0">
                          <p className="font-bold text-rose-600">{Number(item.pricePerPerson).toFixed(0)} zł</p>
                          <p className="text-xs text-gray-400">/ os.</p>
                        </div>
                      )}
                    </div>
                    {showPrices && sel && guestCount > 0 && (
                      <p className="text-xs text-rose-500 mt-2">= {(Number(item.pricePerPerson) * guestCount).toLocaleString('pl')} zł łącznie</p>
                    )}
                    <div className={`mt-2 text-xs font-medium ${sel ? 'text-rose-600' : 'text-gray-400'}`}>
                      {sel ? '✓ Wybrano' : '○ Kliknij, aby wybrać'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
