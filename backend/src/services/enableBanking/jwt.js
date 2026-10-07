import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedPrivateKey = null;

function resolveKeyPath() {
  const configured = process.env.ENABLE_BANKING_KEY_PATH;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  const appId = process.env.ENABLE_BANKING_APP_ID || 'e83dda61-4521-4f88-883d-bcc5792f6f4b';
  const candidates = [
    path.resolve(__dirname, `../../../../${appId}.pem`),
    path.resolve(process.cwd(), `${appId}.pem`),
    path.resolve(process.cwd(), `../${appId}.pem`),
    `/app/secrets/${appId}.pem`,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Enable Banking PEM non trovata. Imposta ENABLE_BANKING_KEY_PATH (cercato: ${candidates.join(', ')})`
  );
}

export function getEnableBankingPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;
  const keyPath = resolveKeyPath();
  cachedPrivateKey = fs.readFileSync(keyPath, 'utf8');
  return cachedPrivateKey;
}

export function createEnableBankingJwt(ttlSeconds = 3600) {
  const applicationId = process.env.ENABLE_BANKING_APP_ID;
  if (!applicationId) {
    throw new Error('ENABLE_BANKING_APP_ID non configurato');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + Math.min(ttlSeconds, 86400),
  };

  return jwt.sign(payload, getEnableBankingPrivateKey(), {
    algorithm: 'RS256',
    header: {
      typ: 'JWT',
      alg: 'RS256',
      kid: applicationId,
    },
  });
}
