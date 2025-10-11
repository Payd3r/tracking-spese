# 💰 Tracking Spese - Expense Tracker PWA

Applicazione Progressive Web App per gestire le tue spese e entrate con supporto multi-valuta, sincronizzazione offline e dashboard analytics.

## ✨ Features

- 🔐 **Autenticazione JWT** con sessioni di 30 giorni
- 💳 **Multi-account** con gestione conti separati
- 💱 **Multi-valuta** con conversione automatica in tempo reale (Frankfurter API)
- 📊 **Dashboard Analytics** con statistiche e grafici
- 📴 **Modalità Offline** con sincronizzazione automatica
- 🔄 **PWA** installabile su dispositivi mobile e desktop
- 🎨 **UI Moderna** con Glassmorphism e animazioni fluide
- 🚀 **Performance** ottimizzata con caching intelligente

## 🏗️ Architettura

### Backend
- **Node.js** + **Express**
- **PostgreSQL** database
- **JWT** authentication
- **Frankfurter API** per tassi di cambio

### Frontend
- **React** + **TypeScript**
- **Vite** build tool
- **Tailwind CSS** + **shadcn/ui**
- **Dexie.js** per IndexedDB (storage offline)
- **Workbox** service worker

### Deployment
- **Docker** containers
- **Nginx** reverse proxy
- **Portainer** ready

## 🚀 Quick Start - Sviluppo Locale

### Prerequisiti
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (opzionale, incluso in docker-compose)

### 1. Clone del repository

```bash
git clone <your-repo-url>
cd tracking-spese
```

### 2. Setup Database (Development)

Avvia PostgreSQL e pgAdmin con Docker:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: http://localhost:8093

### 3. Setup Backend

```bash
cd backend

# Installa dipendenze
npm install

# Copia file .env
cp .env.example .env

# Modifica .env con le tue configurazioni
# DATABASE_URL=postgresql://tracking_user:tracking_password@localhost:5432/tracking_spese
# JWT_SECRET=your-secret-key

# Applica migrations
npm run migrate

# Seed categorie default
npm run seed

# Avvia backend
npm run dev
```

Backend disponibile su: http://localhost:3000

### 4. Setup Frontend

```bash
# Dalla root del progetto

# Installa dipendenze
npm install

# Avvia dev server
npm run dev
```

Frontend disponibile su: http://localhost:8080

## 🐳 Deploy Produzione con Docker

### 1. Preparazione

Crea il file `.env` nella root del progetto:

```bash
cp .env.example .env
```

Modifica `.env` con le tue configurazioni:

```env
# Database
POSTGRES_DB=tracking_spese
POSTGRES_USER=tracking_user
POSTGRES_PASSWORD=your-strong-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=30d

# pgAdmin
PGADMIN_EMAIL=admin@yourdomain.com
PGADMIN_PASSWORD=your-pgadmin-password

# App
FRONTEND_URL=https://yourdomain.com
APP_PORT=80
VITE_API_URL=https://yourdomain.com/api
```

### 2. Crea la rete esterna web-proxy

```bash
docker network create web-proxy
```

### 3. Build e avvio

```bash
# Build e avvia tutti i servizi
docker-compose up -d --build

# Visualizza logs
docker-compose logs -f

# Verifica status
docker-compose ps
```

### 4. Applica migrations

```bash
# Entra nel container backend
docker exec -it tracking-spese-backend sh

# Applica migrations
npm run migrate

# Seed categorie
npm run seed

# Esci
exit
```

### 5. Configurazione Nginx Proxy Manager

Nel tuo Nginx Proxy Manager:

1. Crea un **Proxy Host**
2. **Domain Names**: `spese.yourdomain.com`
3. **Scheme**: `http`
4. **Forward Hostname/IP**: `tracking-spese-nginx`
5. **Forward Port**: `80`
6. **SSL**: Abilita e configura Let's Encrypt

### 6. Accesso ai servizi

- **Frontend**: https://spese.yourdomain.com
- **API**: https://spese.yourdomain.com/api
- **pgAdmin**: http://your-server-ip:8093 (solo locale)

## 📁 Struttura Progetto

```
tracking-spese/
├── backend/
│   ├── src/
│   │   ├── config/          # Database config
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Auth & error handling
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── migrations/          # DB migrations
│   ├── Dockerfile
│   └── package.json
├── src/
│   ├── components/          # React components
│   ├── contexts/            # React contexts (Sync)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # API, DB, Sync logic
│   ├── pages/               # Page components
│   └── main.tsx
├── nginx/
│   ├── nginx.conf           # Main reverse proxy config
│   ├── frontend.conf        # Frontend nginx config
│   └── Dockerfile
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Development
└── README.md
```

## 🔧 Comandi Utili

### Development

```bash
# Backend
cd backend
npm run dev          # Dev server con watch
npm run migrate      # Applica migrations
npm run migrate:down # Rollback migration
npm run seed         # Seed categorie

# Frontend
npm run dev          # Dev server
npm run build        # Build produzione
npm run preview      # Preview build
```

### Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d     # Avvia DB + pgAdmin
docker-compose -f docker-compose.dev.yml down      # Stop

# Production
docker-compose up -d --build                       # Build e avvia
docker-compose down                                # Stop
docker-compose logs -f [service]                   # Logs
docker-compose ps                                  # Status
docker-compose restart [service]                   # Restart service
```

### Database

```bash
# Backup
docker exec tracking-spese-db pg_dump -U tracking_user tracking_spese > backup.sql

# Restore
cat backup.sql | docker exec -i tracking-spese-db psql -U tracking_user tracking_spese
```

## 🔐 API Endpoints

### Auth
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Info utente corrente

### Accounts
- `GET /api/accounts` - Lista conti
- `POST /api/accounts` - Crea conto
- `PUT /api/accounts/:id` - Modifica conto
- `DELETE /api/accounts/:id` - Elimina conto

### Categories
- `GET /api/categories?type=income|expense` - Lista categorie
- `POST /api/categories` - Crea categoria
- `DELETE /api/categories/:id` - Elimina categoria

### Transactions
- `GET /api/transactions` - Lista transazioni (con filtri)
- `POST /api/transactions` - Crea transazione
- `GET /api/transactions/:id` - Dettaglio transazione
- `PUT /api/transactions/:id` - Modifica transazione
- `DELETE /api/transactions/:id` - Elimina transazione

### Transfers
- `GET /api/transfers` - Lista trasferimenti
- `POST /api/transfers` - Crea trasferimento
- `DELETE /api/transfers/:id` - Elimina trasferimento

### Stats
- `GET /api/stats/dashboard?period=day|week|month|year` - Dashboard stats

### Currencies
- `GET /api/currencies` - Lista valute supportate
- `GET /api/currencies/convert?amount=100&from=USD&to=EUR` - Conversione

## 🌐 PWA - Modalità Offline

L'applicazione funziona offline grazie a:
- **Service Worker** per caching di assets e API
- **IndexedDB** per storage locale delle transazioni pending
- **Auto-sync** quando torni online o riapri l'app
- **Indicatori UI** per status online/offline

### Comportamento Offline

1. **Crea transazione offline** → Salvata in IndexedDB
2. **Torna online** → Auto-sync automatica
3. **Retry con backoff** per operazioni fallite
4. **Badge** mostra operazioni pending

## 🔒 Sicurezza

- ✅ JWT con scadenza configurabile
- ✅ Password hashate con bcrypt
- ✅ Validazione input su backend
- ✅ SQL injection protected (prepared statements)
- ✅ CORS configurato
- ✅ Security headers in nginx
- ⚠️ pgAdmin esposto solo su porta locale (non tramite nginx)

## 📱 Installazione PWA

### iOS (Safari)
1. Apri il sito
2. Tap su "Share" (icona condivisione)
3. Scroll e tap "Add to Home Screen"

### Android (Chrome)
1. Apri il sito
2. Tap menu (⋮)
3. Tap "Install app" o "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Apri il sito
2. Clicca sull'icona di installazione nella barra indirizzi
3. Clicca "Install"

## 🐛 Troubleshooting

### Backend non si connette al DB
```bash
# Verifica che il DB sia up
docker-compose ps db

# Verifica logs
docker-compose logs db

# Ricrea il container
docker-compose up -d --force-recreate db
```

### Frontend non raggiunge API
- Verifica `VITE_API_URL` in `.env`
- Controlla nginx logs: `docker-compose logs nginx`
- Verifica network: `docker network inspect tracking-spese_frontend`

### Sync non funziona
- Verifica di essere autenticato
- Controlla console browser per errori
- Verifica IndexedDB in DevTools → Application → Storage

## 📄 License

MIT

## 👨‍💻 Author

Sviluppato con ❤️ per gestire le spese in modo smart!
