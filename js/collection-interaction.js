// Collection クリック可能・双方向ドラッグ・リンクマッピング（Senior FE仕様）
document.addEventListener('DOMContentLoaded', function() {
  
  // JPG → URL マッピング
  const IMAGE_LINK_MAP = {
    '1.JPG': 'https://restandard.stores.jp/items/68a3416c225fded5de0dfb82',
    '2.JPG': 'https://restandard.stores.jp/items/68ac80478b0406e84acd6892',
    '5.JPG': 'https://restandard.stores.jp/items/68b089a53fed3c22dc1a6683',
    '6.JPG': 'https://restandard.stores.jp/items/68b10c2e3ffd8e02a5496586',
    '9.JPG': 'https://restandard.stores.jp/items/68b15163c49f18004ad13ce2',
    '25.JPG': 'https://restandard.stores.jp/items/68a346549b5b820cfb8b08f5',
    '27.JPG': 'https://restandard.stores.jp/items/68b1ea569183258f8a6e2ae2',
    '29.JPG': 'https://restandard.stores.jp/items/68add0cfd7091d99d698a8dc',
    '31.JPG': 'https://restandard.stores.jp/items/68ac83b759de6b1729a87a95',
    '32.JPG': 'https://restandard.stores.jp/items/68b12cbcefd70e2ccc94c52d'
  };
  
  // 重複防止ガード
  if (!window.__collectionDoubled) {
    window.__collectionDoubled = true;
    
    document.querySelectorAll('.collection-scroll-top, .collection-scroll-bottom').forEach(track => {
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
  
  // リンク埋め込み初期化（一度だけ実行）
  function initializeImageLinks() {
    document.querySelectorAll('.collection-track img').forEach(img => {
      const src = img.getAttribute('src');
      const filename = src ? src.split('/').pop() : '';
      
      if (IMAGE_LINK_MAP[filename] && !img.closest('a')) {
        const link = document.createElement('a');
        link.href = IMAGE_LINK_MAP[filename];
        link.target = '_blank';
        link.rel = 'noopener';
        
        // img を a でラップ
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);
      }
    });
  }
  
  // 二段同時表示の確認
  const collectionTop = document.querySelector('.collection-scroll-top');
  const collectionBottom = document.querySelector('.collection-scroll-bottom');
  
  if (collectionTop && collectionBottom) {
    console.info('[COLLECTION] 二段同時表示確認: OK');
    
    // インライン固定指定の強制削除
    [collectionTop, collectionBottom].forEach(track => {
      const row = track.closest('.collection-row');
      if (row) {
        // サイズ関連削除（CSS変数に委ねる）
        row.style.removeProperty('height');
        row.style.removeProperty('width');
        row.style.removeProperty('background');
        row.style.height = '';
        row.style.width = '';
      }
      
      // 画像のサイズ固定も削除
      const images = track.querySelectorAll('img');
      images.forEach(img => {
        img.style.removeProperty('height');
        img.style.removeProperty('width');
        img.style.removeProperty('object-fit');
        img.style.height = '';
        img.style.width = '';
        img.style.objectFit = '';
      });
    });
  } else {
    console.warn('[COLLECTION] 二段のうち片方が見つからない');
  }
  
  // Collection スワイプ & クリック共存機能
  function addCollectionSwipeSupport(container) {
    if (!container) return;
    
    let isDragging = false;
    let dragStarted = false;
    let startX = 0;
    let startY = 0;
    let animationPaused = false;
    const DRAG_THRESHOLD = 8; // 8px以上でドラッグ判定
    
    // タッチイベント（passive: false でpreventDefault制御可能）
    container.addEventListener('touchstart', (e) => {
      isDragging = true;
      dragStarted = false;
      container.style.cursor = 'grabbing';
      
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      
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
        animationPaused = true;
      }
      
      // ドラッグ開始後のみ preventDefault & transform更新
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        const moveX = (clientX - startX) * 1.5;
        container.style.transform = `translateX(${currentX + moveX}px)`;
        startX = clientX;
      }
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      // ドラッグ未開始（閾値以下）ならクリック許可
      if (!dragStarted) {
        console.info('[COLLECTION] タップ判定: リンク遷移許可');
        // e.preventDefault() しない → 通常遷移
      } else {
        console.info('[COLLECTION] ドラッグ判定: リンク遷移防止');
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging'); // dragging状態解除
      
      // アニメーション再開
      if (animationPaused) {
        setTimeout(() => {
          container.style.animationPlayState = 'running';
          // transform リセットは最小限（不自然な飛びを防ぐ）
          animationPaused = false;
        }, 1500);
      }
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
        container.classList.add('dragging'); // CSS制御用クラス
        animationPaused = true;
      }
      
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        const moveX = (e.clientX - startX) * 1.5;
        container.style.transform = `translateX(${currentX + moveX}px)`;
        startX = e.clientX;
      }
    });
    
    container.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      
      if (!dragStarted) {
        // クリック許可
        console.info('[COLLECTION] クリック判定: 通常遷移');
      } else {
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging'); // dragging状態解除
      
      if (animationPaused) {
        setTimeout(() => {
          container.style.animationPlayState = 'running';
          animationPaused = false;
        }, 1500);
      }
    });
    
    container.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        dragStarted = false;
        container.style.cursor = 'grab';
        container.classList.remove('dragging'); // dragging状態解除
        
        if (animationPaused) {
          setTimeout(() => {
            container.style.animationPlayState = 'running';
            animationPaused = false;
          }, 1500);
        }
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
        container.classList.add('dragging'); // CSS制御用クラス
        animationPaused = true;
      }
      
      if (dragStarted) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        const moveX = (e.clientX - startX) * 1.5;
        container.style.transform = `translateX(${currentX + moveX}px)`;
        startX = e.clientX;
      }
    });
    
    container.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      
      if (!dragStarted) {
        // クリック許可
        console.info('[COLLECTION] ポインタークリック判定: 通常遷移');
      } else {
        e.preventDefault();
      }
      
      isDragging = false;
      dragStarted = false;
      container.style.cursor = 'grab';
      container.classList.remove('dragging'); // dragging状態解除
      container.releasePointerCapture(e.pointerId);
      
      if (animationPaused) {
        setTimeout(() => {
          container.style.animationPlayState = 'running';
          animationPaused = false;
        }, 1500);
      }
    });
    
    container.addEventListener('pointercancel', (e) => {
      if (isDragging) {
        isDragging = false;
        dragStarted = false;
        container.style.cursor = 'grab';
        container.classList.remove('dragging');
        container.releasePointerCapture(e.pointerId);
        
        if (animationPaused) {
          setTimeout(() => {
            container.style.animationPlayState = 'running';
            animationPaused = false;
          }, 1500);
        }
      }
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // 上下段ともスワイプ有効化
  addCollectionSwipeSupport(collectionTop);
  addCollectionSwipeSupport(collectionBottom); // 下段追加
  
  // リンク埋め込み初期化（最後に一度だけ実行）
  initializeImageLinks();
  
  // アニメーション継続保証
  setTimeout(() => {
    [collectionTop, collectionBottom].forEach(track => {
      if (track) {
        track.style.animationPlayState = 'running';
      }
    });
  }, 100);
});
