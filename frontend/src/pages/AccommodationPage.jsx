import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const DATE_LABELS = {
  '-1': 'Dzień przed weselem',
  '0':  'Dzień wesela',
  '1':  'Dzień po weselu',
};

function getDayOffset(allowedDates, dateStr) {
  if (!allowedDates?.length) return null;
  const weddingDate = new Date(allowedDates[1]); // środkowa = dzień wesela
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  weddingDate.setHours(0,0,0,0);
  const diff = Math.round((d - weddingDate) / 86400000);
  return diff;
}

// ── PANEL ADMINA ─────────────────────────────────────────
function AdminView() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', capacity: 2 });
  const [editRoom, setEditRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'bookings'

  const refresh = useCallback(() => {
    Promise.all([
      api.get('/accommodation/rooms'),
      api.get('/accommodation/bookings'),
    ]).then(([r, b]) => { setRooms(r.data); setBookings(b.data); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addRoom = async () => {
    if (!newRoom.name.trim()) return toast.error('Podaj nazwę pokoju');
    try {
      await api.post('/accommodation/rooms', newRoom);
      setNewRoom({ name: '', description: '', capacity: 2 });
      toast.success('Pokój dodany');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const saveRoom = async () => {
    try {
      await api.patch(`/accommodation/rooms/${editRoom.id}`, editRoom);
      setEditRoom(null);
      toast.success('Zapisano');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const deleteRoom = async (id) => {
    if (!confirm('Usunąć pokój?')) return;
    try {
      await api.delete(`/accommodation/rooms/${id}`);
      toast.success('Pokój usunięty');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const cancelBooking = async (id) => {
    if (!confirm('Anulować rezerwację?')) return;
    try {
      await api.delete(`/accommodation/bookings/${id}`);
      toast.success('Rezerwacja anulowana');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'rooms' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          🛏️ Pokoje ({rooms.length})
        </button>
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'bookings' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          📋 Rezerwacje ({bookings.length})
        </button>
      </div>

      {activeTab === 'rooms' && (
        <div className="space-y-4">
          {/* Dodaj pokój */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700">Dodaj pokój</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="input" placeholder="Nazwa pokoju (np. Pokój 1)" value={newRoom.name} onChange={e => setNewRoom(p => ({...p, name: e.target.value}))} />
              <input className="input" placeholder="Opis (opcjonalnie)" value={newRoom.description} onChange={e => setNewRoom(p => ({...p, description: e.target.value}))} />
              <input type="number" className="input" placeholder="Liczba osób" min={1} max={10} value={newRoom.capacity} onChange={e => setNewRoom(p => ({...p, capacity: parseInt(e.target.value)}))} />
            </div>
            <button onClick={addRoom} className="btn-primary">+ Dodaj pokój</button>
          </div>

          {/* Lista pokojów */}
          <div className="space-y-3">
            {rooms.length === 0 && <div className="card text-center text-gray-400">Brak pokojów. Dodaj pierwszy pokój powyżej.</div>}
            {rooms.map(room => (
              <div key={room.id} className="card">
                {editRoom?.id === room.id ? (
                  <div className="space-y-3">
                    <input className="input w-full" value={editRoom.name} onChange={e => setEditRoom(p => ({...p, name: e.target.value}))} />
                    <input className="input w-full" placeholder="Opis" value={editRoom.description || ''} onChange={e => setEditRoom(p => ({...p, description: e.target.value}))} />
                    <input type="number" className="input w-full" min={1} value={editRoom.capacity} onChange={e => setEditRoom(p => ({...p, capacity: parseInt(e.target.value)}))} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editRoom.isAvailable} onChange={e => setEditRoom(p => ({...p, isAvailable: e.target.checked}))} />
                      Dostępny
                    </label>
                    <div className="flex gap-2">
                      <button onClick={saveRoom} className="btn-primary flex-1">Zapisz</button>
                      <button onClick={() => setEditRoom(null)} className="btn-secondary flex-1">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{room.name}</p>
                      {room.description && <p className="text-sm text-gray-500">{room.description}</p>}
                      <p className="text-sm text-gray-400">👥 {room.capacity} os. • {room.isAvailable ? '✅ Dostępny' : '❌ Niedostępny'}</p>
                      {room.bookings?.length > 0 && (
                        <p className="text-xs text-rose-600 mt-1">📋 {room.bookings.length} rezerwacja(-e)</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditRoom({...room})} className="btn-secondary text-sm">✏️</button>
                      <button onClick={() => deleteRoom(room.id)} className="text-red-400 hover:text-red-600 px-2">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 && <div className="card text-center text-gray-400">Brak rezerwacji.</div>}
          {bookings.map(b => (
            <div key={b.id} className="card flex items-center justify-between gap-4 border-l-4 border-rose-300">
              <div>
                <p className="font-semibold text-gray-800">{b.room.name}</p>
                <p className="text-sm text-gray-600">👫 {b.wedding.couple?.name}</p>
                <p className="text-sm text-gray-500">
                  📅 {format(new Date(b.checkIn), 'dd.MM.yyyy', {locale: pl})} → {format(new Date(b.checkOut), 'dd.MM.yyyy', {locale: pl})}
                </p>
                <p className="text-sm text-gray-400">👥 {b.guestCount} os.{b.notes ? ` • ${b.notes}` : ''}</p>
              </div>
              <button onClick={() => cancelBooking(b.id)} className="text-red-400 hover:text-red-600 shrink-0">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PANEL PARY ───────────────────────────────────────────
function CoupleView({ weddingId }) {
  const [config, setConfig] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    Promise.all([
      api.get(`/accommodation/wedding/${weddingId}/config`),
      api.get(`/accommodation/wedding/${weddingId}/rooms`),
    ]).then(([c, r]) => {
      setConfig(c.data);
      setRoomData(r.data);
    }).finally(() => setLoading(false));
  }, [weddingId]);

  useEffect(() => { refresh(); }, [refresh]);

  const setWantsStay = async (val) => {
    try {
      await api.patch(`/accommodation/wedding/${weddingId}/config`, { wantsStay: val });
      toast.success(val ? 'Zaznaczono chęć noclegu' : 'Zrezygnowano z noclegu');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const bookRoom = async (roomId, checkIn, checkOut) => {
    try {
      await api.post(`/accommodation/wedding/${weddingId}/book`, {
        roomId, checkIn, checkOut, guestCount: 2,
      });
      toast.success('Pokój zarezerwowany!');
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd rezerwacji'); }
  };

  const cancelBooking = async (id) => {
    try {
      await api.delete(`/accommodation/bookings/${id}`);
      toast.success('Rezerwacja anulowana');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Ładowanie...</div>;

  const { allowedDates = [], rooms = [], myBookings = [] } = roomData || {};

  // Sprawdź czy pokój jest zarezerwowany w danej dacie przez kogoś
  const isRoomTaken = (room, dateStr) => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return room.bookings?.some(b => {
      const bd = new Date(b.checkIn); bd.setHours(0,0,0,0);
      return bd.getTime() === d.getTime();
    });
  };

  const isMyBooking = (roomId, dateStr) => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return myBookings.find(b => {
      const bd = new Date(b.checkIn); bd.setHours(0,0,0,0);
      return b.roomId === roomId && bd.getTime() === d.getTime();
    });
  };

  return (
    <div className="space-y-6">
      {/* Wybór TAK/NIE */}
      <div className="card">
        <h2 className="font-bold text-gray-800 text-lg mb-3">🛏️ Czy chcesz zarezerwować nocleg?</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setWantsStay(true)}
            className={`flex-1 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${config?.wantsStay === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
          >
            ✅ Tak, chcę nocleg
          </button>
          <button
            onClick={() => setWantsStay(false)}
            className={`flex-1 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${config?.wantsStay === false ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-200'}`}
          >
            ❌ Nie, dziękuję
          </button>
        </div>
      </div>

      {/* Moje rezerwacje */}
      {config?.wantsStay === true && myBookings.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Moje rezerwacje</h3>
          <div className="space-y-2">
            {myBookings.map(b => {
              const offset = getDayOffset(allowedDates, b.checkIn);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                  <div>
                    <p className="font-semibold text-gray-800">{b.room.name}</p>
                    <p className="text-sm text-gray-600">{DATE_LABELS[offset] || format(new Date(b.checkIn), 'dd.MM.yyyy', {locale: pl})}</p>
                  </div>
                  <button onClick={() => cancelBooking(b.id)} className="text-red-400 hover:text-red-600 text-sm">Anuluj</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dostępne pokoje */}
      {config?.wantsStay === true && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Dostępne pokoje</h3>
          <p className="text-sm text-gray-500">Możesz zarezerwować pokój tylko na dozwolone daty:</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {allowedDates.map((d, i) => (
              <span key={i} className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full">
                {DATE_LABELS[i - 1] || ''}: {format(new Date(d), 'dd.MM.yyyy', {locale: pl})}
              </span>
            ))}
          </div>

          {rooms.length === 0 && <div className="card text-center text-gray-400">Brak dostępnych pokojów. Skontaktuj się z koordynatorem.</div>}

          {rooms.map(room => (
            <div key={room.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{room.name}</p>
                  {room.description && <p className="text-sm text-gray-500">{room.description}</p>}
                  <p className="text-sm text-gray-400">👥 do {room.capacity} osób</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {allowedDates.map((dateStr, i) => {
                  const offset = i - 1;
                  const taken = isRoomTaken(room, dateStr);
                  const myBook = isMyBooking(room.id, dateStr);
                  const checkOut = new Date(dateStr);
                  checkOut.setDate(checkOut.getDate() + 1);

                  if (myBook) return (
                    <div key={i} className="p-3 rounded-xl bg-green-100 border border-green-300 text-center">
                      <p className="text-xs font-semibold text-green-700">{DATE_LABELS[offset]}</p>
                      <p className="text-xs text-green-600 mt-1">✅ Zarezerwowano</p>
                    </div>
                  );

                  if (taken) return (
                    <div key={i} className="p-3 rounded-xl bg-gray-100 border border-gray-200 text-center opacity-60">
                      <p className="text-xs font-semibold text-gray-500">{DATE_LABELS[offset]}</p>
                      <p className="text-xs text-gray-400 mt-1">❌ Zajęty</p>
                    </div>
                  );

                  return (
                    <button
                      key={i}
                      onClick={() => bookRoom(room.id, dateStr, checkOut.toISOString())}
                      className="p-3 rounded-xl border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-center transition-all"
                    >
                      <p className="text-xs font-semibold text-gray-700">{DATE_LABELS[offset]}</p>
                      <p className="text-xs text-rose-500 mt-1">+ Zarezerwuj</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {config?.wantsStay === false && (
        <div className="card text-center text-gray-400 py-8">
          <p>Zrezygnowałeś z noclegu.</p>
          <p className="text-sm mt-1">Możesz zmienić decyzję klikając "Tak, chcę nocleg" powyżej.</p>
        </div>
      )}

      {config?.wantsStay === null && (
        <div className="card text-center text-gray-400 py-8">
          Wybierz opcję powyżej aby kontynuować.
        </div>
      )}
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────────
export default function AccommodationPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'coordinator'].includes(user?.role);
  const isCouple = user?.role === 'couple';

  const [weddingId, setWeddingId] = useState(null);
  const [weddings, setWeddings] = useState([]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🛏️ Noclegi</h1>
        {!isCouple && weddings.length > 1 && (
          <select className="input w-auto" value={weddingId || ''} onChange={e => setWeddingId(e.target.value)}>
            {weddings.map(w => <option key={w.id} value={w.id}>{w.couple?.name || w.couple?.login}</option>)}
          </select>
        )}
      </div>

      {isAdmin && <AdminView />}
      {isCouple && weddingId && <CoupleView weddingId={weddingId} />}
      {!isCouple && !isAdmin && weddingId && <CoupleView weddingId={weddingId} />}
    </div>
  );
}
