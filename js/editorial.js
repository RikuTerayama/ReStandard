/* Accessible grouped navigation; native details still work without JavaScript. */
document.documentElement.classList.add('rs-menu-ready');
document.addEventListener('DOMContentLoaded',()=>{
 const header=document.querySelector('.site-header'),toggle=header?.querySelector('.rs-menu-toggle'),menu=document.getElementById('navbarNav');if(!toggle||!menu)return;
 const groups=[...header.querySelectorAll('.rs-nav-group')],compact=matchMedia('(max-width:1000px)');
 const closeGroups=()=>groups.forEach(g=>g.open=false);
 function setOpen(open){menu.classList.toggle('show',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');toggle.querySelector('span').textContent=open?'−':'＋';groups.forEach(g=>g.open=open&&compact.matches);}
 toggle.addEventListener('click',()=>setOpen(!menu.classList.contains('show')));
 groups.forEach(group=>group.addEventListener('toggle',()=>{if(group.open&&!compact.matches)groups.filter(g=>g!==group).forEach(g=>g.open=false)}));
 document.addEventListener('click',event=>{if(!header.contains(event.target)){closeGroups();setOpen(false)}});
 header.addEventListener('focusout',()=>{setTimeout(()=>{if(!header.contains(document.activeElement)){closeGroups();setOpen(false)}},0)});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=groups.find(g=>g.open);if(open&&!compact.matches){open.open=false;open.querySelector('summary').focus()}else if(menu.classList.contains('show')){setOpen(false);toggle.focus()}});
 compact.addEventListener('change',()=>setOpen(false));
 const path=location.pathname.replace(/\/$/,'').replace(/\.html$/,'')||'/';
 menu.querySelectorAll('a').forEach(a=>{const u=new URL(a.href);if(u.origin===location.origin&&!u.hash&&(u.pathname.replace(/\/$/,'').replace(/\.html$/,'')||'/')===path){a.setAttribute('aria-current','page');a.closest('.rs-nav-group')?.setAttribute('data-current','')}a.addEventListener('click',()=>{closeGroups();setOpen(false)})});
 document.querySelectorAll('#desktop-bg-video,#mobile-bg-video').forEach(video=>{video.pause();video.removeAttribute('autoplay')});
});
