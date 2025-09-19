// Lookbook ドラッグクリック両立・Collection同様処理・300%幅確保

document.addEventListener('DOMContentLoaded', function() {
  
  // ensureLoopWidth - 300%幅確保（Collection同様）
  function ensureLoopWidth(track) {
    const targetWidth = window.innerWidth * 3; // 300%幅確保
    let currentWidth = track.scrollWidth;
    let cloneCount = 0;
    
    while (currentWidth < targetWidth && cloneCount < 10) {
      const items = Array.from(track.children);
      items.forEach(item => {
        const clone = item.cloneNode(true);
        track.appendChild(clone);
      });
      currentWidth = track.scrollWidth;
      cloneCount++;
    }
    console.log(`[LOOKBOOK] ループ幅確保: ${cloneCount}回複製・幅${currentWidth}px`);
  }

  // 新構造対応 - .lookbook-track統一セレクタ
  document.querySelectorAll('.lookbook-track').forEach(track => {
    ensureLoopWidth(track);
  });

  // ドラッグ双方向 + クリック遷移両立（Collection同様処理）
  document.querySelectorAll('.lookbook-track').forEach(track => {
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
      
      // translateX を相対移動
      const m = getComputedStyle(track).transform;
      const base = (m !== 'none') ? new DOMMatrix(m).m41 : 0;
      track.style.transform = `translateX(${base + dx}px)`;
    };

    const up = e => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging'); // アニメ再開
      
      if (moved < 8) return; // 8px未満はクリック(リンク遷移)を邪魔しない
      e.preventDefault(); // 8px以上はドラッグだったのでクリック抑止
    };

    // DOM 構造対応 - marquee-row > lookbook-track
    const container = track.parentElement; // .marquee-row
    
    // マウス・タッチ両対応
    container.addEventListener('mousedown', down);
    container.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    container.addEventListener('touchstart', down, {passive:true});
    container.addEventListener('touchmove', move, {passive:true});
    container.addEventListener('touchend', up);
  });

  console.log('[LOOKBOOK] ドラッグクリック両立・300%幅確保完了');
});
