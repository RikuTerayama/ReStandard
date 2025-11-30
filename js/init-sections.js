/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

// 関数を削除 - CSSで完全に制御するため不要
// Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  if (track.closest('#collection, #lookbook')) {
    console.log('ensureLoopWidth: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
  // READ all layout properties first
  const parentWidth = track.parentElement?.offsetWidth || track.offsetWidth || 1;
  const isLookbookTrack = track.classList.contains('lookbook-track');
  const multiplier = isLookbookTrack ? 6.0 : 4.0;
  const maxLoopWidth = parentWidth * multiplier;

  const originals = Array.from(track.children);
  if (originals.length === 0) {
    return;
  }

  const fallbackItemWidth = isLookbookTrack ? 300 : 200;
  const itemWidths = originals.map((node) => {
    const rect = node.getBoundingClientRect();
    if (!rect.width) {
      return fallbackItemWidth;
    }
    const styles = window.getComputedStyle(node);
    const margin = parseFloat(styles.marginLeft || '0') + parseFloat(styles.marginRight || '0');
    return rect.width + margin;
  });

  let segmentWidth = itemWidths.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(segmentWidth) || segmentWidth <= 0) {
    segmentWidth = originals.length * fallbackItemWidth;
  }
  segmentWidth = Math.max(segmentWidth, 1);

  // WRITE properties after all reads
  track._segmentWidth = segmentWidth;

  const minClones = isLookbookTrack ? 16 : 3;
  let clonesAdded = 0;
  let totalWidth = segmentWidth;

  const needsMoreContent = () => totalWidth < maxLoopWidth || clonesAdded < minClones;

  while (needsMoreContent() && clonesAdded < 80) {
      const fragment = document.createDocumentFragment();
      originals.forEach((node) => {
        const clone = node.cloneNode(true);
        clone.querySelectorAll('img').forEach((img) => {
          if (img.hasAttribute('data-lcp')) return; // skip LCP
          // Collection画像にはlazy loadingを適用しない（Safariで表示されない問題を回避）
          const isCollectionImage = img.closest('#collection') !== null;
          if (!isCollectionImage && !img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
          }
          // Collection画像のloading属性を削除（Safariで確実に表示されるように）
          if (isCollectionImage) {
            if (img.hasAttribute('loading')) {
              img.removeAttribute('loading');
            }
            // loading属性が設定されていないことを確認
            img.loading = 'eager'; // eagerに設定して確実に読み込む
          }
          if (img.hasAttribute('fetchpriority')) {
            img.removeAttribute('fetchpriority');
          }
        });
        fragment.appendChild(clone);
      });
    track.appendChild(fragment);
    totalWidth += segmentWidth;
    clonesAdded++;
  }

  // READ final width after all writes (moved to avoid reflow)
  const finalWidth = track.scrollWidth;
  const viewportRatio = parentWidth ? Math.round((finalWidth / parentWidth) * 100) : 0;
  if (window.__QA_MEASURE_LOGS__) {
    console.log(`[LOOP] Track width: ${finalWidth}px (${viewportRatio}% of viewport) clones=${clonesAdded}`);
  }
}
function attachManualControls(track){
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  // 親セクションでフィルタリングして完全隔離
  if (track.closest('#collection, #lookbook')) {
    console.log('attachManualControls: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
  // クラス名でも念のためチェック（二重防御）
  if (track.classList.contains('collection-track') || track.classList.contains('lookbook-track')) {
    console.log('attachManualControls: Collection/Lookbook trackはCSSで完全制御するため、ドラッグ機能をスキップ');
    return;
  }
  
  let startX = 0;
  let startTx = 0;
  let dragging = false;
  let moved = 0;
  let longPressTimer = null;

  const onDown = (ev)=>{
    // 長押しタイマーを開始（150ms）
    longPressTimer = setTimeout(() => {
      // READ all layout properties first
      startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      startTx = getTxPx(track);
      
      // WRITE all properties after reads
      dragging = true;
      track.isDragging = true;
      moved = 0;
      track.classList.add('dragging');
      // Lookbookトラックの場合は、CSSで制御するため、インラインスタイルは設定しない
      const isLookbook = track.classList.contains('lookbook-track');
      if (!isLookbook) {
        track.style.animationPlayState = 'paused';
      }
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
    
    // Lookbookトラックの場合は、CSSで制御するため、インラインスタイルは設定しない
    const isLookbook = track.classList.contains('lookbook-track');
    
    // READ all layout properties first
    const currentTx = getTxPx(track);
    const segmentWidth = track._segmentWidth || 0;
    const dragAmount = Math.abs(moved);
    
    if (!isLookbook) {
      // WRITE all properties after reads
      track.style.animationPlayState = 'running';
    }
    
    // セグメント幅の倍数に調整してスムーズなループを保証
    if (segmentWidth > 0) {
      const adjustedTx = Math.round(currentTx / segmentWidth) * segmentWidth;
      track.style.transform = `translateX(${adjustedTx}px)`;
    }

    // 8px未満=クリック：リンク遷移は邪魔せず、その場から再開
    if (dragAmount < 8) {
      track.style.removeProperty('transform');
      if (!isLookbook) {
        track.style.animationPlayState = 'running';
      }
      track.classList.remove('dragging');
      moved = 0; // ← ここで初めてリセット
      return;
    }

    // 8px以上=ドラッグ → 現在位置から自動再開（ジャンプ防止）
    ev.preventDefault();
    ev.stopPropagation();
    if (isLookbook) {
      // LookbookはCSSで制御するため、インラインスタイルは削除
      track.style.removeProperty('transform');
      track.style.removeProperty('animation');
      track.style.removeProperty('animation-play-state');
      track.classList.remove('dragging');
      moved = 0;
      return;
    }

    // READ all layout properties first
    const loopWidth = track._segmentWidth || (track.scrollWidth / 2); // オリジナル区間幅を使用
    const computedStyle = getComputedStyle(track);
    const m = new DOMMatrix(computedStyle.transform);
    let tx = m.m41; // 2D 水平移動
    tx = ((tx % loopWidth) + loopWidth) % loopWidth; // 常に 0..loopWidth
    const dir = track.dataset.direction === 'rtl' ? -1 : 1;
    const progress = tx / loopWidth;              // 0..1
    const animationDuration = computedStyle.animationDuration;
    const delay = -progress * parseFloat(animationDuration) * 1000; // ms

    // WRITE all properties after reads
    track.style.animation = 'none';
    void track.offsetHeight; // reflow
    track.style.removeProperty('transform');
    track.style.animation = `marquee ${animationDuration} linear infinite`;
    track.style.animationDelay = `${delay}ms`;

    track.classList.remove('dragging');
    moved = 0;
  };

  // パフォーマンス最適化: passive listeners when enabled
  const usePassive = window.__PERF_FLAGS?.passiveListeners !== false;
  
  track.addEventListener('pointerdown', onDown, {passive:false});
  window.addEventListener('pointermove', onMove, {passive:false});
  window.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, {passive: usePassive ? true : false});
  window.addEventListener('touchmove', onMove, {passive: usePassive ? true : false});
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
  
  // ホイール横スクロール対応 - Collection/Lookbookには適用しない
  // Collection/Lookbook trackはCSSベースで常時runningのため、wheelイベントでのpauseは無効化
  if (!track.classList.contains('collection-track') && !track.classList.contains('lookbook-track')) {
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      
      // READ all layout properties first
      const currentTx = getTxPx(track);
      
      // WRITE all properties after reads
      track.style.animationPlayState = 'paused';
      track.classList.add('dragging');
      track.style.transform = `translateX(${currentTx - e.deltaX}px)`;
      
      clearTimeout(track._wheelTimer);
      track._wheelTimer = setTimeout(() => {
        onUp({ preventDefault: () => {}, stopPropagation: () => {} });
      }, 300);
    }, { passive: usePassive ? true : false });
  }
}

/** IntersectionObserver で画面外は自動停止
 *  ただし "ユーザーが止めた（data-user-paused=1）" 場合は何もしない */
function pauseWhenOutOfView(track) {
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  // 親セクションでフィルタリングして完全隔離
  if (track.closest('#collection, #lookbook')) {
    console.log('pauseWhenOutOfView: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
  // クラス名でも念のためチェック（二重防御）
  if (track.classList.contains('collection-track') || track.classList.contains('lookbook-track')) {
    console.log('pauseWhenOutOfView: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
  // その他のtrackタイプ（将来の拡張用）
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      if (track.dataset.userPaused === '1') return; // ← 勝手に再生しない
      
      console.log('pauseWhenOutOfView:', {
        isIntersecting: ent.isIntersecting,
        intersectionRatio: ent.intersectionRatio,
        trackId: track.id || 'no-id',
        isCollection: track.classList.contains('collection-track')
      });
      
      if (ent.isIntersecting) {
        // 画面内に入ったらアニメーションを確実に再開
        // CSSで完全に制御するため、インラインスタイルは削除
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
        track.style.removeProperty('animation-duration');
        track.offsetHeight; // リフローを強制
        
        console.log('pauseWhenOutOfView: アニメーション再開（CSSで制御）');
      } else {
        // 画面外に出たら一時停止（CSSで制御するため、インラインスタイルは削除）
        track.style.removeProperty('animation-play-state');
        // CSSでpausedを設定（CSSルールで制御）
        console.log('pauseWhenOutOfView: アニメーション一時停止（CSSで制御）');
      }
    });
  }, { threshold: 0.1 }); // 閾値を0.1に戻してより敏感に反応
  io.observe(track);
}

/* 初期化時：速度を画面幅で上書き、方向は data-dir */
function initAutoScroll(track){
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  // 親セクションでフィルタリングして完全隔離
  if (track.closest('#collection, #lookbook')) {
    console.log('initAutoScroll: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    // draggingクラスが残っている場合は削除（念のため）
    track.isDragging = false;
    track.classList.remove('dragging');
    return;
  }
  
  // クラス名でも念のためチェック（二重防御）
  if (track.classList.contains('collection-track') || track.classList.contains('lookbook-track')) {
    console.log('initAutoScroll: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    track.isDragging = false;
    track.classList.remove('dragging');
    return;
  }
  
  // その他のtrackタイプ（将来の拡張用）のみ処理
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  const dir = (track.dataset.direction || 'left').toLowerCase(); // left=左へ / right=右へ

  let key;
  let duration;
  
  // 再度draggingクラスを確認して削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  requestAnimationFrame(() => {
    // draggingクラスが残っている場合は削除
    if (track.classList.contains('dragging')) {
      track.classList.remove('dragging');
      track.isDragging = false;
      console.log('initAutoScroll: draggingクラスを削除');
    }
    
    track.style.removeProperty('animation-play-state');
  });
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
function calcSpeedSec(base=80){
  const w = window.innerWidth;
  if (w < 480) return Math.max(50, base - 30);   // SP
  if (w < 992) return Math.max(65, base - 15);   // タブレット
  return base;                                   // PC
}

/* トラックを中央に配置する関数 */
function centerTrack(track) {
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  if (track.closest('#collection, #lookbook')) {
    console.log('centerTrack: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
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
  // READ all layout properties first
  const wrap = track.parentElement;                       // .track-wrap
  const x = target.offsetLeft;                            // 画像の左端（track 左基準）
  const w = target.getBoundingClientRect().width;
  const wrapWidth = wrap.clientWidth;
  
  if (align === 'right') {
    // 画像の右端を wrap の右端に合わせる
    return wrapWidth - (x + w);                           // = 望ましい translateX(px)
  }
  // 左端合わせ
  return -x;
}

/** Collection/LookbookともにCSSベースで常時runningとするため、
 *  applyInitialDelay関数は削除（初期位置合わせは不要）
 *  アニメーション状態を触らないようにする
 */
function applyInitialDelay(track, desiredTxPx) {
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // animationDelayの操作は削除
  // アニメーション状態を触らないようにする
}

/** data-start / data-align に従って初期位置を合わせる */
function alignTrackStart(track) {
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは処理しない
  if (track.closest('#collection, #lookbook')) {
    console.log('alignTrackStart: Collection/Lookbook trackは専用JSで制御されるため、スキップ');
    return;
  }
  
  const start = (track.dataset.start || '').toLowerCase();
  const align = (track.dataset.align || 'left').toLowerCase();
  const target = findImageBySuffix(track, start);
  if (!target) return;

  // READ all layout properties first
  const dir = (track.dataset.direction || 'left').toLowerCase();
  const isLookbook = track.classList.contains('lookbook-track');
  // CSSで速度が統一されているため、直接値を使用
  // PC版（1025px以上）は180s、それ以外は120s
  const dur  = isLookbook ? (window.innerWidth >= 1025 ? 180 : 120) : 50; // Lookbook: PC版180s/その他120s, Collection: 50s
  const key  = isLookbook ? 'lookbook-scroll' : (dir === 'right' ? 'scroll-right' : 'scroll-left');
  const desired = computeDesiredTx(track, target, align);

  // Collection/LookbookともにCSSベースで常時runningとするため、
  // alignTrackStartでのスタイル操作は削除
  // アニメーション状態を触らないようにする
}
/* ===== /start alignment helpers ===== */

/* lazy-load フェードイン処理 */
function initLazyLoadFadeIn() {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  lazyImages.forEach(img => {
    if (img.hasAttribute('data-lcp')) return; // skip LCP
    // Collection画像のloading属性を削除（Safariで確実に表示されるように）
    const isCollectionImage = img.closest('#collection') !== null;
    if (isCollectionImage && img.hasAttribute('loading')) {
      img.removeAttribute('loading');
      return; // Collection画像はlazy loadingを適用しない
    }
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
// DOMContentLoadedイベントがすでに発火済みの場合は即座に実行、そうでない場合はイベントリスナーを追加
const initSections = () => {
  console.log('[INIT] initSections関数実行開始');
  
  // DOM存在確認・querySelector修正
  if (window.__QA_MEASURE_LOGS__) {
    console.log('[INIT] Collection/Lookbook 初期化開始');
  }
  
  // lazy-load フェードイン処理を初期化
  initLazyLoadFadeIn();
  
  // STEP5: Collection/Lookbook trackは専用JSで完全に制御するため、ここでは一切処理しない
  // collection-marquee.js / lookbook-marquee.js がそれぞれ担当するため、
  // init-sections.jsからは完全に隔離する
  
  // Collection/Lookbook trackの初期化処理は削除
  // 専用JS（collection-marquee.js / lookbook-marquee.js）がDOMContentLoadedで初期化する
  
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
  
  // Step 5: Collection専用マーキー実装 - resizeイベントからCollectionを完全に除外
  // Collectionは collection-marquee.js で完全に制御するため、ここでは処理しない
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // resizeイベントでのスタイル操作は削除
  // アニメーション状態を触らないようにする
  
  // Collection/Lookbook Trackは専用JSで完全に制御するため、loadイベントでの処理は不要
  
  // 外部サイトからの遷移時も確実に初期化（リサイズ時にも再実行）
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // visibilitychangeイベントでの再初期化は削除
  // アニメーション状態を触らないようにする
};

// 即座に実行を試みる（DOMContentLoadedイベントがすでに発火済みの場合）
console.log('[INIT] スクリプト読み込み完了 - document.readyState:', document.readyState);
console.log('[INIT] initSections関数を即座に実行');
initSections();

// DOMContentLoadedイベントでも実行（二重実行を防ぐため、フラグで制御）
let initSectionsExecuted = false;
const initSectionsOnce = () => {
  if (!initSectionsExecuted) {
    initSectionsExecuted = true;
    console.log('[INIT] DOMContentLoadedイベントでinitSections関数を実行');
    initSections();
  }
};

if (document.readyState === 'loading') {
  // DOMContentLoadedイベントがまだ発火していない場合
  document.addEventListener('DOMContentLoaded', initSectionsOnce);
  console.log('[INIT] DOMContentLoadedイベントリスナーを追加');
} else {
  // DOMContentLoadedイベントがすでに発火済みの場合
  console.log('[INIT] DOMContentLoadedイベントはすでに発火済み');
  initSectionsOnce();
}

// loadイベントでも実行（フォールバック）
window.addEventListener('load', () => {
  console.log('[INIT] loadイベントでinitSections関数を実行（フォールバック）');
  initSections();
}, { once: true });

// 見出しJSリセット削除 - CSS制御のみに統一
if (window.__QA_MEASURE_LOGS__) {
  console.log('[INIT] 見出し制御はCSS (.section-title) に完全委譲');
}
