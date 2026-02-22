# 💐 Strefa Pary Młodej – Perła Pienin

Aplikacja webowa do obsługi wesela po podpisaniu umowy z salą weselną **Perła Pienin**.

---

## 🏗 Architektura projektu

```
strefa-pary-mlodej/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Schemat bazy danych
│   │   └── seed.js             # Dane startowe
│   ├── src/
│   │   ├── controllers/        # Logika biznesowa endpointów
│   │   ├── middleware/         # auth, validate, upload, errorHandler
│   │   ├── prisma/             # Singleton Prisma Client
│   │   ├── routes/             # Definicje tras API
│   │   └── server.js           # Punkt wejścia serwera
│   ├── .env                    # Zmienne środowiskowe
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/Layout.jsx   # Sidebar + główny layout
│   │   ├── pages/              # Widoki: Dashboard, Goście, Menu...
│   │   ├── services/api.js     # Axios z interceptorami
│   │   └── store/AuthContext.jsx # Globalny stan autoryzacji
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 👥 Role

| Rola | Uprawnienia |
|------|-------------|
| `admin` | Pełen dostęp, rejestracja Par, oznaczanie płatności, upload faktur |
| `coordinator` | Zarządzanie etapami, gośćmi, dokumentami, czat |
| `couple` | Podgląd dashboardu, wybór menu, lista gości, czat |

---

## 🚀 Uruchomienie lokalne (bez Dockera)

### Wymagania
- Node.js 18+
- PostgreSQL 14+

### 1. Sklonuj i skonfiguruj

```bash
# Skopiuj .env.example
cp .env.example backend/.env

# Uzupełnij DATABASE_URL i JWT_SECRET w backend/.env
```

### 2. Backend

```bash
cd backend
npm install

# Generuj klienta Prisma
npx prisma generate

# Uruchom migracje
npx prisma migrate dev --name init

# Wgraj przykładowe dane
node prisma/seed.js

# Uruchom serwer deweloperski
npm run dev
```

Serwer dostępny pod: `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikacja dostępna pod: `http://localhost:5173`

---

## 🐳 Uruchomienie z Dockerem

```bash
# Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Edytuj .env - zmień hasła!

# Uruchom wszystkie serwisy
docker-compose up -d --build

# Uruchom migracje (pierwsza instalacja)
docker-compose exec backend npx prisma migrate deploy

# Wgraj przykładowe dane (opcjonalnie)
docker-compose exec backend node prisma/seed.js
```

Aplikacja dostępna pod: `http://localhost`

---

## 🗄 Migracje bazy danych

```bash
# Deweloperskie (tworzy i stosuje migrację)
cd backend
npx prisma migrate dev --name nazwa_migracji

# Produkcyjne (tylko stosuje istniejące)
npx prisma migrate deploy

# Podgląd bazy (GUI)
npx prisma studio
```

---

## 🌱 Seed - przykładowe dane

Po uruchomieniu seeda dostępne konta:

| Rola | Email | Hasło |
|------|-------|-------|
| Admin | admin@perlapienin.pl | Admin1234! |
| Koordynator | koordynator@perlapienin.pl | Coord1234! |
| Para Młoda | para@example.com | Para1234! |

---

## 📡 API Endpoints

| Metoda | Endpoint | Opis | Rola |
|--------|----------|------|------|
| POST | `/api/auth/login` | Logowanie | Wszyscy |
| POST | `/api/auth/register-couple` | Rejestracja pary | admin |
| GET | `/api/weddings/my` | Moje wesele + dashboard | Wszyscy |
| GET | `/api/stages/wedding/:id` | Harmonogram | Wszyscy |
| POST | `/api/stages/wedding/:id` | Dodaj etap | admin, coordinator |
| GET | `/api/guests/wedding/:id` | Lista gości | Wszyscy |
| POST | `/api/guests/wedding/:id/import-csv` | Import CSV | admin, coordinator |
| GET | `/api/tables/wedding/:id` | Plan stołów | Wszyscy |
| GET | `/api/menu/categories` | Kategorie menu | Wszyscy |
| POST | `/api/menu/wedding/:id/select` | Wybór pozycji menu | Wszyscy |
| GET | `/api/payments/wedding/:id` | Płatności | Wszyscy |
| PATCH | `/api/payments/:id/mark-paid` | Oznacz jako zapłacone | admin |
| GET | `/api/documents/wedding/:id` | Dokumenty | Wszyscy |
| POST | `/api/documents/wedding/:id/upload` | Upload dokumentu | admin, coordinator |
| GET | `/api/messages/wedding/:id` | Historia czatu | Wszyscy |
| POST | `/api/messages/wedding/:id` | Wyślij wiadomość | Wszyscy |

---

## 🔐 Bezpieczeństwo

- Hasła szyfrowane przez **bcrypt** (koszt 12)
- Autoryzacja przez **JWT** (Bearer token)
- Middleware `authenticate` – sprawdza token
- Middleware `authorize(...roles)` – sprawdza rolę
- Walidacja danych wejściowych przez **express-validator**
- Globalny handler błędów z kodami Prisma
- Upload plików z ograniczeniami rozszerzeń i rozmiaru
- Dostęp do plików tylko dla zalogowanych użytkowników

---

## 📋 Format CSV dla importu gości

```csv
firstName,lastName,isChild,diet,email,phone
Anna,Kowalska,false,wegetariańska,anna@example.com,+48123456789
Tomek,Wiśniewski,true,,,,
```

Obsługiwane nagłówki: `firstname/imię`, `lastname/nazwisko`, `ischild/dziecko`, `diet/dieta`, `email`, `phone/telefon`
