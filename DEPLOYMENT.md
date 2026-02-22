# 🚀 Wdrożenie na 100% darmowym stacku

## Stack i dlaczego akurat te usługi

```
Vercel      → frontend React   (naprawdę darmowy, bez limitów, bez zasypiania)
Render      → backend Node.js  (darmowy, zasypia ale mamy keep-alive w kodzie)
Supabase    → PostgreSQL + pliki (darmowy, pauzuje ale keep-alive to naprawia)
GitHub      → repozytorium     (darmowy zawsze)
```

**Łączny koszt: 0 zł**

---

## Krok 0 – Przygotuj repozytorium GitHub

1. Idź na [github.com](https://github.com) → zaloguj się → **New repository**
2. Nazwa: `strefa-pary-mlodej`, widoczność: **Private**
3. Na swoim komputerze w folderze z projektem:

```bash
git init
git add .
git commit -m "Strefa Pary Młodej – initial commit"
git branch -M main
git remote add origin https://github.com/TWOJA_NAZWA/strefa-pary-mlodej.git
git push -u origin main
```

---

## Krok 1 – Supabase (baza danych + pliki)

### 1.1 Utwórz projekt

1. Idź na [supabase.com](https://supabase.com) → **Start your project** → zaloguj GitHub
2. **New project** → nazwa: `strefa-pary`, region: `Central EU (Frankfurt)`
3. Ustaw **silne hasło do bazy** i zapisz je!
4. Kliknij **Create** i poczekaj ~2 minuty

### 1.2 Skopiuj dane połączenia

**Project Settings → Database → Connection string → URI**

Skopiuj dwa adresy (będą potrzebne w Render):

```
# DATABASE_URL (z pgbouncer=true na końcu) – dla aplikacji:
postgresql://postgres.[ref]:[hasło]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# DIRECT_URL (port 5432, bez pgbouncer) – dla migracji:
postgresql://postgres.[ref]:[hasło]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**Project Settings → API:**
```
SUPABASE_URL = https://[twój-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...  ← "service_role", NIE "anon"!
```

### 1.3 Utwórz buckety Storage

**Storage → New bucket** – utwórz 3 buckety (wszystkie **Private**):
- `documents`
- `invoices`  
- `attachments`

---

## Krok 2 – Render (backend)

1. Idź na [render.com](https://render.com) → **Get Started** → zaloguj GitHub
2. **New → Web Service**
3. Połącz repozytorium `strefa-pary-mlodej`
4. Wypełnij formularz:

| Pole | Wartość |
|------|---------|
| Name | `strefa-pary-backend` |
| Root Directory | `backend` |
| Environment | `Node` |
| Build Command | `npm ci && npx prisma generate` |
| Start Command | `npm run start:prod` |
| Plan | `Free` |

5. Kliknij **Advanced** → **Add Environment Variable** i dodaj wszystkie:

| Klucz | Wartość |
|-------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(z Supabase, z pgbouncer)* |
| `DIRECT_URL` | *(z Supabase, port 5432)* |
| `SUPABASE_URL` | *(z Supabase API settings)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(service_role key)* |
| `JWT_SECRET` | *(wygeneruj: `openssl rand -hex 32`)* |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | *(zostaw puste na razie, uzupełnisz po deploymencie frontendu)* |
| `SELF_URL` | *(zostaw puste na razie, uzupełnisz po deploymencie backendu)* |

6. **Create Web Service** → poczekaj na build (~5 min)

7. Po deploymencie skopiuj URL backendu (np. `https://strefa-pary-backend.onrender.com`)

8. **Wróć do Environment Variables** i uzupełnij:
   - `SELF_URL` = `https://strefa-pary-backend.onrender.com`

### 2.1 Uruchom migracje i seed

W Render Dashboard → **strefa-pary-backend** → **Shell**:

```bash
# Uruchom migracje (tworzy tabele w Supabase)
npx prisma migrate deploy

# Załaduj przykładowe dane (opcjonalnie)
node prisma/seed.js
```

Po seedzie dostępne konta:
- `admin@perlapienin.pl` / `Admin1234!`
- `koordynator@perlapienin.pl` / `Coord1234!`
- `para@example.com` / `Para1234!`

---

## Krok 3 – Vercel (frontend)

1. Idź na [vercel.com](https://vercel.com) → **Sign Up** → zaloguj GitHub
2. **Add New → Project** → wybierz `strefa-pary-mlodej`
3. Wypełnij:

| Pole | Wartość |
|------|---------|
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. **Environment Variables** → dodaj:

| Klucz | Wartość |
|-------|---------|
| `VITE_API_URL` | `https://strefa-pary-backend.onrender.com` |

5. **Deploy** → poczekaj ~2 minuty

6. Skopiuj URL frontendu (np. `https://strefa-pary-mlodej.vercel.app`)

### 3.1 Zaktualizuj CORS w Render

Wróć do Render → **strefa-pary-backend** → **Environment**:
- `CLIENT_URL` = `https://strefa-pary-mlodej.vercel.app`

Render automatycznie zrestartuje serwis.

---

## Krok 4 – Weryfikacja

Otwórz frontend w przeglądarce i zaloguj się. Sprawdź czy:
- [ ] Logowanie działa
- [ ] Dashboard wyświetla dane
- [ ] Można dodać gościa
- [ ] Chat działa
- [ ] Dokumenty można uploadować

API health check: `https://strefa-pary-backend.onrender.com/api/health`  
Powinna zwrócić: `{"status":"ok","db":"connected"}`

---

## Keep-alive – jak działa automatycznie

**Nie musisz nic robić.** Backend ma wbudowany mechanizm:

```
serwer startuje → co 14 minut pinguje sam siebie → Render nie zasypia
każdy ping robi SELECT 1 do Supabase → Supabase nie pauzuje projektu
```

Jedyne co musisz ustawić to `SELF_URL` w Render (zrobione w Kroku 2).

---

## Aktualizacje kodu

```bash
# Wprowadź zmiany lokalnie, potem:
git add .
git commit -m "opis zmiany"
git push origin main

# Render i Vercel automatycznie przebudują aplikację
```

---

## Porównanie ograniczeń (dla jasności)

| Co | Limit darmowy | Dla 1 wesela |
|----|--------------|-------------|
| Supabase DB | 500 MB | ✅ Wystarczy (kilka MB) |
| Supabase Storage | 1 GB | ✅ Wystarczy na dokumenty |
| Supabase MAU | 50 000 | ✅ Kilka osób używa |
| Render RAM | 512 MB | ✅ Node.js ~100 MB |
| Render bandwidth | 100 GB/mies | ✅ Zdecydowanie wystarczy |
| Vercel deployments | 100/dzień | ✅ Nie ma problemu |
| GitHub repo | Prywatne ✅ | ✅ |

---

## Jeśli coś nie działa

**Backend nie odpowiada (pierwsze uruchomienie po długiej przerwie):**  
Poczekaj 30 sekund – Render musi się "obudzić". Przy aktywnym keep-alive to rzadkość.

**Supabase "Project paused":**  
Zaloguj się na supabase.com → kliknij **Restore** → projekt wraca w ~1 minutę.  
Sprawdź czy `SELF_URL` jest ustawione poprawnie w Render.

**CORS error w przeglądarce:**  
Upewnij się że `CLIENT_URL` w Render to dokładny URL frontendu z Vercel (bez `/` na końcu).

**Migracje nie działają:**  
Upewnij się że `DIRECT_URL` (port 5432, bez pgbouncer) jest ustawiony w Render.
