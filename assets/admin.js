
document.addEventListener('shopify:block:select', function (event) {
  const block = event.target;
  block.classList.add('active');
  
  const el = event.target.closest('slide-section');
  const blockSelected = event.target.getAttribute('data-slide');
  if(el) el.initSlide(blockSelected);

  const tab = block.closest('.tabSection');
  if(tab) block.click();
  
});

document.addEventListener('shopify:section:select', function(e){
  const section = e.target;
  const body = document.querySelector('body');

  section.classList.add('sactive');

});
document.addEventListener('shopify:section:deselect', function(e){
  const section = e.target;
  section.classList.remove('sactive');
  
});