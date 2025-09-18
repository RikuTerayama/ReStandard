// Collection 二段同時表示・無限ループ機能（Cursor仕様）
document.addEventListener('DOMContentLoaded', function() {
  
  // 重複防止ガード
  if (!window.__collectionDoubled) {
    window.__collectionDoubled = true;
    
    document.querySelectorAll('.collection-track').forEach(track => {
      const items = Array.from(track.children);
      
      // すでに複製済みならスキップ
      const alreadyDoubled = items.some(el => el.dataset?.cloned === '1');
      if (alreadyDoubled) return;
      
      items.forEach(node => {
        const clone = node.cloneNode(true);
        clone.dataset.cloned = '1';
        track.appendChild(clone);
      });
    });
  }
  
  // 二段同時表示の確認
  const collectionTop = document.querySelector('.collection-track.collection-scroll-top');
  const collectionBottom = document.querySelector('.collection-track.collection-scroll-bottom');
  
  if (collectionTop && collectionBottom) {
    console.info('[COLLECTION] 二段同時表示確認: OK');
    
    // display:none / visibility:hidden の強制削除
    [collectionTop, collectionBottom].forEach(track => {
      const row = track.closest('.collection-row');
      if (row) {
        row.style.removeProperty('display');
        row.style.removeProperty('visibility');
        row.style.removeProperty('opacity');
        row.style.removeProperty('position');
        row.style.display = '';
        row.style.visibility = '';
        row.style.opacity = '';
      }
      
      track.style.removeProperty('display');
      track.style.removeProperty('visibility');
      track.style.removeProperty('opacity');
      track.style.display = '';
      track.style.visibility = '';
      track.style.opacity = '';
    });
  } else {
    console.warn('[COLLECTION] 二段のうち片方が見つからない');
  }
  
  // スワイプ機能追加（両段対応）
  function addCollectionSwipeSupport(container) {
    if (!container) return;
    
    let isDragging = false;
    let startX = 0;
    let animationPaused = false;
    
    const events = {
      start: ['mousedown', 'touchstart'],
      move: ['mousemove', 'touchmove'],
      end: ['mouseup', 'touchend', 'mouseleave']
    };
    
    // ドラッグ開始
    events.start.forEach(event => {
      container.addEventListener(event, (e) => {
        isDragging = true;
        container.style.cursor = 'grabbing';
        
        // アニメーション一時停止
        container.style.animationPlayState = 'paused';
        animationPaused = true;
        
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        startX = clientX;
        
        e.preventDefault();
      });
    });
    
    // ドラッグ中
    events.move.forEach(event => {
      container.addEventListener(event, (e) => {
        if (!isDragging) return;
        
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const deltaX = (clientX - startX) * 1.5;
        
        // 現在のtransform値を取得して調整
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        container.style.transform = `translateX(${currentX + deltaX}px)`;
        startX = clientX;
        
        e.preventDefault();
      });
    });
    
    // ドラッグ終了
    events.end.forEach(event => {
      container.addEventListener(event, () => {
        if (!isDragging) return;
        
        isDragging = false;
        container.style.cursor = 'grab';
        
        // 1.5秒後にアニメーション再開
        setTimeout(() => {
          if (animationPaused) {
            container.style.animationPlayState = 'running';
            container.style.transform = '';
            animationPaused = false;
          }
        }, 1500);
        
        // さらに予備処理で確実に再開
        setTimeout(() => {
          container.style.animationPlayState = 'running';
        }, 2500);
      });
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // 上下段にスワイプ機能を追加
  addCollectionSwipeSupport(collectionTop);
  addCollectionSwipeSupport(collectionBottom);
  
  // アニメーション継続保証（強制実行）
  setTimeout(() => {
    [collectionTop, collectionBottom].forEach(track => {
      if (track) {
        track.style.animationPlayState = 'running';
      }
    });
  }, 100);
});
