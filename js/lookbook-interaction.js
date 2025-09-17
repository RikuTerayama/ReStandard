// Lookbook ドラッグ/スワイプ機能
document.addEventListener('DOMContentLoaded', function() {
  const lookbookContainer = document.querySelector('.lookbook-container');
  const lookbookTrack = document.querySelector('.lookbook-track');
  
  if (!lookbookContainer || !lookbookTrack) return;
  
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let animationPaused = false;
  
  // マウス/タッチイベント
  const events = {
    start: ['mousedown', 'touchstart'],
    move: ['mousemove', 'touchmove'],
    end: ['mouseup', 'touchend', 'mouseleave']
  };
  
  // ドラッグ開始
  events.start.forEach(event => {
    lookbookContainer.addEventListener(event, (e) => {
      isDragging = true;
      lookbookContainer.style.cursor = 'grabbing';
      
      // アニメーション一時停止
      lookbookTrack.style.animationPlayState = 'paused';
      animationPaused = true;
      
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      startX = clientX;
      
      e.preventDefault();
    });
  });
  
  // ドラッグ中
  events.move.forEach(event => {
    lookbookContainer.addEventListener(event, (e) => {
      if (!isDragging) return;
      
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const deltaX = (clientX - startX) * 2; // 感度調整
      
      // 現在のtransform値を取得して調整
      const currentTransform = getComputedStyle(lookbookTrack).transform;
      let currentX = 0;
      
      if (currentTransform && currentTransform !== 'none') {
        const matrix = currentTransform.match(/matrix\((.+)\)/);
        if (matrix) {
          currentX = parseFloat(matrix[1].split(',')[4]);
        }
      }
      
      lookbookTrack.style.transform = `translateX(${currentX + deltaX}px)`;
      startX = clientX;
      
      e.preventDefault();
    });
  });
  
  // ドラッグ終了
  events.end.forEach(event => {
    lookbookContainer.addEventListener(event, () => {
      if (!isDragging) return;
      
      isDragging = false;
      lookbookContainer.style.cursor = 'grab';
      
      // 3秒後にアニメーション再開
      setTimeout(() => {
        if (animationPaused) {
          lookbookTrack.style.animationPlayState = 'running';
          animationPaused = false;
        }
      }, 3000);
    });
  });
  
  // ホバー時の一時停止（PCのみ）
  if (window.matchMedia('(hover: hover)').matches) {
    lookbookContainer.addEventListener('mouseenter', () => {
      if (!isDragging) {
        lookbookTrack.style.animationPlayState = 'paused';
      }
    });
    
    lookbookContainer.addEventListener('mouseleave', () => {
      if (!isDragging && !animationPaused) {
        lookbookTrack.style.animationPlayState = 'running';
      }
    });
  }
});
