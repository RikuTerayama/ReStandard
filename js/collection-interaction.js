// Collection ドラッグ双方向 + クリック遷移両立・ループ空白解消

document.addEventListener('DOMContentLoaded', function() {
  
  // ensureLoopWidth調整 - 200%以上の幅確保（空白防止）
  function ensureLoopWidth(track) {
    const targetWidth = window.innerWidth * 2; // 200%幅確保
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
    console.log(`[COLLECTION] ループ幅確保: ${track.id} (${cloneCount}回複製・幅${currentWidth}px)`);
  }

  // 新構造対応 - .collection-track統一セレクタ
  document.querySelectorAll('.collection-track').forEach(track => {
    ensureLoopWidth(track);
  });

  // ドラッグ双方向 + クリック遷移両立
  document.querySelectorAll('.collection-track').forEach(track => {
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

    // マウス・タッチ両対応
    track.addEventListener('mousedown', down);
    track.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    track.addEventListener('touchstart', down, {passive:true});
    track.addEventListener('touchmove', move, {passive:true});
    track.addEventListener('touchend', up);
  });

  console.log('[COLLECTION] ドラッグクリック両立・ループ空白解消完了');
});
