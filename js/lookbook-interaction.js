// Lookbook 横スクロール・無限ループ機能
document.addEventListener('DOMContentLoaded', function() {
  const lookbookTrack = document.querySelector('.lookbook-track');
  
  // シームレス無限ループ実装
  function ensureLookbookLoop(track) {
    if (!track || track.dataset.loopReady === '1') return;
    const items = Array.from(track.children);
    if (items.length === 0) return;

    // 元の画像を2回複製してシームレス無限ループ
    const originalItems = items.slice();
    originalItems.forEach(item => track.appendChild(item.cloneNode(true)));
    
    track.dataset.loopReady = '1';
  }
  
  // Lookbook無限ループ設定
  ensureLookbookLoop(lookbookTrack);
  
  // スワイプ機能追加（Collection同様）
  function addLookbookSwipeSupport(container) {
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
      });
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // Lookbookにスワイプ機能を追加
  addLookbookSwipeSupport(lookbookTrack);
});
