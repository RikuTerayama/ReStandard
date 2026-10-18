/* The first photo remains visible when JavaScript is unavailable. */
(() => {
  const root=document.querySelector('[data-intro-carousel]');if(!root)return;
  const slides=[...root.querySelectorAll('.intro-slide')],controls=root.querySelector('.intro-controls');
  const count=root.querySelector('[data-intro-count]'),pause=root.querySelector('[data-intro-pause]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let current=0,timer,paused=motion.matches,hover=false,focused=false,visible=true,touchX=null,touchY=null,sequence=0;
  controls.hidden=false;
  function schedule(){clearTimeout(timer);if(!paused&&!hover&&!focused&&visible&&!document.hidden)timer=setTimeout(()=>show(current+1),5000);}
  async function show(index){const ticket=++sequence,next=(index+slides.length)%slides.length,img=slides[next].querySelector('img');img.loading='eager';try{await img.decode()}catch{schedule();return}if(ticket!==sequence)return;slides[current].hidden=true;slides[next].hidden=false;current=next;count.textContent=`${current+1} / ${slides.length}`;schedule();}
  function label(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'自動切り替えを再開':'自動切り替えを停止');}
  root.querySelector('[data-intro-prev]').addEventListener('click',()=>show(current-1));root.querySelector('[data-intro-next]').addEventListener('click',()=>show(current+1));
  pause.addEventListener('click',()=>{paused=!paused;label();schedule()});
  root.addEventListener('mouseenter',()=>{hover=true;schedule()});root.addEventListener('mouseleave',()=>{hover=false;schedule()});
  root.addEventListener('focusin',()=>{focused=true;schedule()});root.addEventListener('focusout',()=>{focused=false;schedule()});
  root.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;clearTimeout(timer)},{passive:true});
  root.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));else schedule()},{passive:true});
  root.addEventListener('touchcancel',()=>{touchX=null;schedule()},{passive:true});
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',()=>{paused=motion.matches;label();schedule()});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule()}).observe(root);
  label();schedule();
})();
