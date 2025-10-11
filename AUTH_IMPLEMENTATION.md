# Implementazione Sistema di Autenticazione

## 📋 Panoramica

Implementato un sistema completo di autenticazione con:
- Pagina Auth unificata per Login e Registrazione
- Protezione delle rotte con ProtectedRoute
- Gestione token JWT
- Logout con conferma

## 🎨 Design

La pagina di autenticazione segue l'estetica glass morphism del resto dell'app con:
- Background gradient subtile
- GlassCard per il form
- Toggle elegante tra Login e Registrazione
- Icone Lucide per input
- Animazioni smooth

## 📁 File Creati/Modificati

### 1. **frontend/src/pages/Auth.tsx** ✨ NUOVO
Pagina unificata di autenticazione con:
- **Modalità Login** (default)
  - Email
  - Password
  
- **Modalità Registrazione**
  - Nome (opzionale)
  - Email
  - Password (min 6 caratteri)
  - Valuta predefinita (default: EUR)

**Features:**
- Toggle tra modalità Login/Register
- Validazione form
- Gestione errori con toast
- Salvataggio automatico token e dati utente
- Redirect automatico alla home dopo login/registrazione
- Loading state durante l'autenticazione

### 2. **frontend/src/components/ProtectedRoute.tsx** ✨ NUOVO
Componente HOC per proteggere le rotte:
- Controlla la presenza del token in localStorage
- Redirect automatico a `/auth` se non autenticato
- Wrappa i componenti protetti

### 3. **frontend/src/App.tsx** 🔧 MODIFICATO
Aggiornato con:
- Import di Auth e ProtectedRoute
- Rotta pubblica `/auth` 
- Tutte le rotte principali protette con ProtectedRoute
- Redirect automatico alla home se già autenticato e si visita `/auth`
- BottomNav visibile solo se autenticato

### 4. **frontend/src/pages/Settings.tsx** 🔧 MODIFICATO
Aggiunto:
- Caricamento dati utente reali con `api.auth.me()`
- Pulsante Logout con icona
- AlertDialog di conferma logout
- Gestione logout (rimozione token e redirect)

## 🔐 Flusso di Autenticazione

### Login
1. Utente inserisce email e password
2. Click su "Accedi"
3. Chiamata a `api.auth.login()`
4. Salvataggio token e dati utente in localStorage
5. Toast di successo
6. Redirect alla home

### Registrazione
1. Utente inserisce dati (nome, email, password, valuta)
2. Click su "Crea Account"
3. Chiamata a `api.auth.register()`
4. Salvataggio token e dati utente in localStorage
5. Toast di successo
6. Redirect alla home

### Logout
1. Utente clicca su "Esci" in Settings
2. AlertDialog di conferma
3. Click su "Esci"
4. Rimozione token e dati utente da localStorage
5. Toast di conferma
6. Redirect alla pagina di login

### Protezione Rotte
- Ogni rotta protetta verifica la presenza del token
- Se il token non c'è → redirect a `/auth`
- Se autenticato e si prova ad accedere a `/auth` → redirect a `/`

## 🎯 Rotte

### Rotta Pubblica
- `/auth` - Pagina di login/registrazione

### Rotte Protette
- `/` - Home
- `/add` - Aggiungi Transazione
- `/transactions` - Lista Transazioni
- `/transaction/:id` - Dettaglio Transazione
- `/settings` - Impostazioni
- `/settings/accounts` - Gestione Conti
- `/settings/categories` - Gestione Categorie
- `/settings/transfers` - Gestione Trasferimenti
- `/settings/profile` - Profilo Utente

## 💾 Storage

### localStorage
```javascript
{
  "authToken": "JWT_TOKEN_HERE",
  "user": "{\"id\":\"...\",\"email\":\"...\",\"name\":\"...\"}"
}
```

## 🎨 Componenti UI Utilizzati

- **GlassCard** - Card con effetto glass morphism
- **Button** - Pulsanti con varianti
- **Input** - Input fields con styling
- **Label** - Labels per form
- **AlertDialog** - Dialog di conferma
- **Toast (Sonner)** - Notifiche

## 🔍 Validazione

### Login
- Email: obbligatoria, formato email
- Password: obbligatoria

### Registrazione
- Nome: opzionale
- Email: obbligatoria, formato email
- Password: obbligatoria, min 6 caratteri
- Valuta: default EUR, max 3 caratteri

## 📱 Responsive

Il design è ottimizzato per:
- Mobile (design principale)
- Tablet
- Desktop (max-width: 28rem)

## 🚀 Testing Consigliato

### Test Login
1. ✅ Login con credenziali corrette
2. ✅ Login con credenziali errate
3. ✅ Validazione campi vuoti
4. ✅ Toast di successo/errore
5. ✅ Redirect dopo login

### Test Registrazione
1. ✅ Registrazione con dati validi
2. ✅ Registrazione con email già esistente
3. ✅ Validazione password corta (<6 caratteri)
4. ✅ Campo nome opzionale
5. ✅ Toast di successo/errore
6. ✅ Redirect dopo registrazione

### Test Protezione Rotte
1. ✅ Accesso a rotta protetta senza token → redirect a /auth
2. ✅ Accesso a /auth con token → redirect a /
3. ✅ Logout → rimozione token e redirect

### Test Logout
1. ✅ Click su "Esci" apre dialog di conferma
2. ✅ Conferma logout → redirect a /auth
3. ✅ Annulla logout → rimane in Settings

## 🎨 Screenshot Componenti

### Pagina Auth - Login (Default)
```
┌────────────────────────────────┐
│           💰 Icon              │
│     Tracking Spese             │
│  Gestisci le tue finanze...    │
│                                │
│  ┌──────────┬──────────┐      │
│  │  Login   │ Registrati│      │
│  └──────────┴──────────┘      │
│                                │
│  📧 Email                      │
│  [email@esempio.com    ]      │
│                                │
│  🔒 Password                   │
│  [••••••••             ]      │
│                                │
│  ┌────────────────────┐       │
│  │      Accedi        │       │
│  └────────────────────┘       │
│                                │
│  Non hai un account?           │
│  Registrati qui                │
└────────────────────────────────┘
```

### Pagina Settings con Logout
```
┌────────────────────────────────┐
│  ← Impostazioni                │
│                                │
│  Gestione                      │
│  ┌──────────────────────────┐ │
│  │ 💳 Conti              >  │ │
│  │ 🏷️  Categorie          >  │ │
│  │ 🔄 Trasferimenti      >  │ │
│  └──────────────────────────┘ │
│                                │
│  Account                       │
│  ┌──────────────────────────┐ │
│  │ 👤 Profilo            >  │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │  U  Utente          >    │ │
│  │     user@email.com       │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │   🚪 Esci                │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

## ✅ Checklist Implementazione

- [x] Pagina Auth con Login e Registrazione
- [x] Toggle tra modalità
- [x] Validazione form
- [x] Integrazione con API backend
- [x] Salvataggio token in localStorage
- [x] ProtectedRoute component
- [x] Protezione di tutte le rotte principali
- [x] Pulsante Logout in Settings
- [x] Dialog di conferma logout
- [x] Toast notifications
- [x] Gestione errori
- [x] Loading states
- [x] Design responsive
- [x] Estetica glass morphism

## 🎯 Prossimi Passi

1. Testare il flusso completo di autenticazione
2. Verificare la gestione dei token scaduti
3. Eventualmente aggiungere "Remember me"
4. Eventualmente aggiungere "Forgot password"

