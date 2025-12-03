/* =========================================================
   Collection Interaction Handler - ドラッグ挙動とオートフローの連携
   要件④: ドラッグ終了後、その位置から自動スクロールを再開
   ========================================================= */

(function() {
  'use strict';

  console.log('[Collection Interaction] スクリプト読み込み開始');

  /**
   * Collection トラックのドラッグ処理を初期化
   * ドラッグ終了後、その位置から自動スクロールを再開する
   */
  function initCollectionTracks() {
    const tracks = document.querySelectorAll('#collection .collection-track');
    
    console.log(`[Collection Interaction] ${tracks.length} tracks found`);
    
    tracks.forEach((track, index) => {
      // 既に初期化されている場合はスキップ
      if (track._collectionInitialized) {
        console.log(`[Collection Interaction] Track ${index + 1}: 既に初期化済み`);
        return;
      }
      
      console.log(`[Collection Interaction] Track ${index + 1}: 初期化開始`);
      attachCollectionControls(track);
      track._collectionInitialized = true;
    });
  }

  /**
   * Collection トラックのコントロールを設定
   * ドラッグ中は自動スクロールを一時停止し、ドラッグ終了後はその位置から再開
   */
  function attachCollectionControls(track) {
    let startX = 0;
    let startTx = 0;
    let isDragging = false;
    let moved = 0;
    let longPressTimer = null;
    
    // 現在のtranslateX値を取得
    function getCurrentTranslateX(el) {
      const transform = getComputedStyle(el).transform;
      if (transform === 'none') return 0;
      const matrix = new DOMMatrix(transform);
      return matrix.m41;
    }
    
    // アニメーションの現在位置を取得して、その位置から再開するためのdelayを計算
    function resumeAutoScroll(el) {
      const segmentWidth = el._segmentWidth || 0;
      if (segmentWidth === 0) return;
      
      const currentTx = getCurrentTranslateX(el);
      const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
      const progress = normalizedTx / segmentWidth;
      
      // Collectionのアニメーション速度を取得（CSSから）
      const computedStyle = getComputedStyle(el);
      const animationName = computedStyle.animationName;
      let duration = 50; // デフォルト値
      
      // CSSアニメーションのdurationを取得
      if (animationName && animationName !== 'none') {
        const animationDuration = computedStyle.animationDuration;
        if (animationDuration) {
          duration = parseFloat(animationDuration) * (animationDuration.includes('ms') ? 1 : 1000);
        }
      }
      
      // 現在位置から再開するための負のdelayを計算
      const delay = -progress * duration;
      
      // アニメーションを一時停止してから、新しいdelayで再開
      el.style.animationPlayState = 'paused';
      el.style.animationDelay = `${delay}ms`;
      el.style.animationPlayState = 'running';
      
      console.log(`[Collection Interaction] アニメーション再開: delay=${delay}ms, progress=${progress.toFixed(2)}`);
    }
    
    const onDown = (e) => {
      // PC版ではマウスイベントを無視（タッチのみ対応）
      if (e.type === 'mousedown' || e.type === 'pointerdown') {
        // タッチデバイスでない場合はスキップ
        if (!('ontouchstart' in window)) {
          return;
        }
      }
      
      // リンク要素がクリックされた場合は即座にナビゲーションを許可
      if (e.target.closest('a')) {
        return;
      }
      
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startTx = getCurrentTranslateX(track);
      moved = 0;
      
      // 長押しタイマーを開始（500ms）
      longPressTimer = setTimeout(() => {
        isDragging = true;
        track.isDragging = true;
        track.classList.add('dragging');
        // ドラッグ中は自動スクロールを一時停止
        track.style.animationPlayState = 'paused';
      }, 500);
      
      // リンク要素の場合はpreventDefaultを避ける
      if (!e.target.closest('a')) {
        e.preventDefault();
      }
    };
    
    const onMove = (e) => {
      // PC版ではマウスイベントを無視
      if (e.type === 'mousemove' || e.type === 'pointermove') {
        if (!('ontouchstart' in window)) {
          return;
        }
      }
      
      if (!isDragging && longPressTimer) {
        const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const dx = currentX - startX;
        moved += Math.abs(dx);
        
        // 10px以上移動したらドラッグ開始
        if (moved > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          isDragging = true;
          track.isDragging = true;
          track.classList.add('dragging');
          // ドラッグ中は自動スクロールを一時停止
          track.style.animationPlayState = 'paused';
        }
      }
      
      if (isDragging) {
        const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const dx = currentX - startX;
        // ドラッグ中はtransformでトラックを移動
        track.style.transform = `translateX(${startTx + dx}px)`;
        e.preventDefault();
      }
    };
    
    const onUp = (e) => {
      // PC版ではマウスイベントを無視
      if (e.type === 'mouseup' || e.type === 'pointerup') {
        if (!('ontouchstart' in window)) {
          return;
        }
      }
      
      // 長押しタイマーをクリア
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      if (!isDragging) {
        // ドラッグしていない場合、クリックとして処理
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href')?.trim().toLowerCase() || '';
          if (href && href !== '#' && !href.startsWith('javascript')) {
            // 通常のリンクの場合はそのまま遷移
            return;
          }
        }
        moved = 0;
        return;
      }
      
      isDragging = false;
      track.isDragging = false;
      track.classList.remove('dragging');
      
      // 5px未満=クリック：リンク遷移
      if (moved < 5) {
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href')?.trim().toLowerCase() || '';
          if (href && href !== '#' && !href.startsWith('javascript')) {
            // 通常のリンクの場合はそのまま遷移
            return;
          }
        }
        // クリックの場合は元の位置から再開
        track.style.removeProperty('transform');
        resumeAutoScroll(track);
        moved = 0;
        return;
      }
      
      // 8px以上=ドラッグ：離した位置から自動スクロールを再開
      e.preventDefault();
      e.stopPropagation();
      
      // 要件④: ドラッグ終了後、その位置から自動スクロールを再開
      resumeAutoScroll(track);
      
      moved = 0;
    };
    
    // イベントリスナーを追加
    const usePassive = window.__PERF_FLAGS?.passiveListeners !== false;
    
    track.addEventListener('pointerdown', onDown, { passive: false });
    track.addEventListener('pointermove', onMove, { passive: false });
    track.addEventListener('pointerup', onUp);
    track.addEventListener('touchstart', onDown, { passive: usePassive ? true : false });
    track.addEventListener('touchmove', onMove, { passive: false });
    track.addEventListener('touchend', onUp);
  }

  // グローバルに公開
  window.initCollectionTracks = initCollectionTracks;

  // DOMContentLoadedで初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Collection Marqueeの初期化を待ってから実行
      setTimeout(() => {
        initCollectionTracks();
      }, 100);
    });
  } else {
    setTimeout(() => {
      initCollectionTracks();
    }, 100);
  }

})();

