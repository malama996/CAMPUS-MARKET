import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export async function requestNotificationPermission(userId, supabase) {
  const supported = await isSupported();
  if (!supported) {
    console.warn('Push messaging not supported on this browser');
    return null;
  }

  const messaging = getMessaging(app);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  // Register (or reuse) the Firebase-specific service worker directly.
  // navigator.serviceWorker.ready can resolve to an unrelated worker
  // (e.g. the app's general offline-caching sw.js), which Firebase's
  // getToken() can't communicate with — so we register this one explicitly.
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, fcm_token: token }, { onConflict: 'user_id' });
  }

  return token;
}

export function listenForForegroundMessages(callback) {
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}