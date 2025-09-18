// Lookbook 双方向ドラッグ安定化・クラス制御（Senior FE仕様）
document.addEventListener('DOMContentLoaded', function() {
  console.log('[LOOKBOOK] 唯一初期化者として開始');
  
  const lookbookTrack = document.querySelector('.lookbook-track');
  
  if (!lookbookTrack) {
    console.warn('[LOOKBOOK] Track not found');
    return;
  }
  
  // Lookbook独立初期化: 複製→アニメ→ドラッグ
  ensureLookbookLoop();
  
  function ensureLookbookLoop() {
    const images = Array.from(lookbookTrack.querySelectorAll('img'));
    if (images.length === 0) return;
    
    // 不足時の拡張複製（もう1セット）
    const currentItems = lookbookTrack.children.length;
    const minRequired = images.length * 2; // 最低2周分
    
    if (currentItems < minRequired) {
      images.forEach(img => {
        const clone = img.cloneNode(true);
        clone.dataset.lookbookCloned = '1';
        lookbookTrack.appendChild(clone);
      });
      console.log(`[LOOKBOOK] 拡張複製完了: ${images.length}個追加`);
    }
    
    // Y中央維持のための初期transform設定
    if (!lookbookTrack.style.transform.includes('translateY')) {
      lookbookTrack.style.transform = 'translate3d(0, -50%, 0)';
    }
  }
  
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
  
  // Lookbook 双方向ドラッグ機能（クリック共存・draggingクラス制御）
  function addLookbookSwipeSupport(container) {
    if (!container) return;
    
    let isDragging = false;
    let dragStarted = false;
    let startX = 0;
    const DRAG_THRESHOLD = 8; // 8px以上でドラッグ判定
    
    // タッチイベント（passive: false でpreventDefault制御可能）
    container.addEventListener('touchstart', (e) => {
      isDragging = true;
      dragStarted = false;
      container.style.cursor = 'grabbing';
      
      startX = e.touches[0].clientX;
      
      // start では preventDefault しない（クリック温存）
    }, { passive: false });
    
    container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      const clientX = e.touches[0].clientX;
      const deltaX = Math.abs(clientX - startX);
      
      // 閾値超過でドラッグ開始
      if (deltaX > DRAG_THRESHOLD && !dragStarted) {
        dragStarted = true;
        container.classList.add('dragging'); // CSS制御用クラス
      }
      
      // ドラッグ開始後のみ preventDefault & transform更新
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix3d\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[12]);
          } else {
            const matrix2d = currentTransform.match(/matrix\((.+)\)/);
            if (matrix2d) {
              currentX = parseFloat(matrix2d[1].split(',')[4]);
            }
          }
        }
        
        const moveX = (clientX - startX) * 1.5;
        container.style.transform = `translate3d(${currentX + moveX}px, -50%, 0)`;
        startX = clientX;
      }
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      // ドラッグ未開始（閾値以下）ならクリック許可
      if (!dragStarted) {
        console.info('[LOOKBOOK] タップ判定: 通常動作許可');
        // e.preventDefault() しない
      } else {
        console.info('[LOOKBOOK] ドラッグ判定');
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging'); // dragging状態解除
      
      // 自然な再開（数百ms遅延）
      setTimeout(() => {
        container.style.transform = 'translateY(-50%)'; // Y中央維持
      }, 300);
    }, { passive: false });
    
    // マウスイベント（PC用・同様のロジック）
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStarted = false;
      container.style.cursor = 'grabbing';
      
      startX = e.clientX;
      
      // start では preventDefault しない
    });
    
    container.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = Math.abs(e.clientX - startX);
      
      if (deltaX > DRAG_THRESHOLD && !dragStarted) {
        dragStarted = true;
        container.classList.add('dragging');
      }
      
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix3d\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[12]);
          } else {
            const matrix2d = currentTransform.match(/matrix\((.+)\)/);
            if (matrix2d) {
              currentX = parseFloat(matrix2d[1].split(',')[4]);
            }
          }
        }
        
        const moveX = (e.clientX - startX) * 1.5;
        container.style.transform = `translate3d(${currentX + moveX}px, -50%, 0)`;
        startX = e.clientX;
      }
    });
    
    container.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      
      if (!dragStarted) {
        // クリック許可
        console.info('[LOOKBOOK] クリック判定: 通常動作');
      } else {
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging');
      
      setTimeout(() => {
        container.style.transform = 'translateY(-50%)';
      }, 300);
    });
    
    container.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        dragStarted = false;
        container.style.cursor = 'grab';
        container.classList.remove('dragging');
        
        setTimeout(() => {
          container.style.transform = 'translateY(-50%)';
        }, 300);
      }
    });
    
    // ポインターイベント（setPointerCapture使用）
    container.addEventListener('pointerdown', (e) => {
      isDragging = true;
      dragStarted = false;
      container.style.cursor = 'grabbing';
      container.setPointerCapture(e.pointerId);
      
      startX = e.clientX;
      
      // start では preventDefault しない
    });
    
    container.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      
      const deltaX = Math.abs(e.clientX - startX);
      
      if (deltaX > DRAG_THRESHOLD && !dragStarted) {
        dragStarted = true;
        container.classList.add('dragging');
      }
      
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix3d\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[12]);
          } else {
            const matrix2d = currentTransform.match(/matrix\((.+)\)/);
            if (matrix2d) {
              currentX = parseFloat(matrix2d[1].split(',')[4]);
            }
          }
        }
        
        const moveX = (e.clientX - startX) * 1.5;
        container.style.transform = `translate3d(${currentX + moveX}px, -50%, 0)`;
        startX = e.clientX;
      }
    });
    
    container.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      
      if (!dragStarted) {
        console.info('[LOOKBOOK] ポインタークリック判定: 通常動作');
      } else {
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging');
      container.releasePointerCapture(e.pointerId);
      
      setTimeout(() => {
        container.style.transform = 'translateY(-50%)';
      }, 300);
    });
    
    container.addEventListener('pointercancel', (e) => {
      if (isDragging) {
        isDragging = false;
        dragStarted = false;
        container.style.cursor = 'grab';
        container.classList.remove('dragging');
        container.releasePointerCapture(e.pointerId);
        
        setTimeout(() => {
          container.style.transform = 'translateY(-50%)';
        }, 300);
      }
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // Lookbook独立アニメ起動（init-sections.js から分離）
  if (lookbookTrack) {
    lookbookTrack.style.animation = 'lookbook-scroll 40s linear infinite';
    
    // ホバー停止（pointer有デバイスのみ）
    if (window.matchMedia('(hover: hover)').matches) {
      lookbookTrack.addEventListener('mouseenter', () => {
        lookbookTrack.style.animationPlayState = 'paused';
      });
      lookbookTrack.addEventListener('mouseleave', () => {
        lookbookTrack.style.animationPlayState = 'running';
      });
    }
    
    // prefers-reduced-motion 対応
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lookbookTrack.style.animation = 'none';
    }
  }
  
  // Lookbookスワイプ機能追加
  addLookbookSwipeSupport(lookbookTrack);
  
  console.log('[LOOKBOOK] 独立初期化完了 - 複製・アニメ・ドラッグ');
});
