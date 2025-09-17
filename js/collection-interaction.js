// Collection スワイプ・無限ループ機能
document.addEventListener('DOMContentLoaded', function() {
  const collectionTop = document.querySelector('.collection-scroll-top');
  const collectionBottom = document.querySelector('.collection-scroll-bottom');
  
  // 無限ループのための画像複製
  function duplicateImages(container) {
    if (!container) return;
    const images = container.querySelectorAll('img, a');
    images.forEach(img => {
      const clone = img.cloneNode(true);
      container.appendChild(clone);
    });
  }
  
  // 画像を3セット複製（無限ループ用）
  duplicateImages(collectionTop);
  duplicateImages(collectionBottom);
  duplicateImages(collectionTop);
  duplicateImages(collectionBottom);
  
  // スワイプ機能追加
  function addSwipeSupport(container) {
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
        const deltaX = (clientX - startX) * 1.5; // 感度調整
        
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
        
        // 2秒後にアニメーション再開
        setTimeout(() => {
          if (animationPaused) {
            container.style.animationPlayState = 'running';
            animationPaused = false;
          }
        }, 2000);
      });
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // 上下段にスワイプ機能を追加
  addSwipeSupport(collectionTop);
  addSwipeSupport(collectionBottom);
});
