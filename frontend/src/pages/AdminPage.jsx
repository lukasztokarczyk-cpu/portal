import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

function RegisterCoupleModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', login: '', email: '', password: '', weddingDate: '' });
  const [pricePerPerson, setPricePerPerson] = useState('');
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({ title: '', amount: '', dueDate: '', status: 'unpaid' });

  const addPayment = () => {
    if (!newPayment.title || !newPayment.amount) return toast.error('Podaj tytuł i kwotę');
    setPayments(p => [...p, { ...newPayment }]);
    setNewPayment({ title: '', amount: '', dueDate: '', status: 'unpaid' });
  };

  const removePayment = (i) => setPayments(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register-couple', form);
      const weddingId = res.data.weddingId;
      if (pricePerPerson && weddingId) {
        await api.patch(`/summary/wedding/${weddingId}/price`, { pricePerPerson });
      }
      for (const p of payments) {
        await api.post(`/payments/wedding/${weddingId}`, p);
      }
      toast.success('Para zarejestrowana!');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd rejestracji'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4">
        <h3 className="font-bold text-lg mb-4">Zarejestruj Parę Młodą</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dane konta</p>
            <div><label className="label">Imiona Pary *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Anna i Piotr Nowak" /></div>
            <div><label className="label">Login *</label><input className="input" value={form.login} onChange={e => setForm({...form, login: e.target.value})} required placeholder="np. nowakowie" /></div>
            <div><label className="label">Email (opcjonalnie)</label><input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><label className="label">Hasło (min. 8 znaków) *</label><input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8} /></div>
            <div><label className="label">Data ślubu *</label><input type="date" className="input" value={form.weddingDate} onChange={e => setForm({...form, weddingDate: e.target.value})} required /></div>
          </div>
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cena wesela</p>
            <div className="flex items-center gap-3">
              <input type="number" className="input w-40" placeholder="np. 350" value={pricePerPerson} onChange={e => setPricePerPerson(e.target.value)} />
              <span className="text-gray-500 text-sm">zł / osoba dorosła</span>
            </div>
            <p className="text-xs text-gray-400">Dzieci 3-10 lat i DJ = 50%. Dzieci do 3 lat gratis.</p>
          </div>
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Płatności / Zaliczki</p>
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-sm">
                <span className="font-medium">{p.title}</span>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{parseFloat(p.amount).toLocaleString("pl-PL")} zł</span>
                  <span className={p.status === "paid" ? "text-green-600" : "text-amber-500"}>{p.status === "paid" ? "✅" : "⏳"}</span>
                  <button type="button" onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <input className="input col-span-2" placeholder="Tytuł (np. Zaliczka)" value={newPayment.title} onChange={e => setNewPayment(p => ({...p, title: e.target.value}))} />
              <input type="number" className="input" placeholder="Kwota (zł)" value={newPayment.amount} onChange={e => setNewPayment(p => ({...p, amount: e.target.value}))} />
              <input type="date" className="input" value={newPayment.dueDate} onChange={e => setNewPayment(p => ({...p, dueDate: e.target.value}))} />
              <select className="input" value={newPayment.status} onChange={e => setNewPayment(p => ({...p, status: e.target.value}))}>
                <option value="unpaid">⏳ Oczekuje</option>
                <option value="paid">✅ Opłacona</option>
              </select>
              <button type="button" onClick={addPayment} className="btn-secondary text-sm">+ Dodaj płatność</button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">Zarejestruj</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditWeddingModal({ wedding, onClose, onSaved }) {
  const [form, setForm] = useState({
    coupleName: wedding.couple?.name || '',
    coupleLogin: wedding.couple?.login || '',
    couplePassword: '',
    weddingDate: wedding.weddingDate?.slice(0, 10) || '',
    guestCount: wedding.guestCount || 0,
    coordinatorId: wedding.coordinatorId || '',
  });
  const [coordinators, setCoordinators] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api.get('/weddings').then(r => {
      // Pobierz koordynatorów z listy wesel (mają coordinator pole)
    }).catch(console.error);
    // Pobierz listę koordynatorów
    api.get('/admin/users?role=coordinator').catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        coupleName: form.coupleName,
        coupleLogin: form.coupleLogin,
        weddingDate: form.weddingDate,
        guestCount: parseInt(form.guestCount),
        coordinatorId: form.coordinatorId || null,
      };
      if (form.couplePassword) data.couplePassword = form.couplePassword;
      await api.patch(`/weddings/${wedding.id}`, data);
      toast.success('Zapisano zmiany');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd zapisu'); }
  };

  const handleDelete = async () => {
    if (!confirm(`Usunąć wesele ${wedding.couple?.name}? Tej operacji nie można cofnąć!`)) return;
    try {
      await api.delete(`/weddings/${wedding.id}`);
      toast.success('Wesele usunięte');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd usuwania'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Edytuj wesele — {wedding.couple?.name}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="border-b pb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dane pary</p>
            <div className="space-y-3">
              <div>
                <label className="label">Imiona Pary</label>
                <input className="input w-full" value={form.coupleName} onChange={e => setForm(p => ({...p, coupleName: e.target.value}))} />
              </div>
              <div>
                <label className="label">Login</label>
                <input className="input w-full" value={form.coupleLogin} onChange={e => setForm(p => ({...p, coupleLogin: e.target.value}))} />
              </div>
              <div>
                <label className="label">Nowe hasło <span className="text-gray-400 font-normal">(zostaw puste aby nie zmieniać)</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input w-full pr-10"
                    placeholder="••••••••"
                    value={form.couplePassword}
                    onChange={e => setForm(p => ({...p, couplePassword: e.target.value}))}
                    minLength={form.couplePassword ? 8 : undefined}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Szczegóły wesela</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data ślubu</label>
                <input type="date" className="input w-full" value={form.weddingDate} onChange={e => setForm(p => ({...p, weddingDate: e.target.value}))} />
              </div>
              <div>
                <label className="label">Liczba gości</label>
                <input type="number" className="input w-full" min={0} value={form.guestCount} onChange={e => setForm(p => ({...p, guestCount: e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1">Zapisz zmiany</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-red-100">
          <button onClick={handleDelete} className="w-full py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition">
            🗑️ Usuń to wesele
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [weddings, setWeddings] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [editWedding, setEditWedding] = useState(null);

  const refresh = () => api.get('/weddings').then(r => setWeddings(r.data)).catch(console.error);

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Panel Administratora</h1>
        <button onClick={() => setShowRegister(true)} className="btn-primary">+ Nowa Para Młoda</button>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Zarejestrowane wesela ({weddings.length})</h2>
        <div className="space-y-3">
          {weddings.length === 0 && <p className="text-gray-400 text-sm">Brak zarejestrowanych wesel.</p>}
          {weddings.map(w => (
            <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
              <div>
                <p className="font-semibold text-gray-800">{w.couple?.name}</p>
                <p className="text-sm text-gray-500">Login: <span className="font-mono">{w.couple?.login}</span></p>
                <p className="text-sm text-gray-500">
                  📅 {w.weddingDate ? new Date(w.weddingDate).toLocaleDateString('pl-PL') : '—'}
                  {w.coordinator && ` • 👤 ${w.coordinator.name}`}
                </p>
                <p className="text-sm text-gray-400">👥 {w.guestCount} gości</p>
              </div>
              <button onClick={() => setEditWedding(w)} className="btn-secondary text-sm">✏️ Edytuj</button>
            </div>
          ))}
        </div>
      </div>

      {showRegister && <RegisterCoupleModal onClose={() => setShowRegister(false)} onSaved={() => { setShowRegister(false); refresh(); }} />}
      {editWedding && <EditWeddingModal wedding={editWedding} onClose={() => setEditWedding(null)} onSaved={() => { setEditWedding(null); refresh(); }} />}
    </div>
  );
}
