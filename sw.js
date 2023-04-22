let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  const installButton = document.querySelector('#install-button');
  installButton.style.display = 'block';
  installButton.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt.');
      } else {
        console.log('User dismissed the install prompt.');
      }
      deferredPrompt = null;
    });
  });
}

// const APP_CACHE_NAME = 'bossocon-pwa-morteza';
// const STATIC_CACHE_NAME = 'bossocon-pwa-morteza-static'
// const staticAssets = [
//     './',
//     './index.html',
//     './scripts.js',
//     './style.css',
//     './libs/webcomponents-lite.js',
//     './libs/keys.js',
//     './libs/wam-controller.js',
//     './obxd.js',
//     './libs/pressure.min.js',
//     './libs/interact.min.js',
// ];

// self.addEventListener('install', async event => {
//     //event.waitUntil(self.skipWaiting());
//     const cache = await caches.open(APP_CACHE_NAME);
//     await cache.addAll(staticAssets);
// });

// async function cacheFirst(req) {
//     const cache = await caches.open(APP_CACHE_NAME);
//     const cachedResponse = await cache.match(req);
//     return cachedResponse || fetch(req);
// }

// self.addEventListener('fetch', async event => {
//     const req = event.request;
//     event.respondWith(cacheFirst(req));
// });

// self.addEventListener('activate', function (e) {
//     e.waitUntil(
//         Promise.all([
//             self.clients.claim(),
//             caches.keys().then(function (cacheNames) {
//                 return Promise.all(
//                     cacheNames.map(function (cacheName) {
//                         if (cacheName !== APP_CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
//                             console.log('deleting', cacheName);
//                             return caches.delete(cacheName);
//                         }
//                     })
//                 );
//             })
//         ])
//     );
// });

// function distinct(value, index, self) {
//     return self.indexOf(value) === index;
// }

// function debounce(func, wait, immediate) {
//     var timeout;
//     return function() {
//       var context = this,
//         args = arguments;
//       var callNow = immediate && !timeout;
//       clearTimeout(timeout);
//       timeout = setTimeout(function() {
//         timeout = null;
//         if (!immediate) {
//           func.apply(context, args);
//         }
//       }, wait);
//       if (callNow) func.apply(context, args);
//     }
//   }

