importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCirm5cPSpeRjaibpd_GiwMPqlGuJpZ69E",
  authDomain: "homeworkplanner-e90a3.firebaseapp.com",
  databaseURL: "https://homeworkplanner-e90a3-default-rtdb.firebaseio.com",
  projectId: "homeworkplanner-e90a3",
  storageBucket: "homeworkplanner-e90a3.firebasestorage.app",
  messagingSenderId: "44265353555",
  appId: "1:44265353555:web:076f9c824ab6c27d8031a6"
});

const messaging = firebase.messaging();

// 앱이 백그라운드일 때 수신되는 알림 처리
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification || payload.data || {}).title || "알림";
  const body = (payload.notification || payload.data || {}).body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    data: { url: self.location.origin + "/" },
  });
});

// 알림 클릭 시 PWA 창 열기 / 포커스
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin + "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 이미 열려있는 창이 있으면 포커스
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      return clients.openWindow(targetUrl);
    })
  );
});
