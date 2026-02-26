import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';

const DIET_LABELS = {
  standard:          { label: 'Standardowa',           emoji: '🍽️' },
  vegetarian:        { label: 'Wegetariańska',          emoji: '🥗' },
  vegan:             { label: 'Wegańska',               emoji: '🌱' },
  glutenfree:        { label: 'Bezglutenowa',           emoji: '🌾' },
  lactosefree:       { label: 'Bezlaktozowa',           emoji: '🥛' },
  glutenlactosefree: { label: 'Bezglutenowa i bezlaktozowa', emoji: '⚡' },
  other:             { label: 'Inna / specjalna',       emoji: '📝' },
};

function StatBox({ label, value, sub, color = 'rose' }) {
  const colors = {
    rose:   'bg-rose-50 border-rose-200 text-rose-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 text-center ${colors[color]}`}>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      <p className="font-semibold text-sm mt-1">{label}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

function CostRow({ label, value, highlight }) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  const isNegative = num < 0;
  return (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-rose-50 font-bold text-rose-700' : isNegative ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className="font-semibold">
        {isNegative ? '−' : ''}{Math.abs(num).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
      </span>
    </div>
  );
}

export default function SummaryPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'coordinator'].includes(user?.role);
  const isCouple = user?.role === 'couple';

  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [daysUntil, setDaysUntil] = useState(null);
  const [bookedRooms, setBookedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then(r => setSelectedWeddingId(r.data.id)).catch(console.error);
    } else {
      api.get('/weddings').then(r => {
        setWeddings(r.data);
        if (r.data[0]) setSelectedWeddingId(r.data[0].id);
      }).catch(console.error);
    }
  }, [isCouple]);

  const loadSummary = (weddingId) => {
    if (!weddingId) return;
    setLoading(true);
    api.get(`/summary/wedding/${weddingId}`)
      .then(r => {
        setSummary(r.data.summary);
        setDaysUntil(r.data.daysUntil);
        setBookedRooms(r.data.bookedRooms || []);
        setPriceInput(r.data.summary?.pricePerPerson ? parseFloat(r.data.summary.pricePerPerson).toString() : '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSummary(selectedWeddingId); }, [selectedWeddingId]);

  const savePrice = async () => {
    setSavingPrice(true);
    try {
      const r = await api.patch(`/summary/wedding/${selectedWeddingId}/price`, { pricePerPerson: priceInput });
      setSummary(r.data.summary);
      setBookedRooms(r.data.bookedRooms || []);
      toast.success('Cena zapisana i koszty przeliczone!');
    } catch { toast.error('Błąd'); }
    finally { setSavingPrice(false); }
  };

  const refreshSummary = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/summary/wedding/${selectedWeddingId}/refresh`);
      setSummary(r.data.summary);
      setDaysUntil(r.data.daysUntil);
      setBookedRooms(r.data.bookedRooms || []);
      toast.success('Podsumowanie odświeżone');
    } catch { toast.error('Błąd'); }
    finally { setLoading(false); }
  };

  const totalGuests = summary ? summary.adultsCount + summary.children3to10 + summary.childrenUnder3 : 0;

  // Para widzi podsumowanie tylko jeśli 4 dni lub mniej przed weselem
  const coupleCanSee = isCouple && summary?.isVisible;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Podsumowanie wesela</h1>
          {daysUntil !== null && (
            <p className="text-sm text-gray-500 mt-1">
              {daysUntil > 0 ? `${daysUntil} dni do wesela` : daysUntil === 0 ? '🎊 Dzisiaj wesele!' : '✅ Wesele odbyło się'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={selectedWeddingId || ''} onChange={e => setSelectedWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w?.couple?.name || w?.couple?.email}</option>)}
            </select>
          )}
          {isAdmin && (
            <button onClick={refreshSummary} disabled={loading} className="btn-secondary text-sm">
              🔄 Odśwież
            </button>
          )}
        </div>
      </div>

      {/* Para — informacja jeśli za wcześnie */}
      {isCouple && !summary?.isVisible && daysUntil > 4 && (
        <div className="card border-2 border-blue-100 bg-blue-50 text-center py-4">
          <p className="text-sm text-blue-700">📅 Podsumowanie będzie zatwierdzone na <strong>{daysUntil - 4} dni</strong> przed weselem</p>
        </div>
      )}
      {summary?.isVisible && (
        <div className="card border-2 border-green-200 bg-green-50 text-center py-3">
          <p className="font-bold text-green-700">✅ Podsumowanie finalne — zatwierdzone</p>
          <p className="text-sm text-green-600 mt-0.5">To jest oficjalne podsumowanie Waszego wesela</p>
        </div>
      )}

      {/* Treść podsumowania */}
      {summary && !loading && (
        <>
          {/* Ustawienie ceny — tylko admin */}
          {isAdmin && (
            <div className="card">
              <h2 className="font-bold text-gray-800 text-lg mb-3">💰 Cena za osobę dorosłą</h2>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className="input w-48"
                  placeholder="np. 350"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                />
                <span className="text-gray-500">zł / os.</span>
                <button onClick={savePrice} disabled={savingPrice} className="btn-primary text-sm">
                  {savingPrice ? '...' : 'Zapisz i przelicz'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Dzieci 3-10 lat i DJ/Fotograf = 50% ceny. Dzieci do 3 lat = gratis.</p>
            </div>
          )}

          {/* Liczba gości */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">👥 Podział gości</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <StatBox label="Dorośli (10+ lat)" value={summary.adultsCount} sub="100% ceny" color="rose" />
              <StatBox label="Dzieci 3–10 lat" value={summary.children3to10} sub="50% ceny" color="amber" />
              <StatBox label="Dzieci 0–3 lat" value={summary.childrenUnder3} sub="gratis" color="green" />
              <StatBox label="DJ / Fotograf" value={summary.djCount} sub="50% ceny" color="purple" />
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2 text-center">
              <span className="font-bold text-gray-700">Łącznie: </span>
              <span className="text-gray-800 font-semibold">{totalGuests} osób</span>
            </div>
          </div>

          {/* Diety */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🥗 Diety specjalne</h2>
            <div className="space-y-2">
              {[
                { key: 'dietStandard',          label: 'Standardowa',                    emoji: '🍽️' },
                { key: 'dietVegetarian',         label: 'Wegetariańska',                  emoji: '🥗' },
                { key: 'dietVegan',              label: 'Wegańska',                       emoji: '🌱' },
                { key: 'dietGlutenFree',         label: 'Bezglutenowa',                   emoji: '🌾' },
                { key: 'dietLactoseFree',        label: 'Bezlaktozowa',                   emoji: '🥛' },
                { key: 'dietGlutenLactoseFree',  label: 'Bezglutenowa i bezlaktozowa',    emoji: '⚡' },
                { key: 'dietOther',              label: 'Inna / specjalna',               emoji: '📝' },
              ].filter(d => summary[d.key] > 0).map(({ key, label, emoji }) => (
                <div key={key} className={`flex justify-between items-center py-2 px-3 rounded-lg ${key === 'dietStandard' ? 'bg-gray-50' : 'bg-rose-50'}`}>
                  <span className="text-gray-700">{emoji} {label}</span>
                  <span className={`font-bold ${key === 'dietStandard' ? 'text-gray-800' : 'text-rose-700'}`}>{summary[key]} os.</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dodatkowe usługi */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🎂 Dodatkowe usługi</h2>
            <div className="space-y-2 text-sm">
              {summary.cakeSource && (
                <div className="flex justify-between py-2 px-3 bg-pink-50 rounded-lg">
                  <span>🎂 Tort ({summary.cakeSource === 'nas' ? 'od nas' : 'firma zewnętrzna'})</span>
                  {summary.cakeFlavors && <span className="text-gray-500">{summary.cakeFlavors}</span>}
                </div>
              )}
              {summary.sweetTableChoice && summary.sweetTableChoice !== 'rezygnuje' && (
                <div className="flex justify-between py-2 px-3 bg-pink-50 rounded-lg">
                  <span>🍬 Słodki stół ({summary.sweetTableChoice === 'nas' ? 'od nas' : 'firma zewnętrzna'})</span>
                  {summary.sweetTableCost && <span className="font-semibold">{parseFloat(summary.sweetTableCost).toLocaleString('pl-PL', {minimumFractionDigits: 2})} zł</span>}
                </div>
              )}
              {summary.guestPackageChoice === 'nas' && (
                <div className="flex justify-between py-2 px-3 bg-amber-50 rounded-lg">
                  <span>🎁 Paczki dla gości ({summary.guestPackageCount || '?'} szt.)</span>
                  {summary.packagesCost && <span className="font-semibold">{parseFloat(summary.packagesCost).toLocaleString('pl-PL', {minimumFractionDigits: 2})} zł</span>}
                </div>
              )}
            </div>
          </div>

          {/* Noclegi */}
          <div className="card">
            <h2 className="font-bold text-gray-800 text-lg mb-4">🛏️ Noclegi</h2>

            {/* Pokój Pary Młodej — zawsze */}
            <div className="flex items-center gap-3 py-3 px-4 bg-rose-50 rounded-xl border-2 border-rose-200 mb-3">
              <span className="text-2xl">💍</span>
              <div>
                <p className="font-bold text-rose-700">Pokój nr 7 — Para Młoda</p>
                <p className="text-sm text-rose-500">Zarezerwowany na noc weselną</p>
              </div>
            </div>

            {/* Zarezerwowane pokoje gości */}
            {bookedRooms.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Pokoje gości: <span className="text-gray-800">{bookedRooms.length} {bookedRooms.length === 1 ? 'pokój' : bookedRooms.length < 5 ? 'pokoje' : 'pokoi'}</span>
                </p>
                {bookedRooms.map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">{r.roomName}</span>
                      {r.notes && <span className="text-gray-500 ml-2">— {r.notes}</span>}
                    </div>
                    <div className="text-right text-gray-500">
                      <p>{r.guestCount} os.</p>
                      <p className="text-xs">
                        {new Date(r.checkIn).toLocaleDateString('pl-PL')} – {new Date(r.checkOut).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-center mt-2">
                  <span className="font-bold text-gray-700">Łącznie pokoi: </span>
                  <span className="text-gray-800 font-semibold">{bookedRooms.length + 1}</span>
                  <span className="text-gray-500 text-sm"> (w tym pokój Pary Młodej)</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Brak zarezerwowanych pokoi dla gości</p>
            )}
          </div>
          {summary.pricePerPerson && (
            <div className="card">
              <h2 className="font-bold text-gray-800 text-lg mb-4">💵 Podsumowanie kosztów</h2>
              <div className="space-y-1">
                <CostRow label={`Dorośli (${summary.adultsCount} × ${parseFloat(summary.pricePerPerson).toFixed(0)} zł)`} value={summary.baseCost} />
                {summary.children3to10 > 0 && (
                  <CostRow label={`Dzieci 3-10 lat (${summary.children3to10} × 50%)`} value={summary.childrenCost} />
                )}
                {summary.djCount > 0 && (
                  <CostRow label={`DJ/Fotograf (${summary.djCount} × 50%)`} value={summary.djCost} />
                )}
                {summary.sweetTableCost && (
                  <CostRow label="Słodki stół" value={summary.sweetTableCost} />
                )}
                {summary.packagesCost && (
                  <CostRow label="Paczki dla gości" value={summary.packagesCost} />
                )}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <CostRow label="💰 RAZEM" value={summary.totalCost} highlight />
                </div>
                {summary.paidAmount > 0 && (
                  <div className="border-t border-gray-200 mt-1 pt-1 space-y-1">
                    <CostRow label="✅ Wpłacone zaliczki" value={-summary.paidAmount} />
                    <CostRow label="⏳ Pozostało do zapłaty" value={summary.remainingCost} highlight />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="text-center py-10 text-gray-400">Ładowanie...</div>
      )}
    </div>
  );
}
