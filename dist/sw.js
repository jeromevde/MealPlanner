const PRECACHE_URLS = ["./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./images/aspargusbeet.jpg","./images/banana_boat.jpg","./images/bananapancakes.jpg","./images/cabbagehalloumi.jpg","./images/cucumbersalad.jpg","./images/friday_evening_1.jpg","./images/friday_evening_2.jpg","./images/friday_midday_1.jpg","./images/friday_midday_2.jpg","./images/friday_morning_1.jpg","./images/friday_morning_1_v2.jpg","./images/friday_morning_2.jpg","./images/greengiant.jpg","./images/hamcheesesandwich.jpg","./images/lasagna.jpg","./images/marrymechicken.jpg","./images/monday_evening_1.jpg","./images/monday_evening_2.jpg","./images/monday_midday_1.jpg","./images/monday_midday_2.jpg","./images/monday_morning_1.jpg","./images/monday_morning_2.jpg","./images/nuttypudding.jpg","./images/omelette.jpg","./images/orangefennel.jpg","./images/pinkpasta.jpg","./images/quinoabeans.jpg","./images/quinoasalad.jpg","./images/runners_smoothie.jpg","./images/salmoncod.jpg","./images/salmontoast.jpg","./images/saturday_evening_1.jpg","./images/saturday_midday_1.jpg","./images/saturday_morning_1.jpg","./images/saturday_morning_2.jpg","./images/smoothie.jpg","./images/smoothie_bowl.jpg","./images/spaghettifetasquash.jpg","./images/spaghettivongole.jpg","./images/stuffedsweetpotato.jpg","./images/sunday_evening_1.jpg","./images/sunday_evening_2.jpg","./images/sunday_evening_3.jpg","./images/sunday_midday_1.jpg","./images/sunday_midday_2.jpg","./images/sunday_morning_1.jpg","./images/sunday_morning_2.jpg","./images/sunday_morning_3.jpg","./images/superveggie.jpg","./images/sweetpotatolentilsoup.jpg","./images/thursday_evening_1.jpg","./images/thursday_evening_2.jpg","./images/thursday_midday_1.jpg","./images/thursday_midday_2.jpg","./images/thursday_morning_1.jpg","./images/thursday_morning_2.jpg","./images/tuesday_evening_1.jpg","./images/tuesday_evening_2.jpg","./images/tuesday_midday_1.jpg","./images/tuesday_midday_2.jpg","./images/tuesday_morning_1.jpg","./images/tuesday_morning_2.jpg","./images/vegetable_soup.jpg","./images/wednesday_evening_1.jpg","./images/wednesday_evening_2.jpg","./images/wednesday_midday_1.jpg","./images/wednesday_midday_2.jpg","./images/wednesday_morning_1.jpg","./images/wednesday_morning_2.jpg"];

const CACHE = 'mealplanner-202607121754';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first: fetch fresh content when online, fall back to cache offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
