import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  listSubscriptions,
} from '../services/pushService.js';

export async function getVapidKey(req, res) {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Push non configurate' });
  }
  res.json({ publicKey });
}

export async function subscribePush(req, res, next) {
  try {
    const subscription = req.body?.subscription || req.body;
    const saved = await saveSubscription(
      req.user.id,
      subscription,
      req.get('user-agent') || null
    );
    res.json({ message: 'Iscrizione push salvata', subscription: saved });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribePush(req, res, next) {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint obbligatorio' });
    }
    await removeSubscription(req.user.id, endpoint);
    res.json({ message: 'Iscrizione push rimossa' });
  } catch (error) {
    next(error);
  }
}

export async function getPushStatus(req, res, next) {
  try {
    const subscriptions = await listSubscriptions(req.user.id);
    res.json({
      enabled: Boolean(getVapidPublicKey()),
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    next(error);
  }
}
