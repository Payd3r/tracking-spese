# 💰 Tracking Spese — Personal Finance & Expense Tracker PWA

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge&logo=git" alt="Status" />
  <img src="https://img.shields.io/badge/Frontend-React_+_Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Backend-Node.js_+_Express-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/DevOps-Docker_Compose-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
</p>

---

## 📖 Panoramica

**Tracking Spese** è una Progressive Web App (PWA) moderna e completa per la gestione autonoma e sicura delle finanze personali, spese quotidiane ed entrate periodiche.

Progettata per un utilizzo fluido sia da desktop che da smartphone (grazie a un'interfaccia mobile-first con bottom sheet nativi e gesture touch), l'applicazione permette di monitorare conti multipli, pianificare prestiti e piani di rimborso, categorizzare le uscite, consultare grafici statistici interattivi e sincronizzare transazioni bancarie tramite Open Banking.

---

## ✨ Funzionalità Principali

### 💳 Gestione Transazioni & Conti
- **Tracciamento Spese & Entrate:** Registrazione istantanea di transazioni con importo, data, tag, allegati e note.
- **Multi-Conto & Portafogli:** Gestione separata di conti bancari, carte di credito, contanti e conti risparmio con saldo aggiornato in tempo reale.
- **Filtri Avanzati:** Ricerca e segmentazione transazioni per intervallo date, categoria, tipo di pagamento e importo minimo/massimo.

### 📊 Statistiche & Analytics
- **Dashboard Finanziaria:** Panoramica visiva del patrimonio netto, entrate vs uscite e tasso di risparmio mensile.
- **Grafici Interattivi:** Distribuzione percentuale delle spese per categoria e trend temporale per identificare abitudini di spesa.

### 🤝 Prestiti & Piani di Rimborso
- **Modulo Prestiti (Loans):** Monitoraggio dei crediti e debiti verso terzi.
- **Piani di Rientro (Repayments):** Registrazione progressiva delle rate saldate con calcolo automatico del debito residuo.

### 🔔 Notifiche & Open Banking
- **Web Push Notifications (VAPID):** Notifiche push per promemoria scadenze, budget quasi esaurito e conferme di spesa.
- **Integrazione Open Banking:** Connessione sicura con provider bancari (Enable Banking) per la sincronizzazione delle movimentazioni.

### 📱 Esperienza PWA Mobile
- **Installabile su Schermata Home:** PWA certificata con supporto offline e caching statico.
- **Bottom Sheet Interattivi:** Modali a scorrimento dal basso per inserimento rapido su smartphone.

---

## 🛠️ Stack Tecnologico

| Layer | Tecnologie | Note |
| :--- | :--- | :--- |
| **Frontend** | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) | Client reattivo ad alte prestazioni |
| **Styling** | [TailwindCSS](https://tailwindcss.com/), Lucide Icons | Design moderno con supporto Dark/Light mode |
| **Backend API** | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/) | REST API con middleware di autenticazione JWT |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | RDBMS affidabile per la tenuta dei registri finanziari |
| **Notifiche** | Web Push API + standard VAPID | Sistema di notifica browser nativo senza servizi terzi |
| **DevOps** | [Docker Compose](https://docs.docker.com/compose/), [Nginx](https://nginx.org/) | Reverse proxy e orchestrazione multi-container |

---

## 📂 Struttura del Repository

```bash
tracking-spese/
├── backend/                  # REST API Express, modelli e controller
│   ├── src/
│   │   ├── config/           # Connessione PostgreSQL e configurazioni
│   │   ├── controllers/      # Logica di business (Auth, Conti, Spese, Statistiche)
│   │   ├── routes/           # Endpoint API REST
│   │   └── services/         # Servizi di banking e web push
│   └── package.json
├── frontend/                 # Client React Vite + TypeScript
│   ├── src/
│   │   ├── components/       # Componenti UI, Sidebar, BottomNav, BottomSheet
│   │   │   └── forms/        # Form transazioni, conti, categorie, prestiti
│   │   ├── contexts/         # Gestione stato globale (Auth, UI)
│   │   ├── pages/            # Dashboard, Transazioni, Statistiche, Conti, Auth
│   │   └── lib/              # Client HTTP e utilità di calcolo
│   └── package.json
├── nginx/                    # Reverse proxy configurato per produzione
├── docker-compose.yml        # Orchestrazione produzione
├── docker-compose.dev.yml    # Ambiente di sviluppo con db locale e pgAdmin
└── README.md
```

---

## 🚀 Guida all'Installazione

### Prerequisiti
- **Node.js** >= 18
- **Docker** & **Docker Compose**

### 1. Clonazione del Progetto
```bash
git clone git@github.com:Payd3r/tracking-spese.git
cd tracking-spese
```

### 2. Configurazione Variabili d'Ambiente
Copia il file di configurazione:
```bash
cp .env.example .env
```
Configura i parametri del database PostgreSQL e i segreti JWT.

### 3. Avvio in Sviluppo

#### Con Docker (Database e Servizi):
```bash
# Avvia PostgreSQL e pgAdmin
docker compose -f docker-compose.dev.yml up -d

# Installa ed esegui il backend
cd backend
npm install
npm run migrate
npm run seed
npm run dev

# In un secondo terminale, avvia il frontend
cd ../frontend
npm install
npm run dev
```

#### Accesso ai servizi in locale:
- **Frontend:** `http://localhost:5173` (o `http://localhost:8080`)
- **Backend API:** `http://localhost:3000` (o `http://localhost:3001`)
- **pgAdmin:** `http://localhost:8093`

---

## 🐳 Deploy di Produzione

```bash
# Assicurati che esista la rete proxy condivisa
docker network create web-proxy || true

# Costruzione e avvio
docker compose up -d --build

# Esegui le migrazioni
docker exec -it tracking-spese-backend npm run migrate
```

---

## 👤 Autore

**Andrea Mauri**
- GitHub: [@Payd3r](https://github.com/Payd3r)
