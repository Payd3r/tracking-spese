# Icone Lucide - Guida

Questo progetto utilizza **Lucide React** per le icone. Le icone vengono salvate nel database nel formato `lucide:NomeIcona`.

## Formato

```
lucide:NomeIcona
```

## Icone Consigliate

### Conti / Accounts
- `lucide:Wallet` - Portafoglio generico
- `lucide:CreditCard` - Carta di credito
- `lucide:Banknote` - Contanti
- `lucide:Landmark` - Banca
- `lucide:Coins` - Monete
- `lucide:PiggyBank` - Risparmio

### Categorie di Spesa
- `lucide:Utensils` - Ristoranti/Cibo
- `lucide:ShoppingCart` - Spesa/Supermercato
- `lucide:ShoppingBag` - Shopping
- `lucide:Car` - Auto/Trasporti
- `lucide:Taxi` - Taxi
- `lucide:Bus` - Autobus
- `lucide:Train` - Treno
- `lucide:Plane` - Aereo
- `lucide:Home` - Casa
- `lucide:Zap` - Bollette/Utenze
- `lucide:Wifi` - Internet
- `lucide:Smartphone` - Telefono
- `lucide:Tv` - TV/Abbonamenti
- `lucide:Gamepad2` - Videogiochi
- `lucide:Music` - Musica
- `lucide:Film` - Cinema
- `lucide:Heart` - Salute
- `lucide:Pill` - Farmacia
- `lucide:Dumbbell` - Palestra
- `lucide:GraduationCap` - Istruzione
- `lucide:Book` - Libri
- `lucide:Coffee` - Caffè/Bar
- `lucide:Beer` - Alcolici
- `lucide:Gift` - Regali
- `lucide:Shirt` - Abbigliamento
- `lucide:Scissors` - Parrucchiere
- `lucide:Wrench` - Manutenzione
- `lucide:Fuel` - Carburante

### Categorie di Entrata
- `lucide:Wallet` - Stipendio
- `lucide:Briefcase` - Lavoro/Freelance
- `lucide:TrendingUp` - Investimenti
- `lucide:Gift` - Regalo ricevuto
- `lucide:Award` - Bonus
- `lucide:DollarSign` - Entrata generica

### Altre Icone Utili
- `lucide:Tag` - Tag generico
- `lucide:Star` - Preferito
- `lucide:Calendar` - Data
- `lucide:Clock` - Tempo
- `lucide:MapPin` - Luogo

## Come Usare

### Nel Database
Quando crei una categoria o un account, salva l'icona nel formato:
```
lucide:Wallet
```

### Nel Codice
Il componente `IconRenderer` gestisce automaticamente la conversione:

```tsx
<IconRenderer icon="lucide:Wallet" size={24} />
```

## Trovare Altre Icone

Visita [lucide.dev](https://lucide.dev/icons/) per vedere tutte le icone disponibili.

Il nome da usare è quello mostrato sul sito (case-sensitive), preceduto da `lucide:`.

Esempio: se l'icona si chiama `ShoppingCart` sul sito, usa `lucide:ShoppingCart`.

