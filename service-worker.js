// ============================================================
// service-worker.js
// PWAのオフライン動作を支えるService Worker。
// 一度読み込んだファイルをキャッシュし、
// ネットワークに接続できない場合でもアプリを開きやすくする。
// ============================================================

// キャッシュの名前
// ファイルを更新時、「v1」→「v2」のように変更すると、古いキャッシュを新しいものへ切り替えが可能
const CACHE_NAME = "attendance-app-v2";

// アプリとして最低限必要なファイルをキャッシュ
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ------------------------------------------------------------
// install：Service Workerが初めて登録されたときに実行
// 必要なファイルをキャッシュへ保存
// ------------------------------------------------------------
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// ------------------------------------------------------------
// activate：新しいService Workerが有効になったときに実行
// 古いバージョンのキャッシュが残っていれば削除
// ------------------------------------------------------------
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

// ------------------------------------------------------------
// fetch：ブラウザがファイルを取得するときに実行
// まずキャッシュを探し、なければ通常のネットワーク通信を行いPWAのオフライン利用を補助
// ------------------------------------------------------------
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
