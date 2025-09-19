// Collection ドラッグ双方向 + クリック遷移両立・ループ空白解消

document.addEventListener('DOMContentLoaded', function() {
  
  // 初期化時に各トラックの先頭から複製して末尾へ（幅の50%目安）
  document.querySelectorAll('.collection-track').forEach(track => {
    const items = Array.from(track.children);
    let width = 0, i = 0;
    while (width < track.scrollWidth / 2 && i < items.length) {
      const clone = items[i].cloneNode(true);
      track.appendChild(clone);
      width += items[i].getBoundingClientRect().width;
      i++;
    }
    console.log(`[COLLECTION] ループ幅確保: ${track.id} (${i}個複製)`);
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
