import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

function GuestModal({ guest, weddingId, onClose, onSaved }) {
  const isEdit = !!guest;
  const [form, setForm] = useState({
    firstName: guest?.firstName || '',
    lastName: guest?.lastName || '',
    ageCategory: guest?.ageCategory || (guest?.isChild ? (guest?.ageCategory || 'child3to10') : 'adult'),
    diet: guest?.diet || 'standard',
    dietNotes: guest?.dietNotes || '',
    rsvp: guest?.rsvp || 'pending',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      isChild: form.ageCategory !== 'adult',
      ageCategory: form.ageCategory,
      diet: form.diet,
      dietNotes: form.dietNotes,
      rsvp: form.rsvp,
    };
    try {
      if (isEdit) {
        await api.patch(`/guests/${guest.id}`, payload);
        toast.success('Gość zaktualizowany');
      } else {
        await api.post(`/guests/wedding/${weddingId}`, payload);
        toast.success('Gość dodany');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Błąd zapisu');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-gray-800 text-lg mb-4">{isEdit ? 'Edytuj gościa' : 'Nowy gość'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Imię *</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Nazwisko *</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dieta</label>
              <select className="input" value={form.diet} onChange={e => setForm({ ...form, diet: e.target.value })}>
                <option value="standard">🍽️ Standardowa</option>
                <option value="vegetarian">🥗 Wegetariańska</option>
                <option value="vegan">🌱 Wegańska</option>
                <option value="glutenfree">🌾 Bezglutenowa</option>
                <option value="lactosefree">🥛 Bezlaktozowa</option>
                <option value="glutenlactosefree">⚡ Bezglutenowa i bezlaktozowa</option>
                <option value="other">📝 Inna / specjalna</option>
              </select>
            </div>
            <div>
              <label className="label">Potwierdzenie przybycia</label>
              <select className="input" value={form.rsvp} onChange={(e) => setForm({ ...form, rsvp: e.target.value })}>
                <option value="pending">Oczekuje</option>
                <option value="yes">Tak</option>
                <option value="no">Nie</option>
              </select>
            </div>
          </div>
          {form.diet === 'other' && (
            <div>
              <label className="label">Uwagi do diety</label>
              <input className="input" placeholder="np. alergia na orzechy..." value={form.dietNotes} onChange={e => setForm({ ...form, dietNotes: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Kategoria wiekowa</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {[
                { value: 'adult',      label: '👤 Dorosły (10+ lat)',     color: 'rose' },
                { value: 'child3to10', label: '👦 Dziecko (3–10 lat)',    color: 'amber' },
                { value: 'childUnder3',label: '👶 Dziecko (0–3 lat)',     color: 'green' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, ageCategory: value })}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.ageCategory === value
                      ? color === 'rose' ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : color === 'amber' ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-green-400 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">Zapisz</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({});
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/weddings/my').then((res) => {
      setWedding(res.data);
      return api.get(`/guests/wedding/${res.data.id}`);
    }).then((res) => { setGuests(res.data.guests); setStats(res.data.stats); }).catch(console.error);
  }, []);

  const refresh = () => api.get(`/guests/wedding/${wedding.id}`).then((res) => { setGuests(res.data.guests); setStats(res.data.stats); });

  const handleDelete = async (id) => {
    if (!confirm('Usunąć gościa?')) return;
    try {
      await api.delete(`/guests/${id}`);
      toast.success('Gość usunięty');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`/guests/wedding/${wedding.id}/import-csv`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Zaimportowano ${res.data.imported} gości`);
      refresh();
    } catch { toast.error('Błąd importu'); }
    e.target.value = '';
  };

  const handleExport = () => {
    window.open(`/api/guests/wedding/${wedding.id}/export-pdf?token=${localStorage.getItem('token')}`, '_blank');
  };

  const filtered = guests.filter((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(search.toLowerCase()));
  const rsvpColor = { yes: 'text-green-600', no: 'text-red-600', pending: 'text-yellow-600' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Lista gości</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <button onClick={() => fileRef.current.click()} className="btn-secondary text-sm">📥 Import CSV</button>
          <button onClick={handleExport} className="btn-secondary text-sm">📄 Eksport</button>
          <button onClick={() => setModal('new')} className="btn-primary">+ Dodaj gościa</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="card flex-1 text-center"><div className="text-2xl font-bold text-gray-800">{stats.total || 0}</div><div className="text-sm text-gray-500">Wszyscy</div></div>
        <div className="card flex-1 text-center"><div className="text-2xl font-bold text-blue-600">{stats.adults || 0}</div><div className="text-sm text-gray-500">Dorośli</div></div>
        <div className="card flex-1 text-center"><div className="text-2xl font-bold text-rose-600">{stats.children || 0}</div><div className="text-sm text-gray-500">Dzieci</div></div>
      </div>

      <input className="input max-w-xs" placeholder="🔍 Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4">Imię i nazwisko</th>
            <th className="pb-3 pr-4">Typ</th>
            <th className="pb-3 pr-4">Dieta</th>
            <th className="pb-3 pr-4">Stolik</th>
            <th className="pb-3 pr-4">Potwierdzenie</th>
            <th className="pb-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 font-medium text-gray-800">{g.lastName} {g.firstName}</td>
                <td className="py-3 pr-4 text-gray-500">
                  {g.ageCategory === 'childUnder3' ? '👶 0–3 lat' :
                   g.ageCategory === 'child3to10' ? '👦 3–10 lat' :
                   g.isChild ? '👦 Dziecko' : '👤 Dorosły'}
                </td>
                <td className="py-3 pr-4 text-gray-500">
                  {g.diet === 'standard' || !g.diet ? '🍽️ Std' :
                   g.diet === 'vegetarian' ? '🥗 Wege' :
                   g.diet === 'vegan' ? '🌱 Vegan' :
                   g.diet === 'glutenfree' ? '🌾 BG' :
                   g.diet === 'lactosefree' ? '🥛 BL' :
                   g.diet === 'glutenlactosefree' ? '⚡ BG+BL' : '📝 Inna'}
                </td>
                <td className="py-3 pr-4 text-gray-500">{g.table?.name || '—'}</td>
                <td className={`py-3 pr-4 font-medium capitalize ${rsvpColor[g.rsvp] || ''}`}>{g.rsvp === 'yes' ? 'Tak' : g.rsvp === 'no' ? 'Nie' : 'Oczekuje'}</td>
                <td className="py-3 flex gap-2 justify-end">
                  <button onClick={() => setModal(g)} className="text-xs text-gray-500 hover:text-gray-800 underline">Edytuj</button>
                  <button onClick={() => handleDelete(g.id)} className="text-xs text-red-400 hover:text-red-700 underline">Usuń</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">Brak gości.</p>}
      </div>

      {modal && (
        <GuestModal
          guest={modal === 'new' ? null : modal}
          weddingId={wedding?.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}
