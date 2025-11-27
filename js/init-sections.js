/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

// 関数を削除 - CSSで完全に制御するため不要
// Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
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
          if (isCollectionImage && img.hasAttribute('loading')) {
            img.removeAttribute('loading');
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
  
  // ホイール横スクロール対応
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

/** IntersectionObserver で画面外は自動停止
 *  ただし "ユーザーが止めた（data-user-paused=1）" 場合は何もしない */
function pauseWhenOutOfView(track) {
  if (track.classList.contains('lookbook-track')) {
    // Lookbookは常時アニメーションさせる（CSSで制御するため、インラインスタイルは削除）
    // draggingクラスが残っている場合は削除
    if (track.classList.contains('dragging') && !track.isDragging) {
      track.classList.remove('dragging');
      track.isDragging = false;
      console.log('pauseWhenOutOfView: Lookbookのdraggingクラスを削除');
    }
    track.style.removeProperty('animation-play-state');
    return;
  }
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
        // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
        track.style.removeProperty('animation-duration');
        track.offsetHeight; // リフローを強制
        
        console.log('pauseWhenOutOfView: Collectionアニメーション再開（CSSで制御）');
      } else {
        // 画面外に出たら一時停止
        track.style.animationPlayState = 'paused';
        console.log('pauseWhenOutOfView: Collectionアニメーション一時停止');
      }
    });
  }, { threshold: 0.1 }); // 閾値を0.1に戻してより敏感に反応
  io.observe(track);
}

/* 初期化時：速度を画面幅で上書き、方向は data-dir */
function initAutoScroll(track){
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  const dir = (track.dataset.direction || 'left').toLowerCase(); // left=左へ / right=右へ
  const isLookbook = track.classList.contains('lookbook-track');

  let key;
  let duration;

  if (isLookbook) {
    // LookbookはCSSで完全に制御するため、インラインスタイルは削除
    // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
  } else {
    // Collection: すべての環境で150sに統一（collection-interaction.jsと一致）
    const speed = 150; // 固定値で統一
    duration = speed; // calcSpeedSecを使わず、直接150sを使用
    track.dataset.baseSpeed = String(speed);
    track.dataset.speed = String(speed);
    key = dir === 'right' ? 'scroll-right' : 'scroll-left';
    
    // draggingクラスを確実に削除してからアニメーションを設定
    track.isDragging = false;
    track.classList.remove('dragging');
    
    // CSSで完全に制御するため、インラインスタイルは削除
    // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('animation-duration');
  }
  
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
    
    // CSSで完全に制御するため、インラインスタイルは削除
    if (!isLookbook) {
      track.style.removeProperty('animation-play-state');
    }
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

/** 現在の keyframes（left/right）に対して、希望 translateX を満たす負の animation-delay を適用 */
function applyInitialDelay(track, desiredTxPx) {
  // READ all layout properties first
  const loop = track._segmentWidth || (track.scrollWidth / 2);
  const isLookbook = track.classList.contains('lookbook-track');
  // Lookbookの場合は、JavaScript関数から直接速度を取得（CSS適用前でも正しい値が取得できる）
  const durSec = isLookbook 
    ? 120 // CSSで120sに統一されているため、120sを使用
    : 50; // CSSで50sに統一されているため、50sを使用
  const dir = (track.dataset.direction || 'left').toLowerCase();

  // 希望位置を keyframes の可動範囲に正規化
  // left: 0 → -loop, right: -loop → 0 の範囲であれば OK
  let T = desiredTxPx;
  let progress;
  if (dir === 'left') {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    progress = (-T) / loop;                               // 0..1
  } else {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    progress = (T + loop) / loop;                         // 0..1
  }
  
  // WRITE after all reads
  track.style.animationDelay = `-${(progress * durSec).toFixed(4)}s`;
}

/** data-start / data-align に従って初期位置を合わせる */
function alignTrackStart(track) {
  const start = (track.dataset.start || '').toLowerCase();
  const align = (track.dataset.align || 'left').toLowerCase();
  const target = findImageBySuffix(track, start);
  if (!target) return;

  // READ all layout properties first
  const dir = (track.dataset.direction || 'left').toLowerCase();
  const isLookbook = track.classList.contains('lookbook-track');
  // CSSで速度が統一されているため、直接値を使用
  const dur  = isLookbook ? 120 : 50; // Lookbook: 120s, Collection: 50s
  const key  = isLookbook ? 'lookbook-scroll' : (dir === 'right' ? 'scroll-right' : 'scroll-left');
  const desired = computeDesiredTx(track, target, align);

  // WRITE all properties after reads
  if (isLookbook) {
    // LookbookはCSSで制御するため、インラインスタイルは削除
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    applyInitialDelay(track, desired);
  } else {
    // Collectionは固定値150sを使用（確実に統一）
    track.style.animation = `${key} 150s linear infinite`;
    track.style.animationPlayState = 'paused';
    applyInitialDelay(track, desired);
    track.style.animationPlayState = 'running';
  }
}
/* ===== /start alignment helpers ===== */

/* lazy-load フェードイン処理 */
function initLazyLoadFadeIn() {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  lazyImages.forEach(img => {
    if (img.hasAttribute('data-lcp')) return; // skip LCP
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
  
  // Collection 上段・下段（新構造対応）
  // Lookbook Trackは lookbook-interaction.js で初期化するため、ここでは Collection Track のみを取得
  const tracks = document.querySelectorAll('#collection .collection-track');
  console.log(`[INIT] Total tracks found: ${tracks.length}`);
  if (window.__QA_MEASURE_LOGS__) {
    console.log(`[INIT] Total tracks found: ${tracks.length}`);
  }
  
  tracks.forEach((track, index) => {
    console.log(`[INIT] Track ${index + 1} 初期化開始:`, {
      isCollection: track.classList.contains('collection-track'),
      isLookbook: track.classList.contains('lookbook-track'),
      className: track.className
    });
    
    // Lookbook Trackの場合は、lookbook-interaction.jsの初期化関数を使用
    if (track.classList.contains('lookbook-track')) {
      console.log(`[INIT] Track ${index + 1}: Lookbook Trackとして認識 - lookbook-interaction.jsで初期化`);
      
      // lookbook-interaction.jsのinitTrack関数を使用して初期化
      if (typeof window.initLookbookTrack === 'function') {
        console.log(`[INIT] Lookbook Track ${index + 1}: lookbook-interaction.jsのinitTrack関数を呼び出し`);
        try {
          window.initLookbookTrack(track);
          // イベントハンドラが設定されたか確認
          setTimeout(() => {
            if (!track._visibilityObserver || !track._scrollHandler) {
              console.warn(`[INIT] Lookbook Track ${index + 1}: イベントハンドラが設定されていません。`);
            } else {
              console.log(`[INIT] Lookbook Track ${index + 1}: イベントハンドラが正常に設定されました。`);
            }
          }, 200);
        } catch (error) {
          console.error(`[INIT] Lookbook Track ${index + 1}: 初期化エラー`, error);
          // エラー時はインラインスタイルを確実に削除（CSSで制御するため）
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          track.style.removeProperty('animation-duration');
          track.style.removeProperty('transform');
        }
      } else {
        console.log(`[INIT] Lookbook Track ${index + 1}: lookbook-interaction.jsのinitTrack関数が見つかりません。直接初期化します。`);
        // インラインスタイルを確実に削除（CSSで制御するため）
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
        track.style.removeProperty('animation-duration');
        track.style.removeProperty('transform');
      }
      return; // Lookbook Trackの場合はここで終了
    }
    
    // Collection Trackのみ初期化
    // 初期化時にdraggingクラスを確実に削除
    track.isDragging = false;
    track.classList.remove('dragging');
    
    // Collection Trackの場合、collection-interaction.jsの初期化関数を使用
    if (track.classList.contains('collection-track')) {
      console.log(`[INIT] Collection Track ${index + 1}: collection-interaction.jsで初期化`);
      
      // collection-interaction.jsのinitTrack関数を使用して初期化
      // ただし、initTrack関数内でstartAutoScrollが呼ばれるため、イベントハンドラは自動的に設定される
      if (typeof window.initCollectionTrack === 'function') {
        console.log(`[INIT] Collection Track ${index + 1}: collection-interaction.jsのinitTrack関数を呼び出し`);
        try {
          window.initCollectionTrack(track);
          // イベントハンドラが設定されたか確認（より長い待機時間で確認）
          setTimeout(() => {
            if (!track._visibilityObserver || !track._scrollHandler) {
              console.warn(`[INIT] Collection Track ${index + 1}: イベントハンドラが設定されていません。フォールバック処理を実行します。`);
              // フォールバック: collection-interaction.jsのstartAutoScrollを直接呼び出す
              if (typeof window.startCollectionAutoScroll === 'function') {
                console.log(`[INIT] Collection Track ${index + 1}: startCollectionAutoScrollを直接呼び出し`);
                window.startCollectionAutoScroll(track);
                // 再度確認
                setTimeout(() => {
                  if (!track._visibilityObserver || !track._scrollHandler) {
                    console.error(`[INIT] Collection Track ${index + 1}: フォールバック処理後もイベントハンドラが設定されていません。`);
                  } else {
                    console.log(`[INIT] Collection Track ${index + 1}: フォールバック処理でイベントハンドラが設定されました。`);
                  }
                }, 100);
              } else {
                console.error(`[INIT] Collection Track ${index + 1}: startCollectionAutoScroll関数が見つかりません。`);
              }
            } else {
              console.log(`[INIT] Collection Track ${index + 1}: イベントハンドラが正常に設定されました。`);
            }
          }, 200); // 100msから200msに延長
        } catch (error) {
          console.error(`[INIT] Collection Track ${index + 1}: 初期化エラー`, error);
          // エラー時は直接初期化
          ensureLoopWidth(track);
          centerTrack(track);
          initAutoScroll(track);
          alignTrackStart(track);
          pauseWhenOutOfView(track);
        }
      } else {
        console.log(`[INIT] Collection Track ${index + 1}: collection-interaction.jsのinitTrack関数が見つかりません。直接初期化します。`);
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
        
        // Collection Trackの場合、イベントハンドラを設定（即座に実行）
        console.log(`[INIT] Track ${index + 1} Collection判定:`, {
          hasCollectionClass: track.classList.contains('collection-track'),
          hasVisibilityObserver: !!track._visibilityObserver,
          hasScrollHandler: !!track._scrollHandler
        });
        
        console.log(`[INIT] Collection Track ${index + 1}: Collection Trackとして認識されました`);
        // 既に設定されている場合はスキップ
        if (track._visibilityObserver || track._scrollHandler) {
          console.log(`[INIT] Collection Track ${index + 1}: イベントハンドラは既に設定済み`);
        } else {
          console.log(`[INIT] Collection Track ${index + 1}: イベントハンドラを設定開始`);
          
          // 即座に実行（setTimeoutを削除）
          // IntersectionObserverを設定（スマホ/PC両対応）
          const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                if (track.classList.contains('dragging') && !track.isDragging) {
                  track.classList.remove('dragging');
                  track.isDragging = false;
                  console.log(`[INIT] Collection Track ${index + 1}: 画面内検知 - draggingクラスを削除`);
                }
                
                if (!track.isDragging) {
                  // CSSで完全に制御するため、インラインスタイルは削除
                  // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
                  track.style.removeProperty('animation');
                  track.style.removeProperty('animation-play-state');
                  track.style.removeProperty('animation-duration');
                  track.offsetHeight;
                  console.log(`[INIT] Collection Track ${index + 1}: 画面内検知 - アニメーション再開（CSSで制御）`);
                }
              }
            });
          }, { threshold: 0.1 });
          
          visibilityObserver.observe(track);
          track._visibilityObserver = visibilityObserver;
          console.log(`[INIT] Collection Track ${index + 1}: IntersectionObserver設定完了`);
          
          // スクロールハンドラを設定（スマホ/PC両対応）
          let scrollTimer;
          let lastScrollTop = 0;
          const scrollHandler = function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
              const collectionSection = document.getElementById('collection');
              if (collectionSection) {
                const rect = collectionSection.getBoundingClientRect();
                const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (isInViewport) {
                  if (track.classList.contains('dragging') && !track.isDragging) {
                    track.classList.remove('dragging');
                    track.isDragging = false;
                    console.log(`[INIT] Collection Track ${index + 1}: スクロール終了検知 - draggingクラスを削除`);
                  }
                  
                  if (!track.isDragging) {
                    // CSSで完全に制御するため、インラインスタイルは削除
                    // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
                    track.style.removeProperty('animation');
                    track.style.removeProperty('animation-play-state');
                    track.style.removeProperty('animation-duration');
                    track.offsetHeight;
                    console.log(`[INIT] Collection Track ${index + 1}: スクロール終了後、アニメーション再開（CSSで制御）`);
                  }
                }
              }
              lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            }, 300);
          };
          
          window.addEventListener('scroll', scrollHandler, { passive: true });
          track._scrollHandler = scrollHandler;
          console.log(`[INIT] Collection Track ${index + 1}: スクロールハンドラ設定完了`);
          console.log(`[INIT] Collection Track ${index + 1}: イベントハンドラ設定完了`);
        }
      }
    }
    
    // 初期化後に再度draggingクラスを確認して削除
    setTimeout(() => {
      if (track.classList.contains('dragging')) {
        track.classList.remove('dragging');
        track.isDragging = false;
        console.log(`[INIT] Track ${index + 1}: draggingクラスを削除`);
      }
      
      // Collection Trackの場合、アニメーションがnoneになっていないか確認
      if (track.classList.contains('collection-track')) {
        const computedAnimation = getComputedStyle(track).animation;
        if (computedAnimation === 'none' || !computedAnimation || computedAnimation.includes('none')) {
          // CSSで完全に制御するため、インラインスタイルは削除
          // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          track.style.removeProperty('animation-duration');
          track.offsetHeight;
          console.log(`[INIT] Track ${index + 1}: アニメーションを再設定（CSSで制御）`);
        }
      }
    }, 100);
    
    // Lookbookトラックの場合、インラインスタイルを確実に削除
    if (track.classList.contains('lookbook-track')) {
      // 複数回実行して確実に削除
      track.style.removeProperty('animation');
      track.style.removeProperty('animation-play-state');
      requestAnimationFrame(() => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      });
      setTimeout(() => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      }, 100);
    }
    
    if (window.__QA_MEASURE_LOGS__) {
      console.log(`[INIT] Track ${index + 1}: ${track.dataset.direction || 'left'} (${track.dataset.speed || '55'}s)`);
    }
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
        if (track.classList.contains('lookbook-track')) {
          // LookbookはCSSで完全に制御するため、インラインスタイルは削除
          // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          requestAnimationFrame(() => {
            track.style.removeProperty('animation');
            track.style.removeProperty('animation-play-state');
          });
          track.classList.remove('dragging');
          track.isDragging = false;
        } else {
          // CollectionはCSSで完全に制御するため、インラインスタイルは削除
          // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          track.style.removeProperty('animation-duration');
          track.classList.remove('dragging');
          track.isDragging = false;
        }
      });
    }, 200);
  });
  
  // ページ読み込み完了後にもインラインスタイルを削除（外部サイトからの遷移時も確実に実行）
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Lookbook Trackの処理
      document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
        // draggingクラスを確実に削除
        track.isDragging = false;
        track.classList.remove('dragging');
        // インラインスタイルを確実に削除（複数回実行）
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
        track.style.removeProperty('transform');
        requestAnimationFrame(() => {
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          track.style.removeProperty('transform');
          // リフローを強制してCSSアニメーションを再適用
          track.offsetHeight;
        });
        // CSSで完全に制御するため、データ属性の更新は不要
        // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
      });
      
      // Collection Trackのイベントハンドラを設定（DOMContentLoadedで設定されなかった場合のフォールバック）
      document.querySelectorAll('#collection .collection-track').forEach((track, index) => {
        if (!track._visibilityObserver || !track._scrollHandler) {
          console.log(`[LOAD] Collection Track ${index + 1}: イベントハンドラを設定（フォールバック）`, {
            hasVisibilityObserver: !!track._visibilityObserver,
            hasScrollHandler: !!track._scrollHandler,
            className: track.className
          });
          
          // IntersectionObserverを設定
          const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                if (track.classList.contains('dragging') && !track.isDragging) {
                  track.classList.remove('dragging');
                  track.isDragging = false;
                  console.log(`[LOAD] Collection Track ${index + 1}: 画面内検知 - draggingクラスを削除`);
                }
                
                if (!track.isDragging) {
                  // CSSで完全に制御するため、インラインスタイルは削除
                  // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
                  track.style.removeProperty('animation');
                  track.style.removeProperty('animation-play-state');
                  track.style.removeProperty('animation-duration');
                  track.offsetHeight;
                  console.log(`[LOAD] Collection Track ${index + 1}: 画面内検知 - アニメーション再開（CSSで制御）`);
                }
              }
            });
          }, { threshold: 0.1 });
          
          visibilityObserver.observe(track);
          track._visibilityObserver = visibilityObserver;
          
          // スクロールハンドラを設定
          let scrollTimer;
          let lastScrollTop = 0;
          const scrollHandler = function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
              const collectionSection = document.getElementById('collection');
              if (collectionSection) {
                const rect = collectionSection.getBoundingClientRect();
                const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (isInViewport) {
                  if (track.classList.contains('dragging') && !track.isDragging) {
                    track.classList.remove('dragging');
                    track.isDragging = false;
                    console.log(`[LOAD] Collection Track ${index + 1}: スクロール終了検知 - draggingクラスを削除`);
                  }
                  
                  if (!track.isDragging) {
                    // CSSで完全に制御するため、インラインスタイルは削除
                    // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
                    track.style.removeProperty('animation');
                    track.style.removeProperty('animation-play-state');
                    track.style.removeProperty('animation-duration');
                    track.offsetHeight;
                    console.log(`[LOAD] Collection Track ${index + 1}: スクロール終了後、アニメーション再開（CSSで制御）`);
                  }
                }
              }
              lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            }, 300);
          };
          
          window.addEventListener('scroll', scrollHandler, { passive: true });
          track._scrollHandler = scrollHandler;
          console.log(`[LOAD] Collection Track ${index + 1}: イベントハンドラ設定完了`);
        }
      });
    }, 500);
  });
  
  // 外部サイトからの遷移時も確実に初期化（リサイズ時にも再実行）
  let initTimeout;
  const reinitializeLookbook = () => {
    clearTimeout(initTimeout);
    initTimeout = setTimeout(() => {
      document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
        if (track.classList.contains('lookbook-track')) {
          // CSSで完全に制御するため、インラインスタイルは削除
          // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          requestAnimationFrame(() => {
            track.style.removeProperty('animation');
            track.style.removeProperty('animation-play-state');
          });
        }
      });
    }, 100);
  };
  
  // ページ可視性変更時にも再初期化（外部サイトからの遷移時に確実に実行）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      reinitializeLookbook();
    }
  });
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
