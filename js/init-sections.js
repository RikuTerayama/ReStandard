/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

/** 子要素をクローンして 200% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  const maxLoopWidth = track.parentElement.offsetWidth * 2; // 200%
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

/** スクロールをドラッグ/スワイプ/ホイールで手動制御できるようにする */
function attachManualControls(track) {
  let isDown = false;
  let startX = 0;
  let startTx = 0;

  const getTx = () => {
    const m = /translateX\((-?\d+(\.\d+)?)px\)/.exec(track.style.transform || "");
    return m ? parseFloat(m[1]) : 0;
  };

  const setTx = (px) => {
    track.style.transform = `translateX(${px}px)`;
  };

  const pause = () => (track.style.animationPlayState = 'paused');
  const play  = () => (track.style.animationPlayState = 'running');

  // マウス/タッチ
  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDown = true;
    track.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startTx = getTx();
    pause();
  });
  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const delta = e.clientX - startX;
    setTx(startTx + delta);
  });
  track.addEventListener('pointerup',   () => { isDown = false; play(); });
  track.addEventListener('pointercancel', () => { isDown = false; play(); });

  // ホイール横スクロール
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // 主に横のときのみ
    pause();
    setTx(getTx() - e.deltaX);
    clearTimeout(track._wheelTimer);
    track._wheelTimer = setTimeout(() => play(), 300);
  }, { passive: true });
}

/** IntersectionObserver で画面外は自動停止 */
function pauseWhenOutOfView(track) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      track.style.animationPlayState = ent.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0.1 });
  io.observe(track);
}

/** 指定トラックに無限ループ & 手動制御 & 自動再生をセットアップ */
function setupMarquee(track, { direction = 'left', speedSec = 40 } = {}) {
  if (!track) return;

  // 画像ロード後に幅確定
  const imgs = track.querySelectorAll('img');
  let remain = imgs.length;
  const done = () => {
    ensureLoopWidth(track);
    track.style.animation = `${direction === 'left' ? 'scroll-left' : 'scroll-right'} ${speedSec}s linear infinite`;
    attachManualControls(track);
    pauseWhenOutOfView(track);
  };
  if (remain === 0) done();
  else imgs.forEach((img) => {
    if (img.complete) { if (--remain === 0) done(); }
    else img.addEventListener('load', () => { if (--remain === 0) done(); }, { once: true });
  });
}

/* ===================== init ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // DOM存在確認・querySelector修正
  console.log('[INIT] setupMarquee DOM存在確認開始');
  
  // Collection 上段・下段（新構造対応）
  const tracks = document.querySelectorAll('#collection .collection-track');
  console.log(`[INIT] Collection tracks found: ${tracks.length}`);
  
  tracks.forEach((track, index) => {
    const direction = track.getAttribute('data-direction');
    const speed = track.getAttribute('data-speed') || '55';
    
    if (direction === 'left') {
      setupMarquee(track, { direction: 'left', speedSec: parseInt(speed) });
      console.log(`[INIT] Track ${index + 1}: 右→左 (${speed}s)`);
    } else if (direction === 'right') {
      setupMarquee(track, { direction: 'right', speedSec: parseInt(speed) });
      console.log(`[INIT] Track ${index + 1}: 左→右 (${speed}s)`);
    }
  });

  // Lookbook（右→左）
  const lookTrack = document.querySelector('#lookbook .lookbook-track');
  if (lookTrack) {
    setupMarquee(lookTrack, { direction: 'left', speedSec: 55 });
    console.log('[INIT] Lookbook track: 右→左 (55s)');
  } else {
    console.warn('[INIT] Lookbook track not found');
  }
});

// 見出しJSリセット削除 - CSS制御のみに統一
console.log('[INIT] 見出し制御はCSS (.section-title) に完全委譲');
