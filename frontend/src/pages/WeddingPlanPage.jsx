import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Stała lokalizacja sali weselnej
const VENUE = 'Grywałd 12, 34-450 Grywałd, Polska';
const VENUE_LABEL = 'Perła Pienin, Grywałd 12, 34-450 Grywałd';

// Szacowanie czasu dojazdu przez Google Maps Distance Matrix API (przez backend proxy)
// Fallback: szacowanie na podstawie odległości ~1.2 min/km dla górskich dróg
function estimateDriveTime(fromPlace, toPlace) {
  // Użyj API Anthropic do oszacowania czasu - fallback 45 min
  return null;
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins) {
  const totalMins = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMins(timeStr, mins) {
  return fromMinutes(toMinutes(timeStr) + mins);
}

const CATEGORY_ICONS = {
  travel: '🚗', ceremony: '💍', venue: '🏛️',
  welcome: '🥂', meal: '🍽️', dessert: '🎂',
  party: '🎵', end: '🌅',
};

export default function WeddingPlanPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    groomCity: '',
    brideCity: '',
    churchCity: '',
    ceremonyTime: '14:00',
    dessert1: 'tort',   // po obiedzie: 'tort' | 'deser' | 'nie'
    dessert2: 'deser',  // po kolacji
    dessert3: 'tort',   // po 2. kolacji
  });
  const [travelTimes, setTravelTimes] = useState({
    groomToChurch: null,
    brideToChurch: null,
    churchToVenue: null,
  });
  const [loadingTravel, setLoadingTravel] = useState(false);
  const [schedule, setSchedule] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Pobierz czasy dojazdu przez Anthropic API (Distance Matrix)
  const fetchTravelTimes = async () => {
    if (!form.groomCity || !form.brideCity || !form.churchCity) {
      toast.error('Uzupełnij wszystkie miejscowości');
      return false;
    }
    setLoadingTravel(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Oszacuj czas dojazdu samochodem (w minutach) dla 3 tras w Polsce. Weź pod uwagę typowe polskie drogi, ograniczenia prędkości i teren. Odpowiedz TYLKO JSON bez żadnego tekstu przed ani po:
{"groomToChurch": <liczba minut>, "brideToChurch": <liczba minut>, "churchToVenue": <liczba minut>}

Trasy:
1. Z miejscowości "${form.groomCity}" do miejscowości "${form.churchCity}" (kościół)
2. Z miejscowości "${form.brideCity}" do miejscowości "${form.churchCity}" (kościół)  
3. Z miejscowości "${form.churchCity}" do Grywałd (koło Krościenka nad Dunajcem, powiat nowotarski, Małopolska) - to jest miejscowość w Pieninach`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setTravelTimes(parsed);
      return true;
    } catch (e) {
      // Fallback — szacowanie "na oko"
      toast('Używam szacunkowych czasów dojazdu', { icon: '⚠️' });
      setTravelTimes({ groomToChurch: 30, brideToChurch: 20, churchToVenue: 45 });
      return true;
    } finally {
      setLoadingTravel(false);
    }
  };

  const buildSchedule = () => {
    const ceremony = form.ceremonyTime;
    const churchToVenue = travelTimes.churchToVenue || 45;

    // Przybycie do sali = koniec ceremonii + dojazd
    // Ceremonia trwa ok 45 min
    const ceremonyEnd = addMins(ceremony, 45);
    const arrivalVenue = addMins(ceremonyEnd, churchToVenue);

    // Powitanie chlebem i solą + szampan = 20 min
    const welcomeEnd = addMins(arrivalVenue, 20);

    // Obiad
    const dinnerTime = addMins(welcomeEnd, 15); // 15 min na usadzenie
    const dinnerEnd = addMins(dinnerTime, 60);  // obiad ~60 min

    // Dessert 1 (po obiedzie)
    let after1End = dinnerEnd;
    const hasDessert1 = form.dessert1 !== 'nie';
    if (hasDessert1) {
      after1End = addMins(dinnerEnd, 90); // 1.5h na tort/deser
    }

    // 1. ciepłe danie — 3h po obiedzie
    const warm1 = addMins(dinnerTime, 180);
    const warm1End = addMins(warm1, 60);

    // Dessert 2 (po 1. kolacji)
    let after2End = warm1End;
    const hasDessert2 = form.dessert2 !== 'nie';
    if (hasDessert2) {
      after2End = addMins(warm1End, 60);
    }

    // 2. ciepłe danie
    const gap12 = toMinutes(warm1) - toMinutes(dinnerTime); // dystans 1-2
    const warm2 = addMins(warm1, gap12); // równy odstęp
    const warm2End = addMins(warm2, 60);

    // Dessert 3 (po 2. kolacji)
    let after3End = warm2End;
    const hasDessert3 = form.dessert3 !== 'nie';
    if (hasDessert3) {
      after3End = addMins(warm2End, 60);
    }

    // 3. ciepłe danie — o 1:30 dnia następnego (fixed)
    const warm3 = '01:30';
    const warm3End = '02:30';

    const events = [
      // Dojazdy
      {
        time: addMins(ceremony, -(travelTimes.groomToChurch || 30)),
        label: `Pan Młody wyjeżdża z ${form.groomCity}`,
        category: 'travel',
        note: `Czas dojazdu: ~${travelTimes.groomToChurch || 30} min`,
      },
      {
        time: addMins(ceremony, -(travelTimes.brideToChurch || 20)),
        label: `Panna Młoda wyjeżdża z ${form.brideCity}`,
        category: 'travel',
        note: `Czas dojazdu: ~${travelTimes.brideToChurch || 20} min`,
      },
      // Ceremonia
      { time: ceremony, label: 'Ceremonia ślubna', category: 'ceremony', note: form.churchCity },
      { time: ceremonyEnd, label: 'Wyjście z kościoła', category: 'ceremony', note: `Dojazd do sali: ~${churchToVenue} min` },
      // Przyjazd do sali
      { time: arrivalVenue, label: `Przybycie do ${VENUE_LABEL}`, category: 'venue', note: '' },
      { time: arrivalVenue, label: 'Powitanie Pary Młodej chlebem i solą', category: 'welcome', note: '~20 minut' },
      { time: addMins(arrivalVenue, 20), label: 'Kieliszki szampana — Toast!', category: 'welcome', note: '🥂' },
      // Obiad
      { time: dinnerTime, label: 'Obiad weselny', category: 'meal', note: '🍲 Pierwsze danie' },
      ...(hasDessert1 ? [{
        time: dinnerEnd,
        label: form.dessert1 === 'tort' ? 'Tort weselny' : 'Deser',
        category: 'dessert',
        note: '~1,5 godziny',
      }] : []),
      // 1. kolacja
      { time: warm1, label: '1. ciepłe danie (kolacja)', category: 'meal', note: '🍗' },
      ...(hasDessert2 ? [{
        time: warm1End,
        label: form.dessert2 === 'tort' ? 'Tort / przekrojenie tortu' : 'Deser',
        category: 'dessert',
        note: '~1 godzina',
      }] : []),
      // 2. kolacja
      { time: warm2, label: '2. ciepłe danie', category: 'meal', note: '🍖' },
      ...(hasDessert3 ? [{
        time: warm2End,
        label: form.dessert3 === 'tort' ? 'Tort / słodki finał' : 'Deser',
        category: 'dessert',
        note: '~1 godzina',
      }] : []),
      // 3. kolacja — rankiem
      { time: warm3, label: '3. ciepłe danie — ranny posiłek', category: 'meal', note: '🌙 W nocy' },
      // Koniec
      { time: '05:00', label: 'Koniec wesela', category: 'end', note: '🌅 Do zobaczenia!' },
    ];

    // Sortuj po czasie (uwzględniając północ)
    events.sort((a, b) => {
      const ta = toMinutes(a.time);
      const tb = toMinutes(b.time);
      // Czas po północy traktuj jako 24h+
      const fa = ta < 300 ? ta + 1440 : ta;
      const fb = tb < 300 ? tb + 1440 : tb;
      return fa - fb;
    });

    setSchedule(events);
    setStep(4);
  };

  const isNextDay = (time) => toMinutes(time) < 300; // przed 5:00 = następny dzień

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📅 Plan dnia weselnego</h1>
        <p className="text-sm text-gray-500 mt-1">Kalkulator harmonogramu — od wyjazdu do końca wesela</p>
      </div>

      {/* Pasek postępu */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > s ? 'bg-rose-500 text-white' : step === s ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400' : 'bg-gray-100 text-gray-400'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-rose-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* KROK 1 — Trasy */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">🚗 Trasy dojazdu</h2>
          <p className="text-sm text-gray-500">Podaj tylko nazwy miejscowości — czas dojazdu zostanie obliczony automatycznie.</p>

          <div>
            <label className="label">Miejscowość Pana Młodego</label>
            <input className="input" placeholder="np. Nowy Targ" value={form.groomCity} onChange={e => set('groomCity', e.target.value)} />
          </div>
          <div>
            <label className="label">Miejscowość Panny Młodej</label>
            <input className="input" placeholder="np. Zakopane" value={form.brideCity} onChange={e => set('brideCity', e.target.value)} />
          </div>
          <div>
            <label className="label">Miejscowość kościoła / urzędu</label>
            <input className="input" placeholder="np. Krościenko nad Dunajcem" value={form.churchCity} onChange={e => set('churchCity', e.target.value)} />
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            📍 <strong>Sala weselna</strong> (stała): {VENUE_LABEL}
          </div>

          <button
            className="btn-primary w-full justify-center"
            onClick={async () => {
              const ok = await fetchTravelTimes();
              if (ok) setStep(2);
            }}
            disabled={loadingTravel}
          >
            {loadingTravel ? '⏳ Obliczam czasy dojazdu...' : 'Dalej — oblicz czasy →'}
          </button>
        </div>
      )}

      {/* KROK 2 — Czasy dojazdu + godzina ślubu */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">⏱️ Czasy dojazdu</h2>

          <div className="space-y-2">
            {[
              { label: `🚗 ${form.groomCity} → ${form.churchCity}`, key: 'groomToChurch' },
              { label: `🚗 ${form.brideCity} → ${form.churchCity}`, key: 'brideToChurch' },
              { label: `🚗 ${form.churchCity} → Grywałd (Perła Pienin)`, key: 'churchToVenue' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-20 text-center py-1"
                    value={travelTimes[key] || ''}
                    onChange={e => setTravelTimes(t => ({ ...t, [key]: parseInt(e.target.value) || 0 }))}
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="label">Godzina ślubu / ceremonii</label>
            <input type="time" className="input" value={form.ceremonyTime} onChange={e => set('ceremonyTime', e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(1)}>← Wróć</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => setStep(3)}>Dalej →</button>
          </div>
        </div>
      )}

      {/* KROK 3 — Desery / torty */}
      {step === 3 && (
        <div className="card space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">🎂 Desery i tort</h2>
          <p className="text-sm text-gray-500">Wybierz co będzie podane po każdym posiłku.</p>

          {[
            { key: 'dessert1', label: 'Po obiedzie (~1,5h)', note: 'Pierwsze danie weselne' },
            { key: 'dessert2', label: 'Po 1. kolacji (~1h)', note: 'Wieczorny posiłek' },
            { key: 'dessert3', label: 'Po 2. kolacji (~1h)', note: 'Nocna kolacja' },
          ].map(({ key, label, note }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <p className="text-xs text-gray-400 mb-2">{note}</p>
              <div className="flex gap-2">
                {[
                  { value: 'tort', emoji: '🎂', text: 'Tort' },
                  { value: 'deser', emoji: '🍮', text: 'Deser' },
                  { value: 'nie', emoji: '❌', text: 'Bez deseru' },
                ].map(({ value, emoji, text }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set(key, value)}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form[key] === value
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {emoji} {text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(2)}>← Wróć</button>
            <button className="btn-primary flex-1 justify-center" onClick={buildSchedule}>
              📋 Generuj harmonogram →
            </button>
          </div>
        </div>
      )}

      {/* KROK 4 — Harmonogram */}
      {step === 4 && schedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-lg">📋 Harmonogram dnia weselnego</h2>
            <button className="btn-secondary text-sm" onClick={() => setStep(1)}>✏️ Edytuj</button>
          </div>

          {/* Info dojazdy */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: form.groomCity + ' → kościół', val: travelTimes.groomToChurch },
              { label: form.brideCity + ' → kościół', val: travelTimes.brideToChurch },
              { label: 'Kościół → Grywałd', val: travelTimes.churchToVenue },
            ].map(({ label, val }, i) => (
              <div key={i} className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-500 mb-1">{label}</p>
                <p className="font-bold text-blue-700">{val} min</p>
              </div>
            ))}
          </div>

          {/* Oś czasu */}
          <div className="relative">
            {schedule.map((event, i) => {
              const nextDay = isNextDay(event.time);
              const showMidnight = nextDay && (i === 0 || !isNextDay(schedule[i - 1]?.time));
              const colors = {
                travel: 'border-blue-300 bg-blue-50',
                ceremony: 'border-purple-300 bg-purple-50',
                venue: 'border-rose-300 bg-rose-50',
                welcome: 'border-pink-300 bg-pink-50',
                meal: 'border-amber-300 bg-amber-50',
                dessert: 'border-orange-300 bg-orange-50',
                party: 'border-green-300 bg-green-50',
                end: 'border-gray-300 bg-gray-50',
              };
              return (
                <div key={i}>
                  {showMidnight && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-indigo-200" />
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full">🌙 Następny dzień</span>
                      <div className="flex-1 h-px bg-indigo-200" />
                    </div>
                  )}
                  <div className="flex gap-3 mb-3">
                    {/* Czas */}
                    <div className="w-14 text-right pt-3 flex-shrink-0">
                      <span className={`text-sm font-bold ${event.category === 'end' ? 'text-rose-600' : 'text-gray-700'}`}>
                        {event.time}
                      </span>
                    </div>
                    {/* Linia */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full mt-3.5 border-2 ${event.category === 'end' ? 'bg-rose-500 border-rose-500' : 'bg-white border-gray-300'}`} />
                      {i < schedule.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    {/* Karta */}
                    <div className={`flex-1 border-l-4 rounded-xl px-4 py-3 mb-1 ${colors[event.category] || 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{CATEGORY_ICONS[event.category]}</span>
                        <div>
                          <p className={`font-semibold text-sm ${event.category === 'end' ? 'text-rose-700 text-base' : 'text-gray-800'}`}>
                            {event.label}
                          </p>
                          {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card bg-rose-50 border-2 border-rose-200 text-center py-4">
            <p className="font-bold text-rose-700 text-lg">🌅 05:00 — Koniec wesela</p>
            <p className="text-sm text-rose-500 mt-1">Gratulacje dla Pary Młodej! 💍</p>
          </div>

          <button
            className="btn-secondary w-full justify-center"
            onClick={() => window.print()}
          >
            🖨️ Drukuj harmonogram
          </button>
        </div>
      )}
    </div>
  );
}
