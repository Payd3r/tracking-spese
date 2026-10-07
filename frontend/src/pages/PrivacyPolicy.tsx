import { GlassCard } from "@/components/GlassCard";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Server, 
  Lock, 
  EyeOff, 
  Landmark, 
  CheckCircle2, 
  ArrowLeft, 
  Database,
  FileText,
  UserCheck,
  Scale,
  KeyRound,
  Cpu,
  Fingerprint
} from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "20 Settembre 2026";

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 md:py-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Torna all'App</span>
          </Link>
          
          <span className="text-xs text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono">
            Aggiornato: {lastUpdated}
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-white shadow-2xl mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Informativa Privacy & Sicurezza
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Informativa sul trattamento dei dati personali, architettura di sicurezza e integrazione Open Banking tramite API Enable Banking per l'applicazione <span className="text-white font-semibold">Tracking Spese</span>.
          </p>
        </div>

        {/* Quick Summary Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <GlassCard className="p-4 border border-white/10 bg-white/[0.03] flex flex-col items-center text-center space-y-2">
            <UserCheck className="w-6 h-6 text-white" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Uso Personale</h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Software ad uso strettamente privato per la gestione autonoma delle proprie finanze.
            </p>
          </GlassCard>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03] flex flex-col items-center text-center space-y-2">
            <Server className="w-6 h-6 text-white" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Self-Hosted</h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Ospitata interamente su infrastruttura locale privata. Nessun cloud esterno di terze parti.
            </p>
          </GlassCard>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03] flex flex-col items-center text-center space-y-2">
            <Landmark className="w-6 h-6 text-white" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sola Lettura (AISP)</h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Accesso bancario limitato a saldi e movimenti. Nessuna disposizione o operatività sui conti.
            </p>
          </GlassCard>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03] flex flex-col items-center text-center space-y-2">
            <Lock className="w-6 h-6 text-white" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Crittografia Totale</h4>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Autenticazione biometrica Passkey (FIDO2), canali HTTPS/TLS e database PostgreSQL isolato.
            </p>
          </GlassCard>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">

          {/* Section 1 */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                1. Finalità e Ambito Personale
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-white">Tracking Spese</strong> è un'applicazione software sviluppata e mantenuta per <strong>uso esclusivamente personale, privato e domestico</strong> da parte del titolare dell'infrastruttura, con l'unico fine di monitorare il proprio budget e aggregare le proprie spese personali.
              </p>
              <p>
                L'applicazione:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1 text-zinc-300">
                <li>Non è un servizio commerciale aperto al pubblico o a utenti terzi.</li>
                <li>Non monetizza né vende in alcuna forma i dati degli utenti.</li>
                <li>Non effettua profilazione commerciale, tracciamento pubblicitario o telemetria di alcun genere.</li>
              </ul>
            </div>
          </GlassCard>

          {/* Section 2 */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                2. Integrazione Open Banking tramite API Enable Banking
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Per consentire l'aggiornamento automatico e accurato delle proprie transazioni finanziarie, l'applicazione integra i servizi di <strong>Enable Banking Oy</strong> (fornitore autorizzato di servizi di informazione sui conti - AISP ai sensi della direttiva europea PSD2 / Open Banking).
              </p>
              
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 mt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Principi dell'integrazione bancaria:
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-300">
                  <li><strong>Accesso Esclusivo in Sola Lettura (Read-Only AISP)</strong>: L'applicazione richiede ed esercita esclusivamente permessi di consultazione dei saldi contabili e della cronologia dei movimenti dei conti bancari appartenenti al proprietario.</li>
                  <li><strong>Nessun Servizio Dispositivo (Assenza di PISP)</strong>: L'applicazione non include né richiede alcuna capacità di disporre ordini di pagamento, trasferimenti di denaro o qualsiasi altra operazione bancaria dispositiva.</li>
                  <li><strong>Autenticazione Bancaria Diretta (SCA)</strong>: Il collegamento con il proprio istituto bancario viene autorizzato tramite il protocollo ufficiale di autenticazione forte (Strong Customer Authentication) della banca stessa. Nessuna credenziale bancaria (PIN, password o codici OTP) transita né viene memorizzata nell'applicazione.</li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Section 3 - Expanded Security Architecture */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                3. Misure e Architettura di Sicurezza
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-4 leading-relaxed">
              <p>
                La sicurezza delle informazioni e dell'infrastruttura è garantita dall'adozione di rigorosi standard crittografici e architetturali:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Fingerprint className="w-4 h-4 text-white" />
                    Autenticazione Passkey / WebAuthn (FIDO2)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    L'accesso all'interfaccia è protetto da chiavi crittografiche asimmetriche basate su hardware/biometria. Nel database non risiedono password tradizionali in chiaro né hash vulnerabili.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Database className="w-4 h-4 text-white" />
                    Database PostgreSQL Locale Isolato
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Il database risiede su un volume locale isolato all'interno di una rete Docker privata. Nessuna porta database è esposta pubblicamente su Internet.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <KeyRound className="w-4 h-4 text-white" />
                    Protezione Certificati e Chiavi API
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    I certificati privati RSA e le chiavi applicative per le API di Enable Banking sono memorizzati esclusivamente sul filesystem locale del server e protetti da permessi di accesso ristretti.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Server className="w-4 h-4 text-white" />
                    Canale Cifrato HTTPS e Reverse Proxy Nginx
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Il traffico è protetto da crittografia TLS con certificati validi. L'applicazione applica header di sicurezza stringenti (HSTS, CSP, X-Frame-Options, no-sniff).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Cpu className="w-4 h-4 text-white" />
                    Token JWT Firmati ad Alta Entropia
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Le sessioni applicative sono convalidate tramite token JWT firmati crittograficamente con chiave segreta ad alta complessità e scadenza temporale predefinita.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <EyeOff className="w-4 h-4 text-white" />
                    Zero Servizi e Script di Terzi
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    L'applicazione non carica script esterni, tracker analitici, librerie CDN remote o pixel pubblicitari. Il codice è completamente self-contained.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Section 4 */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                4. Dati Oggetto del Trattamento
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-3 leading-relaxed">
              <p>
                I dati trattati attraverso l'integrazione e registrati nell'archivio locale si limitano a:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-1 text-zinc-300">
                <li><strong className="text-white">Identificativi dei conti</strong>: Nome del conto, istituto bancario, valuta e IBAN identificativo.</li>
                <li><strong className="text-white">Saldi contabili</strong>: Saldo disponibile e contabile rilevato al momento della sincronizzazione.</li>
                <li><strong className="text-white">Transazioni e movimenti</strong>: Data contabile/valuta, importo, categoria assegnata, causale o descrizione fornita dall'istituto bancario.</li>
                <li><strong className="text-white">Credenziali di accesso locale</strong>: Credenziali crittografiche WebAuthn per il proprietario dell'istanza.</li>
              </ul>
            </div>
          </GlassCard>

          {/* Section 5 */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                5. Consenso, Revoca e Diritti GDPR
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-3 leading-relaxed">
              <p>
                In conformità con il Regolamento Generale sulla Protezione dei Dati (<strong>GDPR - Regolamento UE 2016/679</strong>) e la direttiva PSD2:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-1 text-zinc-300">
                <li><strong className="text-white">Revoca Istantanea del Consenso</strong>: Il consenso alla consultazione dei dati bancari può essere revocato in qualsiasi istante direttamente dall'interfaccia dell'applicazione o dal portale di gestione consensi Open Banking della propria banca.</li>
                <li><strong className="text-white">Controllo Totale e Cancellazione</strong>: L'utente ha il controllo completo e diretto sul database: ogni transazione, conto o dato può essere cancellato immediatamente senza intermediari.</li>
                <li><strong className="text-white">Portabilità dei Dati</strong>: Tutti i dati risiedono nel database PostgreSQL locale e sono liberamente esportabili nei formati aperti (JSON, CSV, SQL).</li>
              </ul>
            </div>
          </GlassCard>

          {/* Section 6 */}
          <GlassCard className="p-6 md:p-8 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                6. Titolare del Trattamento
              </h2>
            </div>
            <div className="text-xs md:text-sm text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Il titolare del trattamento dei dati per questa istanza personale dell'applicazione <strong className="text-white">Tracking Spese</strong> è l'amministratore dell'infrastruttura server locale.
              </p>
              <p className="text-xs text-zinc-400">
                Per chiarimenti tecnici o informazioni relative alla privacy e alla sicurezza dell'applicazione, fare riferimento alle impostazioni interne dell'istanza.
              </p>
            </div>
          </GlassCard>

        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-8 border-t border-white/10 text-xs text-zinc-500 space-y-1.5">
          <p>© {new Date().getFullYear()} Tracking Spese. Tutti i diritti riservati.</p>
          <p className="text-[11px]">Applicazione privata e self-hosted conforme agli standard Open Banking / PSD2.</p>
        </div>

      </div>
    </div>
  );
}
