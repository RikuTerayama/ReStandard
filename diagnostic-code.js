// ===== 診断用コード =====
// このコードをブラウザのコンソールに貼り付けて実行してください

(function() {
  console.log('=== 診断開始 ===');
  console.log('実行時刻:', new Date().toISOString());
  
  // ===== 環境情報 =====
  console.log('\n【環境情報】');
  const envInfo = {
    userAgent: navigator.userAgent,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    isInstagramWebView: /Instagram/i.test(navigator.userAgent) || /FBAN|FBAV/i.test(navigator.userAgent),
    isSafari: /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent),
    isChrome: /Chrome/i.test(navigator.userAgent),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    documentReadyState: document.readyState
  };
  console.log(envInfo);
  
  // ===== Collection Track 診断 =====
  console.log('\n【Collection Track 診断】');
  const collectionTracks = document.querySelectorAll('.collection-track');
  console.log(`Collection Track数: ${collectionTracks.length}`);
  
  collectionTracks.forEach((track, index) => {
    const computed = getComputedStyle(track);
    const rect = track.getBoundingClientRect();
    const inlineAnimation = track.style.animation;
    const inlineDuration = track.style.animationDuration;
    const inlinePlayState = track.style.animationPlayState;
    
    console.log(`\n--- Collection Track ${index + 1} ---`);
    console.log('【基本情報】', {
      datasetSpeed: track.dataset.speed,
      datasetBaseSpeed: track.dataset.baseSpeed,
      datasetDirection: track.dataset.direction,
      hasDraggingClass: track.classList.contains('dragging'),
      isDragging: track.isDragging,
      isInViewport: rect.top < window.innerHeight && rect.bottom > 0,
      trackWidth: rect.width,
      trackHeight: rect.height
    });
    
    console.log('【アニメーション設定】', {
      computedAnimation: computed.animation,
      computedDuration: computed.animationDuration,
      computedPlayState: computed.animationPlayState,
      computedName: computed.animationName,
      inlineAnimation: inlineAnimation || '(なし)',
      inlineDuration: inlineDuration || '(なし)',
      inlinePlayState: inlinePlayState || '(なし)',
      hasInlineStyle: !!(inlineAnimation || inlineDuration || inlinePlayState)
    });
    
    // CSS変数の確認
    const rootStyle = getComputedStyle(document.documentElement);
    console.log('【CSS変数】', {
      collectionSpeed: rootStyle.getPropertyValue('--collection-speed').trim() || '(未設定)',
      lookbookSpeed: rootStyle.getPropertyValue('--lookbook-speed').trim() || '(未設定)'
    });
    
    // 画像情報
    const img = track.querySelector('img');
    if (img) {
      const imgRect = img.getBoundingClientRect();
      const imgComputed = getComputedStyle(img);
      console.log('【画像情報】', {
        width: imgRect.width,
        height: imgRect.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        maxWidth: imgComputed.maxWidth,
        maxHeight: imgComputed.maxHeight,
        objectFit: imgComputed.objectFit,
        display: imgComputed.display,
        visibility: imgComputed.visibility,
        opacity: imgComputed.opacity,
        loading: img.getAttribute('loading') || '(なし)',
        src: img.src.substring(0, 50) + '...'
      });
    }
    
    // イベントハンドラの確認
    console.log('【イベントハンドラ】', {
      hasVisibilityObserver: !!track._visibilityObserver,
      hasScrollHandler: !!track._scrollHandler,
      hasVisibilityHandler: !!track._visibilityHandler
    });
  });
  
  // ===== Lookbook Track 診断 =====
  console.log('\n【Lookbook Track 診断】');
  const lookbookTracks = document.querySelectorAll('.lookbook-track');
  console.log(`Lookbook Track数: ${lookbookTracks.length}`);
  
  lookbookTracks.forEach((track, index) => {
    const computed = getComputedStyle(track);
    const rect = track.getBoundingClientRect();
    const inlineAnimation = track.style.animation;
    const inlineDuration = track.style.animationDuration;
    const inlinePlayState = track.style.animationPlayState;
    
    console.log(`\n--- Lookbook Track ${index + 1} ---`);
    console.log('【基本情報】', {
      datasetSpeed: track.dataset.speed,
      datasetBaseSpeed: track.dataset.baseSpeed,
      hasDraggingClass: track.classList.contains('dragging'),
      isDragging: track.isDragging,
      isInViewport: rect.top < window.innerHeight && rect.bottom > 0,
      trackWidth: rect.width,
      trackHeight: rect.height
    });
    
    console.log('【アニメーション設定】', {
      computedAnimation: computed.animation,
      computedDuration: computed.animationDuration,
      computedPlayState: computed.animationPlayState,
      computedName: computed.animationName,
      inlineAnimation: inlineAnimation || '(なし)',
      inlineDuration: inlineDuration || '(なし)',
      inlinePlayState: inlinePlayState || '(なし)',
      hasInlineStyle: !!(inlineAnimation || inlineDuration || inlinePlayState)
    });
    
    // 画像情報
    const img = track.querySelector('img');
    if (img) {
      const imgRect = img.getBoundingClientRect();
      const imgComputed = getComputedStyle(img);
      console.log('【画像情報】', {
        width: imgRect.width,
        height: imgRect.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        maxWidth: imgComputed.maxWidth,
        maxHeight: imgComputed.maxHeight,
        minWidth: imgComputed.minWidth,
        maxWidthComputed: imgComputed.maxWidth,
        objectFit: imgComputed.objectFit,
        display: imgComputed.display,
        visibility: imgComputed.visibility,
        opacity: imgComputed.opacity,
        widthComputed: imgComputed.width,
        heightComputed: imgComputed.height
      });
    }
    
    // コンテナ情報
    const container = track.closest('.lookbook-container');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const containerComputed = getComputedStyle(container);
      console.log('【コンテナ情報】', {
        width: containerRect.width,
        height: containerRect.height,
        minHeight: containerComputed.minHeight,
        minBlockSize: containerComputed.minBlockSize,
        maxHeight: containerComputed.maxHeight,
        overflow: containerComputed.overflow,
        alignItems: containerComputed.alignItems,
        paddingTop: containerComputed.paddingTop,
        paddingBottom: containerComputed.paddingBottom,
        display: containerComputed.display
      });
    }
    
    // イベントハンドラの確認
    console.log('【イベントハンドラ】', {
      hasVisibilityObserver: !!track._visibilityObserver,
      hasScrollHandler: !!track._scrollHandler,
      hasVisibilityHandler: !!track._visibilityHandler
    });
  });
  
  // ===== CSSルールの確認 =====
  console.log('\n【CSSルール確認】');
  const collectionTrack = document.querySelector('.collection-track');
  const lookbookTrack = document.querySelector('.lookbook-track');
  
  if (collectionTrack) {
    const collectionComputed = getComputedStyle(collectionTrack);
    console.log('Collection Track CSS:', {
      animation: collectionComputed.animation,
      animationDuration: collectionComputed.animationDuration,
      animationName: collectionComputed.animationName,
      animationPlayState: collectionComputed.animationPlayState
    });
  }
  
  if (lookbookTrack) {
    const lookbookComputed = getComputedStyle(lookbookTrack);
    console.log('Lookbook Track CSS:', {
      animation: lookbookComputed.animation,
      animationDuration: lookbookComputed.animationDuration,
      animationName: lookbookComputed.animationName,
      animationPlayState: lookbookComputed.animationPlayState
    });
  }
  
  // ===== メディアクエリの確認 =====
  console.log('\n【メディアクエリ確認】');
  const mediaQueries = {
    maxWidth480: window.matchMedia('(max-width: 480px)').matches,
    minWidth481MaxWidth1024: window.matchMedia('(min-width: 481px) and (max-width: 1024px)').matches,
    minWidth1025: window.matchMedia('(min-width: 1025px)').matches,
    supportsWebkitTouchCallout: CSS.supports('-webkit-touch-callout', 'none')
  };
  console.log(mediaQueries);
  
  // ===== スクロールイベントの確認 =====
  console.log('\n【スクロールイベント確認】');
  let scrollEventCount = 0;
  const scrollHandler = () => {
    scrollEventCount++;
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });
  
  setTimeout(() => {
    console.log('スクロールイベント数（3秒間）:', scrollEventCount);
    window.removeEventListener('scroll', scrollHandler);
  }, 3000);
  
  console.log('\n=== 診断完了 ===');
  console.log('※ スクロールイベントの確認は3秒後に表示されます');
  console.log('※ この結果をコピーして共有してください');
})();

