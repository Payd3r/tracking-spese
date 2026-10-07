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
      lookbackDays: 0,
      sendPush: true,
      createNew: true,
      // Associa se oggi hai già inserito a mano la stessa cifra, altrimenti crea
      linkExisting: true,
    });
    console.log('🏦 Banking sync completato:', {
      sessions: summary.sessions,
      accounts: summary.accounts,
      fetched: summary.fetched,
      created: summary.created,
      linked: summary.linked,
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

  // 08:00, 12:00, 16:00, 20:00 Europe/Rome — max 4 background fetches/day (PSD2)
  job = new Cron('0 8,12,16,20 * * *', {
    timezone: 'Europe/Rome',
    protect: true,
  }, async () => {
    try {
      await runScheduledBankingSync('cron');
    } catch (error) {
      console.error('Scheduled banking sync error:', error.message);
    }
  });

  console.log('⏰ Banking scheduler attivo: 08/12/16/20 Europe/Rome');
  return job;
}

export function stopBankingScheduler() {
  if (job) {
    job.stop();
    job = null;
  }
}
