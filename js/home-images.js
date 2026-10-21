/* Preserve the existing lazy-image fade without the retired marquee controller. */
document.querySelectorAll('img[loading="lazy"]').forEach(img=>{
  if(img.complete)img.classList.add('loaded');
  else img.addEventListener('load',()=>img.classList.add('loaded'),{once:true});
});
