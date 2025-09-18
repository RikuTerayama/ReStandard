// Collection スワイプ・無限ループ機能（Lookbook同様）
document.addEventListener('DOMContentLoaded', function() {
  const collectionTop = document.querySelector('.collection-scroll-top');
  const collectionBottom = document.querySelector('.collection-scroll-bottom');
  
  // シームレス無限ループ実装（親幅×2まで複製）
  function ensureSeamlessLoop(track) {
    if (!track || track.dataset.loopReady === '1') return;
    const parent = track.parentElement;
    const items = Array.from(track.children);
    if (items.length === 0) return;

    // 一旦1周ぶんだけのDOMに揃える（HTML手動複製削除済み前提）
    const unique = items.slice(0, 20); // 1-20の画像のみ
    track.innerHTML = '';
    unique.forEach(el => track.appendChild(el.cloneNode(true)));

    // 親幅×2を満たすまでクローン追加（シームレス無限）
    const needWidth = parent.clientWidth * 2;
    while (track.scrollWidth < needWidth) {
      unique.forEach(el => track.appendChild(el.cloneNode(true)));
    }
    track.dataset.loopReady = '1';
  }
  
  // シームレス無限ループ設定
  ensureSeamlessLoop(collectionTop);
  ensureSeamlessLoop(collectionBottom);
  
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
        
        // 2秒後にアニメーション再開・CSS基準位置へ戻す
        setTimeout(() => {
          if (animationPaused) {
            container.style.animationPlayState = 'running';
            container.style.transform = ''; // CSS アニメ基準位置へ戻す
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
