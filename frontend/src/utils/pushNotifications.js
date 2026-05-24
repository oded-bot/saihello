import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Beim Login aufrufen — registriert nur den SW, fragt keine Permission
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('SW-Registrierung fehlgeschlagen:', err);
  }
}

// Nur nach User-Gesture aufrufen (Button-Klick) — fragt Permission + sendet Subscription
export async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const { data } = await api.get('/notifications/vapid-public-key');
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await api.post('/notifications/push-subscription', subscription.toJSON());
    return true;
  } catch (err) {
    console.warn('Push-Subscription fehlgeschlagen:', err);
    return false;
  }
}

// Gibt zurück ob Push bereits aktiv ist
export async function isPushActive() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function removePushSubscription() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete('/notifications/push-subscription', { data: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.warn('Push-Unsubscribe fehlgeschlagen:', err);
  }
}
