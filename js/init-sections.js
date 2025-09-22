/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  const maxLoopWidth = track.parentElement.offsetWidth * 3; // 300%
  let total = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);

  // 画像が未ロードだと幅が 0 になるので暫定で幅推定
  if (total === 0) {
    const fallback = track.children.length * 200;
    total = fallback;
  }

  let guard = 0;
  while (total < maxLoopWidth && guard < 40) {
    const clones = Array.from(track.children).map((n) => n.cloneNode(true));
    clones.forEach((c) => track.appendChild(c));
    total = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    guard++;
  }
}

/* トラックへドラッグ操作を付与。離した位置から再開 */
function attachManualControls(track){
  let startX = 0;
  let startTx = 0;
  let dragging = false;
  let moved = 0;

  const onDown = (ev)=>{
    dragging = true;
    track.isDragging = true;
    moved = 0;
    track.classList.add('dragging');
    track.style.animationPlayState = 'paused';
    startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    startTx = getTxPx(track);
  };
  
  const onMove = (ev)=>{
    if(!dragging) return;
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    const dx = x - startX;
    moved += Math.abs(dx);
    track._lastMoved = moved;
    track.style.transform = `translateX(${startTx + dx}px)`;
    ev.preventDefault();
  };
  
  const onUp = (ev)=>{
    if(!dragging) return;
    dragging = false;

    // moved はここではリセットしない（先に判定に使う）
    const dragAmount = Math.abs(moved);

    // 8px未満=クリック：リンク遷移は邪魔せず、その場から再開
    if (dragAmount < 8) {
      track.style.removeProperty('transform');
      track.style.animationPlayState = 'running';
      track.classList.remove('dragging');
      moved = 0; // ← ここで初めてリセット
      return;
    }

    // 8px以上=ドラッグ → 現在位置から自動再開（ジャンプ防止）
    ev.preventDefault();
    ev.stopPropagation();

    // 1) ループ幅を最新スクロール幅から厳密算出
    const loopWidth = track.scrollWidth / 2; // クローン込みなら /2 で一周相当

    // 2) 現在 translateX を取得し、0..loopWidth に正規化
    const m = new DOMMatrix(getComputedStyle(track).transform);
    let tx = m.m41; // 2D 水平移動
    tx = ((tx % loopWidth) + loopWidth) % loopWidth; // 常に 0..loopWidth

    // 3) 運動方向（右→左は負、左→右は正）に応じた負の delay 計算
    const dir = track.dataset.direction === 'rtl' ? -1 : 1;
    const progress = tx / loopWidth;              // 0..1
    const delay = -progress * parseFloat(getComputedStyle(track).animationDuration) * 1000; // ms

    // 4) 再適用順：アニメ一旦無効 → reflow → delay 指定 → アニメ有効
    track.style.animation = 'none';
    void track.offsetHeight; // reflow
    track.style.removeProperty('transform');
    track.style.animation = `marquee ${getComputedStyle(track).animationDuration} linear infinite`;
    track.style.animationDelay = `${delay}ms`;

    track.classList.remove('dragging');
    moved = 0;
  };

  track.addEventListener('pointerdown', onDown, {passive:false});
  window.addEventListener('pointermove', onMove, {passive:false});
  window.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, {passive:false});
  window.addEventListener('touchmove', onMove, {passive:false});
  window.addEventListener('touchend', onUp);
  
  // ドラッグ時のリンク遷移を無効化
  const container = track.parentElement;
  container.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', e=>{
      if(track.isDragging || (track._lastMoved && track._lastMoved > 8)){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
  
  // クリックで軽く寄せてから再開（リンク遷移は阻害しない）
  track.querySelectorAll('a, img').forEach(el => {
    el.addEventListener('click', (e) => {
      // ドラッグ中クリックは無視
      if (track.isDragging) return;

      // href="#" の場合はページジャンプを防ぐ
      if (el.tagName === 'A' && el.getAttribute('href') === '#') {
        e.preventDefault();
        e.stopPropagation();
      }

      // 要素の中心をスクリーン中央に少し寄せる（過度に動かさない）
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const screenCenter = window.innerWidth / 2;
      const delta = center - screenCenter;

      // 現在の transform を取得 → 少しだけ補正
      const currentTx = getTxPx(track);
      track.style.animation = 'none';
      track.style.transform = `translateX(${currentTx - delta * 0.5}px)`;

      requestAnimationFrame(() => {
        const nowTx = getTxPx(track);
        const loop = track.scrollWidth / 2;
        let offset = (-nowTx) % loop;
        if (offset < 0) offset += loop;
        const speed = calcSpeedSec(parseFloat(track.dataset.baseSpeed || 55));
        const delaySec = (offset / loop) * speed;
        track.style.animationDelay = `-${delaySec}s`;
        track.style.removeProperty('transform');
        track.style.animationPlayState = 'running';
      });
    });
  });
  
  // ホイール横スクロール対応
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    track.style.animationPlayState = 'paused';
    track.classList.add('dragging');
    const currentTx = getTxPx(track);
    track.style.transform = `translateX(${currentTx - e.deltaX}px)`;
    
    clearTimeout(track._wheelTimer);
    track._wheelTimer = setTimeout(() => {
      onUp({ preventDefault: () => {}, stopPropagation: () => {} });
    }, 300);
  }, { passive: true });
}

/** IntersectionObserver で画面外は自動停止
 *  ただし "ユーザーが止めた（data-user-paused=1）" 場合は何もしない */
function pauseWhenOutOfView(track) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      if (track.dataset.userPaused === '1') return; // ← 勝手に再生しない
      track.style.animationPlayState = ent.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0.1 });
  io.observe(track);
}

/* 初期化時：速度を画面幅で上書き、方向は data-dir */
function initAutoScroll(track){
  const dir = (track.dataset.direction || 'left').toLowerCase(); // left=左へ / right=右へ
  let speed = parseInt(track.getAttribute('data-speed') || '55', 10);
  if (window.innerWidth <= 768)  speed = Math.max(12, speed - 10);
  if (window.innerWidth <= 480)  speed = Math.max(10, speed - 14);
  
  const dur = calcSpeedSec(speed);
  track.dataset.baseSpeed = String(speed); // 再計算に使う

  const key = dir === 'right' ? 'scroll-right' : 'scroll-left';
  track.style.animation = `${key} ${dur}s linear infinite`;
  track.style.animationPlayState = 'running';
  track.style.willChange = 'transform';
  attachManualControls(track);
}

/* ユーティリティ：現在のtranslateX(px)を取得 */
function getTxPx(el){
  const m = getComputedStyle(el).transform;
  if(!m || m === 'none') return 0;
  const a = m.match(/matrix\(.*?,.*?,.*?,.*?,\s*([\-0-9.]+),\s*([\-0-9.]+)\)/);
  return a ? parseFloat(a[1]) : 0;
}

/* 速度を画面幅で段階調整（大きい画面ほどゆっくり） */
function calcSpeedSec(base=55){
  const w = window.innerWidth;
  if (w < 480) return Math.max(24, base - 28);   // SP
  if (w < 992) return Math.max(30, base - 17);   // タブレット
  return base;                                   // PC
}

/* ===================== init ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // DOM存在確認・querySelector修正
  console.log('[INIT] Collection/Lookbook 初期化開始');
  
  // Collection 上段・下段（新構造対応）
  const tracks = document.querySelectorAll('#collection .collection-track, #lookbook .lookbook-track');
  console.log(`[INIT] Total tracks found: ${tracks.length}`);
  
  tracks.forEach((track, index) => {
    // 幅確保
    ensureLoopWidth(track);
    // 自動スクロール初期化
    initAutoScroll(track);
    // 画面外一時停止
    pauseWhenOutOfView(track);
    console.log(`[INIT] Track ${index + 1}: ${track.dataset.direction || 'left'} (${track.dataset.speed || '55'}s)`);
  });
  
  // href 未設定（# や空）の a は data-href を使って遷移させる
  document.querySelectorAll('#collection a, #lookbook a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') {
        const dh = a.dataset.href;
        if (dh) { 
          e.preventDefault(); 
          window.open(dh, '_blank'); 
        }
      }
    });
  });
  
  // 画面幅が変わったら再計算（速度だけアップデート）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('#collection .collection-track, #lookbook .lookbook-track').forEach(track => {
        const dir = track.dataset.direction || 'left';
        const base = parseFloat(track.dataset.baseSpeed || 55);
        const sec = calcSpeedSec(base);
        const key = dir === 'right' ? 'scroll-right' : 'scroll-left';
        track.style.animation = `${key} ${sec}s linear infinite`;
      });
    }, 200);
  });
});

// 見出しJSリセット削除 - CSS制御のみに統一
console.log('[INIT] 見出し制御はCSS (.section-title) に完全委譲');
