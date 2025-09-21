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
    moved += Math.abs(dx - (moved > 0 ? dx : 0));
    track.style.transform = `translateX(${startTx + dx}px)`;
    ev.preventDefault();
  };
  
  const onUp = (ev)=>{
    if(!dragging) return;
    dragging = false;

    // 8px未満=クリック（リンク遷移を邪魔しない）
    if (moved < 8) {
      // クリック → 自動スクロール継続
      track.style.removeProperty('transform');
      track.style.animationPlayState = 'running';
      track.classList.remove('dragging');
      return;
    }

    // 8px以上=ドラッグ → 現在位置から自動再開
    ev.preventDefault();
    ev.stopPropagation();

    // ①現在の位置(px)を取得
    const nowTx = getTxPx(track);

    // ②ループ幅（= トラック総幅/2）を計算
    const loop = track.scrollWidth / 2;

    // ③ px を 0..loop に正規化（右→左スクロール想定で正値化）
    //    ※CSSのkeyframesが 0% -> -50% (＝-loop) の前提
    let offset = (-nowTx) % loop;
    if (offset < 0) offset += loop;

    // ④ 進捗率 * 速度 = 負の animation-delay 秒 を再設定
    const speed = calcSpeedSec(parseFloat(track.dataset.baseSpeed || 55));
    const progress = offset / loop;         // 0..1
    const delaySec = progress * speed;      // 開始からの経過時間
    track.style.animationDelay = `-${delaySec}s`;

    // ⑤ 一時 transform をクリアして再開
    track.style.removeProperty('transform');
    track.style.animationPlayState = 'running';
    track.classList.remove('dragging');
  };

  track.addEventListener('pointerdown', onDown, {passive:false});
  window.addEventListener('pointermove', onMove, {passive:false});
  window.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, {passive:false});
  window.addEventListener('touchmove', onMove, {passive:false});
  window.addEventListener('touchend', onUp);
  
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
  const base = parseFloat(track.dataset.speed || 55);
  const dur = calcSpeedSec(base);
  track.dataset.baseSpeed = String(base); // 再計算に使う

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
