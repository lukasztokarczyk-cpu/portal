import { useState } from 'react';
import toast from 'react-hot-toast';

const VENUE_LABEL = 'Perła Pienin, Podzagonie 12, 34-450 Grywałd';

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(mins) {
  const t = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function addMins(timeStr, mins) {
  return fromMinutes(toMinutes(timeStr) + mins);
}
function isNextDay(time) {
  return toMinutes(time) < 360; // przed 6:00 = następny dzień
}

const ICONS = {
  travel: '🚗', ceremony: '💍', venue: '🏛️',
  welcome: '🥂', meal: '🍽️', dessert: '🎂', end: '🌅',
};
const COLORS = {
  travel:   'border-blue-300 bg-blue-50',
  ceremony: 'border-purple-300 bg-purple-50',
  venue:    'border-rose-300 bg-rose-50',
  welcome:  'border-pink-300 bg-pink-50',
  meal:     'border-amber-300 bg-amber-50',
  dessert:  'border-orange-300 bg-orange-50',
  end:      'border-green-300 bg-green-50',
};

export default function WeddingPlanPage() {
  const [step, setStep] = useState(1);
  const [skipHometowns, setSkipHometowns] = useState(null); // null = nie wybrano, true/false
  const [form, setForm] = useState({
    groomCity: '', brideCity: '', churchCity: '',
    ceremonyTime: '14:00',
    dessert1: 'tort', dessert2: 'deser', dessert3: 'tort',
  });
  const [travelTimes, setTravelTimes] = useState({
    groomToChurch: 30, brideToChurch: 20, churchToVenue: 45,
  });
  const [loadingTravel, setLoadingTravel] = useState(false);
  const [schedule, setSchedule] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Krok 1a — czy podawać miejscowości Państwa Młodych?
  const handleSkipChoice = (skip) => {
    setSkipHometowns(skip);
    if (skip) {
      // pomiń miejscowości — idź od razu do kościoła
      setStep(2);
    } else {
      setStep('1b');
    }
  };

  const fetchTravelTimes = async () => {
    setLoadingTravel(true);
    try {
      const prompt = skipHometowns
        ? `Oszacuj czas dojazdu samochodem (w minutach) z "${form.churchCity}" do miejscowości Grywałd koło Krościenka nad Dunajcem w Pieninach (Małopolska). Odpowiedz TYLKO JSON:
{"churchToVenue": <liczba minut>}`
        : `Oszacuj czasy dojazdu samochodem (w minutach) dla tras w Polsce, uwzględnij górski teren i typowe drogi. Odpowiedz TYLKO JSON:
{"groomToChurch": <liczba minut>, "brideToChurch": <liczba minut>, "churchToVenue": <liczba minut>}

Trasy:
1. Z "${form.groomCity}" do "${form.churchCity}"
2. Z "${form.brideCity}" do "${form.churchCity}"
3. Z "${form.churchCity}" do Grywałd (Pieniny, koło Krościenka nad Dunajcem)`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setTravelTimes(t => ({ ...t, ...parsed }));
    } catch {
      toast('Używam szacunkowych czasów dojazdu', { icon: '⚠️' });
    } finally {
      setLoadingTravel(false);
    }
  };

  const buildSchedule = () => {
    const ceremony = form.ceremonyTime;
    const ctv = travelTimes.churchToVenue || 45;

    // Ceremonia 55 min
    const ceremonyEnd = addMins(ceremony, 55);
    const arrivalVenue = addMins(ceremonyEnd, ctv);

    // Powitanie 20 min, toast szampana
    const welcomeToast = addMins(arrivalVenue, 20);

    // Obiad 15 min po powitaniu
    const dinnerTime = addMins(welcomeToast, 15);
    const dinnerEnd = addMins(dinnerTime, 60);

    // Deser 1 po obiedzie (1.5h)
    const hasDessert1 = form.dessert1 !== 'nie';
    const after1End = hasDessert1 ? addMins(dinnerEnd, 90) : dinnerEnd;

    // 1. kolacja — 3h po obiedzie
    const warm1 = addMins(dinnerTime, 180);
    const warm1End = addMins(warm1, 60);

    // Deser 2 po 1. kolacji (1h)
    const hasDessert2 = form.dessert2 !== 'nie';
    const after2End = hasDessert2 ? addMins(warm1End, 60) : warm1End;

    // 2. kolacja — równy odstęp od 1. kolacji co od obiadu
    const gap = toMinutes(warm1) - toMinutes(dinnerTime); // 180 min
    const warm2 = addMins(warm1, gap);
    const warm2End = addMins(warm2, 60);

    // Deser 3 po 2. kolacji (1h) — TYLKO jeśli wybrany
    const hasDessert3 = form.dessert3 !== 'nie';
    // USUNIĘTO deser 3 z harmonogramu (był problem z wyświetlaniem po 2. kolacji)

    // 3. kolacja o 01:30
    const warm3 = '01:30';

    const events = [
      // Opcjonalne dojazdy
      ...(!skipHometowns && form.groomCity ? [{
        time: addMins(ceremony, -(travelTimes.groomToChurch || 30)),
        label: `Pan Młody wyjeżdża z ${form.groomCity}`,
        category: 'travel',
        note: `Szacowany czas dojazdu: ~${travelTimes.groomToChurch || 30} min`,
      }] : []),
      ...(!skipHometowns && form.brideCity ? [{
        time: addMins(ceremony, -(travelTimes.brideToChurch || 20)),
        label: `Panna Młoda wyjeżdża z ${form.brideCity}`,
        category: 'travel',
        note: `Szacowany czas dojazdu: ~${travelTimes.brideToChurch || 20} min`,
      }] : []),
      // Ceremonia
      { time: ceremony, label: 'Ceremonia ślubna', category: 'ceremony', note: form.churchCity || '' },
      { time: ceremonyEnd, label: 'Wyjście z kościoła', category: 'ceremony', note: `Dojazd do sali: ~${ctv} min` },
      // Przyjazd
      { time: arrivalVenue, label: `Przybycie do ${VENUE_LABEL}`, category: 'venue', note: '⏱️ Orientacyjna godzina przybycia' },
      { time: arrivalVenue, label: 'Powitanie Pary Młodej chlebem i solą', category: 'welcome', note: '~20 minut' },
      { time: welcomeToast, label: 'Toast za Państwa Młodych 🥂', category: 'welcome', note: 'Kieliszki szampana' },
      // Obiad
      { time: dinnerTime, label: 'Obiad weselny', category: 'meal', note: '🍲 Orientacyjna godzina — może się zmienić' },
      ...(hasDessert1 ? [{
        time: dinnerEnd,
        label: form.dessert1 === 'tort' ? 'Tort weselny' : 'Deser',
        category: 'dessert', note: '~1,5 godziny',
      }] : []),
      // 1. kolacja
      { time: warm1, label: '1. ciepłe danie', category: 'meal', note: '🍗 Orientacyjna godzina' },
      ...(hasDessert2 ? [{
        time: warm1End,
        label: form.dessert2 === 'tort' ? 'Tort weselny' : 'Deser',
        category: 'dessert', note: '~1 godzina',
      }] : []),
      // 2. kolacja
      { time: warm2, label: '2. ciepłe danie', category: 'meal', note: '🍖 Orientacyjna godzina' },
      // 3. kolacja
      { time: warm3, label: '3. ciepłe danie — ranny posiłek', category: 'meal', note: '🌙 Orientacyjna godzina' },
      // Koniec — zawsze na końcu (06:00 > 05:00 więc zostanie posortowany po wszystkim)
      { time: '05:00', label: 'Zakończenie przyjęcia weselnego', category: 'end', note: '🌅 Do zobaczenia!' },
    ];

    // Sortuj: dni traktuj jako 0–23h normalne, po północy (0-5h) = +1440
    events.sort((a, b) => {
      const ta = toMinutes(a.time);
      const tb = toMinutes(b.time);
      const fa = ta < 360 ? ta + 1440 : ta;
      const fb = tb < 360 ? tb + 1440 : tb;
      return fa - fb;
    });

    setSchedule(events);
    setStep(4);
  };

  const totalSteps = skipHometowns ? 3 : 4;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📅 Plan dnia weselnego</h1>
        <p className="text-sm text-gray-500 mt-1">Kalkulator harmonogramu — od wyjazdu do zakończenia przyjęcia</p>
      </div>

      {/* KROK 1 — Czy podawać miejscowości? */}
      {step === 1 && (
        <div className="card space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">🏘️ Miejscowości Państwa Młodych</h2>
          <p className="text-gray-600 text-sm">Czy chcesz uwzględnić w harmonogramie dojazd Pana i Panny Młodej z domu do kościoła?</p>
          <div className="flex flex-col gap-3">
            <button
              className="w-full py-4 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-semibold text-left px-5 hover:border-rose-400 transition-all"
              onClick={() => handleSkipChoice(false)}
            >
              ✅ Tak — chcę uwzględnić dojazd z domu do kościoła
              <p className="text-xs font-normal text-rose-500 mt-1">Podasz miejscowości Pana i Panny Młodej</p>
            </button>
            <button
              className="w-full py-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-700 font-semibold text-left px-5 hover:border-gray-400 transition-all"
              onClick={() => handleSkipChoice(true)}
            >
              ⏭️ Nie — zacznij od ceremonii w kościele
              <p className="text-xs font-normal text-gray-400 mt-1">Pomiń wyjazdy, podaj tylko miejscowość kościoła</p>
            </button>
          </div>
        </div>
      )}

      {/* KROK 1b — Miejscowości (tylko jeśli wybrali "tak") */}
      {step === '1b' && (
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">🚗 Miejscowości dojazdu</h2>
          <p className="text-sm text-gray-500">Tylko nazwy miejscowości — bez konkretnych adresów.</p>
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
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(1)}>← Wróć</button>
            <button
              className="btn-primary flex-1 justify-center"
              disabled={loadingTravel || !form.groomCity || !form.brideCity || !form.churchCity}
              onClick={async () => { await fetchTravelTimes(); setStep(2); }}
            >
              {loadingTravel ? '⏳ Obliczam...' : 'Dalej — oblicz czasy →'}
            </button>
          </div>
        </div>
      )}

      {/* KROK 2 — Kościół (jeśli skip) + godzina ślubu + czasy */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">⛪ Ceremonia i dojazd</h2>

          {skipHometowns && (
            <div>
              <label className="label">Miejscowość kościoła / urzędu</label>
              <input className="input" placeholder="np. Krościenko nad Dunajcem" value={form.churchCity} onChange={e => set('churchCity', e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Godzina ślubu / ceremonii</label>
            <input type="time" className="input" value={form.ceremonyTime} onChange={e => set('ceremonyTime', e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="label">Czasy dojazdu (możesz poprawić)</p>
            {!skipHometowns && (
              <>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">🚗 {form.groomCity} → {form.churchCity}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" className="input w-20 text-center py-1" value={travelTimes.groomToChurch || ''} onChange={e => setTravelTimes(t => ({ ...t, groomToChurch: parseInt(e.target.value) || 0 }))} />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">🚗 {form.brideCity} → {form.churchCity}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" className="input w-20 text-center py-1" value={travelTimes.brideToChurch || ''} onChange={e => setTravelTimes(t => ({ ...t, brideToChurch: parseInt(e.target.value) || 0 }))} />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">🚗 {form.churchCity || 'Kościół'} → Grywałd (Perła Pienin)</span>
              <div className="flex items-center gap-2">
                <input type="number" className="input w-20 text-center py-1" value={travelTimes.churchToVenue || ''} onChange={e => setTravelTimes(t => ({ ...t, churchToVenue: parseInt(e.target.value) || 0 }))}
                  onFocus={async () => { if (!travelTimes.churchToVenue && form.churchCity) { await fetchTravelTimes(); } }}
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            📍 <strong>Sala weselna:</strong> {VENUE_LABEL}
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(skipHometowns ? 1 : '1b')}>← Wróć</button>
            <button
              className="btn-primary flex-1 justify-center"
              disabled={loadingTravel}
              onClick={async () => {
                if (skipHometowns && form.churchCity && !travelTimes.churchToVenue) {
                  await fetchTravelTimes();
                }
                setStep(3);
              }}
            >
              {loadingTravel ? '⏳ Obliczam...' : 'Dalej →'}
            </button>
          </div>
        </div>
      )}

      {/* KROK 3 — Desery */}
      {step === 3 && (
        <div className="card space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">🎂 Desery i tort</h2>
          <p className="text-sm text-gray-500">Wybierz co będzie podane po każdym posiłku.</p>
          {[
            { key: 'dessert1', label: 'Po obiedzie (~1,5h)', note: 'Pierwsze danie weselne' },
            { key: 'dessert2', label: 'Po 1. kolacji (~1h)', note: 'Wieczorny posiłek' },
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
                  <button key={value} type="button" onClick={() => set(key, value)}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${form[key] === value ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
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

          {/* Zastrzeżenie */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            ⚠️ <strong>Harmonogram orientacyjny</strong> — podane godziny mogą ulec zmianie w zależności od warunków dojazdu, przebiegu ceremonii oraz nieprzewidzianych sytuacji.
          </div>

          {/* Info dojazdy */}
          <div className={`grid gap-2 ${skipHometowns ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {!skipHometowns && (
              <>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 mb-1">{form.groomCity} → kościół</p>
                  <p className="font-bold text-blue-700">~{travelTimes.groomToChurch} min</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 mb-1">{form.brideCity} → kościół</p>
                  <p className="font-bold text-blue-700">~{travelTimes.brideToChurch} min</p>
                </div>
              </>
            )}
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-500 mb-1">Kościół → Grywałd</p>
              <p className="font-bold text-blue-700">~{travelTimes.churchToVenue} min</p>
            </div>
          </div>

          {/* Oś czasu */}
          <div className="relative">
            {schedule.map((event, i) => {
              const nextDay = isNextDay(event.time);
              const prevNextDay = i > 0 && isNextDay(schedule[i - 1].time);
              const showMidnight = nextDay && !prevNextDay;
              return (
                <div key={i}>
                  {showMidnight && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-indigo-200" />
                      <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">🌙 Następny dzień</span>
                      <div className="flex-1 h-px bg-indigo-200" />
                    </div>
                  )}
                  <div className="flex gap-3 mb-3">
                    <div className="w-14 text-right pt-3 flex-shrink-0">
                      <span className={`text-sm font-bold ${event.category === 'end' ? 'text-green-700' : 'text-gray-700'}`}>{event.time}</span>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full mt-3.5 border-2 ${event.category === 'end' ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`} />
                      {i < schedule.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className={`flex-1 border-l-4 rounded-xl px-4 py-3 mb-1 ${COLORS[event.category] || 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{ICONS[event.category]}</span>
                        <div>
                          <p className={`font-semibold text-sm ${event.category === 'end' ? 'text-green-700' : 'text-gray-800'}`}>{event.label}</p>
                          {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn-secondary w-full justify-center no-print" onClick={() => window.print()}>
            🖨️ Drukuj harmonogram
          </button>
        </div>
      )}
    </div>
  );
}
