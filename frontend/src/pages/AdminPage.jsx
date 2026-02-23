import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

function RegisterCoupleModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', login: '', email: '', password: '', weddingDate: '', coordinatorId: '' });
  const [coordinators, setCoordinators] = useState([]);

  useEffect(() => {
    // Fetch coordinators - for simplicity using a manual list approach
    // In production, add a /api/users?role=coordinator endpoint
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register-couple', form);
      toast.success('Para zarejestrowana!');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd rejestracji'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-lg mb-4">Zarejestruj Parę Młodą</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">Imiona Pary *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Anna i Piotr Nowak" /></div>
          <div><label className="label">Login *</label><input className="input" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required placeholder="np. nowakowie" /></div>
          <div><label className="label">Email (opcjonalnie)</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Hasło (min. 8 znaków) *</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>
          <div><label className="label">Data ślubu *</label><input type="date" className="input" value={form.weddingDate} onChange={(e) => setForm({ ...form, weddingDate: e.target.value })} required /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">Zarejestruj</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [weddings, setWeddings] = useState([]);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    api.get('/weddings').then((res) => setWeddings(res.data)).catch(console.error);
  }, []);

  const refresh = () => api.get('/weddings').then((res) => setWeddings(res.data));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Panel Administratora</h1>
        <button onClick={() => setModal(true)} className="btn-primary">+ Nowa Para Młoda</button>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Zarejestrowane wesela ({weddings.length})</h2>
        <div className="space-y-3">
          {weddings.length === 0 && <p className="text-gray-400 text-sm">Brak zarejestrowanych wesel.</p>}
          {weddings.map((w) => (
            <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-800">{w.couple?.name}</p>
                <p className="text-sm text-gray-500">{w.couple?.email}</p>
                <p className="text-sm text-gray-500">
                  📅 {w.weddingDate ? new Date(w.weddingDate).toLocaleDateString('pl') : '—'}
                  {w.coordinator && ` • Koordynator: ${w.coordinator.name}`}
                </p>
              </div>
              <div className="text-right">
                <span className="badge-open text-xs">{w.guestCount} gości</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && <RegisterCoupleModal onClose={() => setModal(false)} onSaved={() => { setModal(false); refresh(); }} />}
    </div>
  );
}
