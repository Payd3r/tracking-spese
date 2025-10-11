# 💰 Tracking Spese

Applicazione PWA per gestire spese e entrate con supporto multi-valuta, modalità offline e analytics.

## ⚡ Quick Start

```bash
# 1. Installa
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Configura
cp .env.example .env

# 3. Avvia DB
docker-compose -f docker-compose.dev.yml up -d

# 4. Setup DB
cd backend && npm run migrate && npm run seed

# 5. Avvia (2 terminali)
cd backend && npm run dev  # Terminale 1
cd frontend && npm run dev # Terminale 2
```

**Accesso:** Frontend: http://localhost:8080 | API: http://localhost:3001 | pgAdmin: http://localhost:8093

**Login test:** `test@example.com` / `password123`

## 📁 Struttura

```
tracking-spese/
├── backend/                # Node.js API
├── frontend/               # React PWA
├── nginx/                  # Reverse proxy
├── .env                    # Config unificata
└── docker-compose.yml      # Deploy produzione
```

Vedi [STRUCTURE.md](STRUCTURE.md) per dettagli | [SETUP.md](SETUP.md) per setup completo

## 🐳 Deploy Produzione

```bash
docker network create web-proxy
docker-compose up -d --build
docker exec -it tracking-spese-backend npm run migrate
```

## 🔧 Comandi

```bash
npm run migrate              # Migrations DB
npm run seed                 # Seed categorie
docker-compose logs -f       # Logs
```

## 📄 License

MIT
