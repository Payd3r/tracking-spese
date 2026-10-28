import { Cron } from 'croner';
import { syncBankingTransactions } from './syncService.js';

let job = null;
let running = false;

export async function runScheduledBankingSync(reason = 'cron') {
  if (running) {
    console.log(`⏳ Banking sync già in corso, skip (${reason})`);
    return { skipped: true, reason: 'already_running' };
  }

  running = true;
  console.log(`🏦 Banking sync avviato (${reason})`);
  try {
    const summary = await syncBankingTransactions({
      lookbackDays: 30,
      sendPush: true,
      createNew: true,
      // Recupera anche contabilizzazioni tardive e associa movimenti manuali.
      linkExisting: true,
    });
    console.log('🏦 Banking sync completato:', {
      sessions: summary.sessions,
      accounts: summary.accounts,
      fetched: summary.fetched,
      created: summary.created,
      linked: summary.linked,
      deduplicated: summary.deduplicated?.length || 0,
      crossAccountReview: summary.crossAccountReview?.length || 0,
      skipped: summary.skipped,
      errors: summary.errors?.length || 0,
    });
    return summary;
  } catch (error) {
    console.error('🏦 Banking sync fallito:', error);
    throw error;
  } finally {
    running = false;
  }
}

export function startBankingScheduler() {
  if (job) return job;

  // Due controlli al giorno, con finestra sovrapposta di 30 giorni.
  job = new Cron('0 12,20 * * *', {
    timezone: 'Europe/Rome',
    protect: true,
  }, async () => {
    try {
      await runScheduledBankingSync('cron');
    } catch (error) {
      console.error('Scheduled banking sync error:', error.message);
    }
  });

  console.log('⏰ Banking scheduler attivo: 12/20 Europe/Rome');
  return job;
}

export function stopBankingScheduler() {
  if (job) {
    job.stop();
    job = null;
  }
}
