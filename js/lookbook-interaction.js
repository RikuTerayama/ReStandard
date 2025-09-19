// Lookbook 中央維持 + 双方向ドラッグ + 連続スクロール

document.addEventListener('DOMContentLoaded', function() {
  
  // 新構造対応 - .lookbook-track統一セレクタ
  const track = document.querySelector('.lookbook-track');
  if (!track) {
    console.warn('[LOOKBOOK] Track not found');
    return;
  }

  // 連続スクロール用に .lookbook-track 末尾へ先頭の要素を複製して幅を確保
  const items = Array.from(track.children);
  let width = 0, i = 0;
  while (width < track.scrollWidth / 2 && i < items.length) {
    const clone = items[i].cloneNode(true);
    track.appendChild(clone);
    width += items[i].getBoundingClientRect().width;
    i++;
  }
  console.log(`[LOOKBOOK] 連続スクロール幅確保: ${i}個複製`);

  // Collection と同等のドラッグ処理（中央維持）
  let startX = 0, currentX = 0, dragging = false, moved = 0;

  const down = e => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    startX = currentX = x;
    moved = 0; dragging = true;
    track.classList.add('dragging'); // CSS でアニメ停止
  };

  const move = e => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - currentX; currentX = x; moved += Math.abs(dx);
    
    // translateX を相対移動（Y座標0・画像切れ防止）
    const m = getComputedStyle(track).transform;
    let baseX = 0;
    if (m !== 'none') {
      const matrix = new DOMMatrix(m);
      baseX = matrix.m41;
    }
    track.style.transform = `translate3d(${baseX + dx}px, 0, 0)`; // Y座標0に変更
  };

  const up = e => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging'); // アニメ再開
    
    if (moved < 8) return; // 8px未満はクリック許容
    e.preventDefault(); // 8px以上はドラッグ優先
  };

  // DOM 構造（.lookbook-container > .lookbook-track > .lookbook-item）を前提
  const container = track.parentElement; // .lookbook-container
  
  // マウス・タッチ両対応
  container.addEventListener('mousedown', down);
  container.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  container.addEventListener('touchstart', down, {passive:true});
  container.addEventListener('touchmove', move, {passive:true});
  container.addEventListener('touchend', up);

  // setupMarquee確認 - 必ず初期化されるように
  setTimeout(() => {
    const imgs = track.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = imgs.length;
    
    const checkAnimation = () => {
      const computedStyle = getComputedStyle(track);
      const animation = computedStyle.animation;
      console.log(`[LOOKBOOK] アニメーション確認: ${animation}`);
      
      if (!animation || animation === 'none') {
        // 画像ロード後にアニメーション設定
        track.style.animation = 'lookbook-scroll 40s linear infinite';
        console.log('[LOOKBOOK] アニメーション手動設定完了');
      }
    };
    
    if (totalImages === 0) {
      checkAnimation();
    } else {
      imgs.forEach(img => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === totalImages) checkAnimation();
        } else {
          img.addEventListener('load', () => {
            loadedCount++;
            if (loadedCount === totalImages) checkAnimation();
          }, { once: true });
        }
      });
    }
  }, 100);

  console.log('[LOOKBOOK] 中央維持・双方向ドラッグ・連続スクロール・setupMarquee確認完了');
});
