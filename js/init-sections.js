/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  const maxLoopWidth = track.parentElement.offsetWidth * 4.0; // 400%に増加（切れ目対策を強化）
  
  // オリジナル区間幅を記録（1周の定義）
  const originalChildren = Array.from(track.children);
  let segmentWidth = originalChildren.reduce((w, el) => w + el.getBoundingClientRect().width, 0);
  
  // 画像が未ロードだと幅が 0 になるので暫定で幅推定
  if (segmentWidth === 0) {
    const fallback = originalChildren.length * (track.classList.contains('lookbook-track') ? 300 : 200);
    segmentWidth = fallback;
  }
  
  // オリジナル区間幅を記録
  track._segmentWidth = segmentWidth;
  
  // 最低5回はクローンして確実にループを保証（Lookbook用に増加）
  const minClones = track.classList.contains('lookbook-track') ? 5 : 3;
  let total = segmentWidth;
  let guard = 0;
  
  while ((total < maxLoopWidth || guard < minClones) && guard < 60) {
    const clones = originalChildren.map((n) => n.cloneNode(true));
    clones.forEach((c) => {
      // クローンした画像にloading="lazy"を追加
      const images = c.querySelectorAll('img');
      images.forEach(img => {
        img.setAttribute('loading', 'lazy');
      });
      track.appendChild(c);
    });
    total = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    guard++;
  }
  
  console.log(`[LOOP] Track width: ${total}px (${Math.round(total / track.parentElement.offsetWidth * 100)}% of viewport)`);
}

/* トラックへドラッグ操作を付与。離した位置から再開 */
function attachManualControls(track){
  let startX = 0;
  let startTx = 0;
  let dragging = false;
  let moved = 0;
  let longPressTimer = null;

  const onDown = (ev)=>{
    // 長押しタイマーを開始（150ms）
    longPressTimer = setTimeout(() => {
      dragging = true;
      track.isDragging = true;
      moved = 0;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
      startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      startTx = getTxPx(track);
    }, 150);
    ev.preventDefault();
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
    // 長押しタイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    if(!dragging) return;
    dragging = false;
    
    // アニメーションを再開（現在の位置から継続）
    track.style.animationPlayState = 'running';
    
    // 現在の位置を記録してアニメーションを調整
    const currentTx = getTxPx(track);
    const segmentWidth = track._segmentWidth || 0;
    
    // セグメント幅の倍数に調整してスムーズなループを保証
    if (segmentWidth > 0) {
      const adjustedTx = Math.round(currentTx / segmentWidth) * segmentWidth;
      track.style.transform = `translateX(${adjustedTx}px)`;
    }

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

    // 1) ループ幅をsegmentWidthから厳密算出
    const loopWidth = track._segmentWidth || (track.scrollWidth / 2); // オリジナル区間幅を使用

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
  
  // クリック時の寄せ直しロジックは削除（リンク遷移を阻害しない）
  
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

/* トラックを中央に配置する関数 */
function centerTrack(track) {
  // トラックの親要素に中央揃えのスタイルを適用
  const parent = track.parentElement;
  if (parent) {
    parent.style.display = 'flex';
    parent.style.justifyContent = 'center';
    parent.style.margin = '0 auto';
  }
  
  // トラック自体にも中央揃えを適用
  track.style.margin = '0 auto';
}

/* ===== start alignment helpers ===== */

/** src の末尾一致で画像ノードを探す（大文字小文字を無視） */
function findImageBySuffix(track, suffix) {
  if (!suffix) return null;
  const sfx = suffix.toLowerCase();
  const imgs = track.querySelectorAll('img');
  return Array.from(imgs).find(img => {
    try {
      return new URL(img.src, location.href).pathname.toLowerCase().endsWith(sfx);
    } catch {
      return (img.getAttribute('src') || '').toLowerCase().endsWith(sfx);
    }
  }) || null;
}

/** 目的の画像を「左端 or 右端」に揃えたときの希望 translateX(px) を返す */
function computeDesiredTx(track, target, align = 'left') {
  const wrap = track.parentElement;                       // .track-wrap
  const x = target.offsetLeft;                            // 画像の左端（track 左基準）
  const w = target.getBoundingClientRect().width;
  if (align === 'right') {
    // 画像の右端を wrap の右端に合わせる
    return wrap.clientWidth - (x + w);                    // = 望ましい translateX(px)
  }
  // 左端合わせ
  return -x;
}

/** 現在の keyframes（left/right）に対して、希望 translateX を満たす負の animation-delay を適用 */
function applyInitialDelay(track, desiredTxPx) {
  // ループ一周に相当する距離（segmentWidth）と総時間
  const loop = track._segmentWidth || (track.scrollWidth / 2);
  const durSec = parseFloat(getComputedStyle(track).animationDuration);
  const dir = (track.dataset.direction || 'left').toLowerCase();

  // 希望位置を keyframes の可動範囲に正規化
  // left: 0 → -loop, right: -loop → 0 の範囲であれば OK
  let T = desiredTxPx;
  if (dir === 'left') {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    const progress = (-T) / loop;                         // 0..1
    track.style.animationDelay = `-${(progress * durSec).toFixed(4)}s`;
  } else {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    const progress = (T + loop) / loop;                   // 0..1
    track.style.animationDelay = `-${(progress * durSec).toFixed(4)}s`;
  }
}

/** data-start / data-align に従って初期位置を合わせる */
function alignTrackStart(track) {
  const start = (track.dataset.start || '').toLowerCase();
  const align = (track.dataset.align || 'left').toLowerCase();
  const target = findImageBySuffix(track, start);
  if (!target) return;

  // 一旦アニメを確実にセット（duration を取得するため）
  const dir = (track.dataset.direction || 'left').toLowerCase();
  const base = parseFloat(track.dataset.baseSpeed || 55);
  const dur  = calcSpeedSec(base);
  const key  = (dir === 'right') ? 'scroll-right' : 'scroll-left';
  track.style.animation = `${key} ${dur}s linear infinite`;
  track.style.animationPlayState = 'paused';

  // 希望 translateX を計算して負の delay を適用 → 再生
  const desired = computeDesiredTx(track, target, align);
  applyInitialDelay(track, desired);
  track.style.animationPlayState = 'running';
}
/* ===== /start alignment helpers ===== */

/* lazy-load フェードイン処理 */
function initLazyLoadFadeIn() {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  lazyImages.forEach(img => {
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });
    
    // 既に読み込まれている画像の場合
    if (img.complete) {
      img.classList.add('loaded');
    }
  });
}

/* ===================== init ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // DOM存在確認・querySelector修正
  console.log('[INIT] Collection/Lookbook 初期化開始');
  
  // lazy-load フェードイン処理を初期化
  initLazyLoadFadeIn();
  
  // Collection 上段・下段（新構造対応）
  const tracks = document.querySelectorAll('#collection .collection-track, #lookbook .lookbook-track');
  console.log(`[INIT] Total tracks found: ${tracks.length}`);
  
  tracks.forEach((track, index) => {
    // 幅確保
    ensureLoopWidth(track);
    // 中央補正を適用
    centerTrack(track);
    // 自動スクロール初期化
    initAutoScroll(track);
    // ★開始画像に揃える
    alignTrackStart(track);
    // 画面外一時停止
    pauseWhenOutOfView(track);
    console.log(`[INIT] Track ${index + 1}: ${track.dataset.direction || 'left'} (${track.dataset.speed || '55'}s)`);
  });
  
  // href 未設定（# や空、javascript:void(0)）の a は data-href を使って遷移させる
  document.querySelectorAll('#collection a, #lookbook a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')?.trim().toLowerCase() || '';
      const noNav = href === '' || href === '#' || href.startsWith('javascript');
      if (noNav && a.dataset.href) {
        e.preventDefault();
        window.location.href = a.dataset.href;
        return;
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
