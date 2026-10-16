(() => {
  'use strict';
  const track=document.querySelector('.gallery-track');
  const dialog=document.querySelector('.zoom-dialog');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(track){
    const slides=[...track.children], thumbs=[...document.querySelectorAll('[data-image-index]')];
    const controls=document.querySelector('.gallery-controls');
    controls.hidden=false;
    const current=()=>Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));
    const go=index=>track.scrollTo({left:Math.max(0,Math.min(slides.length-1,index))*track.clientWidth,behavior:reduce.matches?'instant':'smooth'});
    thumbs.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();go(Number(a.dataset.imageIndex));}));
    document.querySelector('[data-prev]').addEventListener('click',()=>go(current()-1));
    document.querySelector('[data-next]').addEventListener('click',()=>go(current()+1));
    track.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(current()+(event.key==='ArrowRight'?1:-1));}});
    let selected=0;
    track.addEventListener('scroll',()=>{
      selected=current();
      document.querySelector('[data-position]').textContent=`${selected+1} / ${slides.length}`;
      thumbs.forEach((a,i)=>{if(i===selected)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
    },{passive:true});
    new ResizeObserver(()=>track.scrollTo({left:selected*track.clientWidth,behavior:'instant'})).observe(track);
    let start=null,dragged=false;
    track.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY};dragged=false;},{passive:true});
    track.addEventListener('pointermove',event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>8)dragged=true;},{passive:true});
    track.addEventListener('pointercancel',()=>{dragged=true;start=null;});
    track.addEventListener('click',event=>{
      const link=event.target.closest('[data-zoom]');
      if(!link)return;
      if(dragged){event.preventDefault();return;}
      if(!dialog||typeof dialog.showModal!=='function')return;
      event.preventDefault();
      const img=dialog.querySelector('img');img.src=link.href;img.alt=link.querySelector('img').alt;
      dialog.querySelector('[data-original-link]').href=link.href;dialog.showModal();
    });
  }
  document.querySelector('[data-close-zoom]')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  // A page left open must not continue presenting a cached offer as current.
  // The server also enforces expiry, including for JavaScript-disabled visitors.
  const expires=Number(document.body.dataset.offerExpires);
  function expire(){
    if(!expires||Date.now()<expires)return;
    document.querySelectorAll('[data-volatile]').forEach(el=>el.textContent='最新の価格・在庫はBASEでご確認ください');
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>{
      try{const data=JSON.parse(el.textContent);if(data['@type']==='Product'){delete data.offers;el.textContent=JSON.stringify(data);}}catch{}
    });
  }
  if(expires){setTimeout(expire,Math.max(0,expires-Date.now()+10));addEventListener('pageshow',expire);document.addEventListener('visibilitychange',expire);}
})();
