importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBvThu3kWX_NilwVocbcwni462BeYXTmYQ",
  authDomain: "message-notifications-c640f.firebaseapp.com",
  projectId: "message-notifications-c640f",
  storageBucket: "message-notifications-c640f.firebasestorage.app",
  messagingSenderId: "260474378557",
  appId: "1:260474378557:web:64415ae0ef439da28f4d54",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'New message', {
    body: body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: payload.data?.url || '/chat' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});