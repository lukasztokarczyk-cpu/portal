import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

export default function MenuPage() {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selections, setSelections] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [locked, setLocked] = useState(false);
  const canLock = ['admin', 'coordinator'].includes(user?.role);

  useEffect(() => {
    api.get('/weddings/my').then((res) => {
      setWedding(res.data);
      setGuestCount(res.data.guestCount);
      return Promise.all([api.get('/menu/categories'), api.get(`/menu/wedding/${res.data.id}/selections`)]);
    }).then(([cats, sel]) => {
      setCategories(cats.data);
      setSelections(sel.data.selections);
      setTotalCost(sel.data.totalCost);
      setLocked(sel.data.selections.some((s) => s.locked));
    }).catch(console.error);
  }, []);

  const isSelected = (itemId) => selections.some((s) => s.menuItemId === itemId);

  const toggle = async (itemId) => {
    if (locked && !canLock) return toast.error('Menu jest zablokowane');
    try {
      const res = await api.post(`/menu/wedding/${wedding.id}/select`, { menuItemId: itemId });
      const updSel = await api.get(`/menu/wedding/${wedding.id}/selections`);
      setSelections(updSel.data.selections);
      setTotalCost(updSel.data.totalCost);
      toast.success(res.data.action === 'added' ? 'Dodano do menu' : 'Usunięto z menu');
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  const handleLock = async () => {
    try {
      await api.post(`/menu/wedding/${wedding.id}/lock`, { locked: !locked });
      setLocked(!locked);
      toast.success(locked ? 'Menu odblokowane' : 'Menu zablokowane');
    } catch { toast.error('Błąd'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Menu weselne</h1>
        <div className="flex items-center gap-3">
          {locked && <span className="badge-in-progress">🔒 Zablokowane</span>}
          {canLock && (
            <button onClick={handleLock} className="btn-secondary text-sm">
              {locked ? '🔓 Odblokuj menu' : '🔒 Zatwierdź menu'}
            </button>
          )}
        </div>
      </div>

      {/* Cost summary */}
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

      {/* Categories */}
      {categories.map((cat) => (
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
                    <div className="text-right shrink-0">
                      <p className="font-bold text-rose-600">{Number(item.pricePerPerson).toFixed(0)} zł</p>
                      <p className="text-xs text-gray-400">/ os.</p>
                    </div>
                  </div>
                  {sel && guestCount > 0 && (
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
      ))}
    </div>
  );
}
