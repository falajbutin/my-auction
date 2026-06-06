/* ═══════════════════════════════════════════════
   Service Worker — قعد فلج بطين
   الاستراتيجية: Network First (الشبكة أولاً)
   عند كل تحديث يُمسح الكاش القديم تلقائياً
═══════════════════════════════════════════════ */

// ⬆️ غيّر هذا الرقم عند كل رفع جديد للتطبيق
const CACHE_VERSION = "qad-falaj-v3";

const STATIC_ASSETS = [
  "./index.html",
  "./icon-192.png",
  "./icon-512.png"
];

/* ── تثبيت: تخزين الملفات الأساسية فقط ── */
self.addEventListener("install", (event) => {
  // تفعيل فوري بدون انتظار إغلاق التبويبات القديمة
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/* ── تفعيل: حذف جميع الكاشات القديمة فوراً ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log("🗑️ حذف كاش قديم:", key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // السيطرة على جميع التبويبات المفتوحة فوراً
      return self.clients.claim();
    })
  );
});

/* ── جلب: الشبكة أولاً، الكاش احتياطي ── */
self.addEventListener("fetch", (event) => {
  // تجاهل طلبات Firebase وAPIs الخارجية (لا تُكاش أبداً)
  const url = event.request.url;
  if (
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com") ||
    url.includes("cdnjs.cloudflare.com") ||
    url.includes("fonts.google") ||
    event.request.method !== "GET"
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // نجح الاتصال — حدّث الكاش بالنسخة الجديدة
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // فشل الاتصال — ارجع للكاش (وضع عدم الاتصال)
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("./index.html");
        });
      })
  );
});

/* ── استقبال رسائل من التطبيق ── */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
