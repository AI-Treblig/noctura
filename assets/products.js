"use strict";
if(!customElements.get('sticky-cart')) {
  class StickyCart extends HTMLElement {
    constructor() {
      super();
      var _this = this,
        secId = this.dataset.section,
        vr = this.querySelector('#stickyOptions');
  
      window.addEventListener("scroll",function(){
         var y = window.scrollY,
            btn = document.querySelector('.product-form__submit'),
            cartBtn = '300',
            mbQury = window.matchMedia('(max-width: 767px)');
          if(btn) {
            cartBtn = btn.offsetTop + 200;
            if(mbQury.matches === true) cartBtn = btn.offsetTop + window.innerHeight;
          }
          if(y > cartBtn){
           _this.classList.add('active');
          } else {
            _this.classList.remove('active');
          }
      });
      if(vr){
        vr.addEventListener('change', function(e){
            var opt = this.selectedOptions[0],
              vrcontainer = document.getElementById(`variant-selects-${secId}`).querySelectorAll('select, fieldset');
            vrcontainer.forEach((field, index) => {
              if(field.tagName === 'SELECT'){
                field.querySelectorAll("option").forEach((option) => {
                  if(option.value === opt.dataset[`option${index + 1}`]){
                    option.selected = true;
                  }
                });
              } else if(field.tagName === 'FIELDSET'){
                field.querySelectorAll("input").forEach((input) => {
                  input.removeAttribute("checked");
                  if(input.value === opt.dataset[`option${index + 1}`]){
                    input.click();
                  }
                });
              }
            });
        });
      }
  
      this.querySelectorAll('.linkQty').forEach((button) =>
        button.addEventListener('click', this.onButtonClick.bind(this))
      );
  
      const syncQty = document.querySelectorAll(".linkInput");
      syncQty.forEach((input) => {
          input.addEventListener("change", function(){
            const value = this.value;
            syncQty.forEach((otherInput) => {
              if (otherInput !== input) {
                otherInput.value = value;
              }
            });
          });
      });
    }
    onButtonClick(e){
      e.preventDefault();
      const qtyinput = document.querySelector('.mianQty'),
        previousValue = qtyinput.value;
      e.target.name === 'plus' ? qtyinput.stepUp() : qtyinput.stepDown();
      if(previousValue !== qtyinput.value) qtyinput.dispatchEvent(new Event("change"));
    }
  }
  customElements.define("sticky-cart", StickyCart);
}
if(!customElements.get('back-in-stock')){
  class BackInStock extends HTMLElement {
    constructor() {
      super();
      this.bisCookie = 'backinstock'+this.dataset.id;
      this.form = this.querySelector('form');
      this.variant = this.querySelector('.bisVariant');
  
      this.form.addEventListener("submit", this.BackinStockSubmit.bind(this));
  
      window.addEventListener('DOMContentLoaded',function(){
        const error = window.location.href.indexOf('form_type=contact') > -1;
        if(window.location.href.indexOf('contact_posted=true') > -1 || error){
            if(getCookie('contatForm') == 'backinstockform'){
                var bismodal = new tingle.modal({
                      cssClass: ['bismodal'],
                      onClose: function(){
                          setCookie('contatForm','',1);
                      }
                });
                bismodal.setContent(document.getElementById('backStockSuccess'));
                bismodal.open();
                
            }
        }
      });
    }
    BackinStockSubmit(event){
        event.preventDefault();
        var vrId = this.querySelector('.bisVariant').dataset.id,
          cvr = vrId;
        if(getCookie(this.bisCookie) != null){
            cvr = getCookie(this.bisCookie)+'_'+vrId;
        }
        setCookie(this.bisCookie,cvr,1);
        setCookie('contatForm','backinstockform',1);
    }
    checkBackinstock(vr){
      this.variant.value = vr.title;
      this.variant.setAttribute('data-id', vr.id);
      var formMsg = this.querySelector('.bisMsg');
      if(vr.available){
        this.classList.add('hide');
      } else {
        this.classList.remove('hide');
         if(getCookie(this.bisCookie) != null){
           this.form.classList.remove('hide');
           formMsg.classList.add('hide');
           var str = String(getCookie(this.bisCookie)).split("_");
           for(var i=0; i<str.length; i++){
             if(str[i] == vr.id){
               this.form.classList.add('hide');
               formMsg.classList.remove('hide');
             }
           }
         }
      }
     }
  }
  customElements.define("back-in-stock", BackInStock);
}

var tearmFields = document.querySelectorAll('.tearmCheck'),
  dyButs = document.querySelectorAll('.shopify-payment-button__button');

if(tearmFields.length){
  setTimeout(function(){
    dyButs.forEach((btn) => { btn.disabled = true; });
  },300);
  
  tearmFields.forEach((tearm) => {
    tearm.onchange = function(){
      var dyBut = this.closest('.product-form__buttons').querySelector('.shopify-payment-button__button');
      //dyBut.disabled = !this.checked;
    };
  });
  
}