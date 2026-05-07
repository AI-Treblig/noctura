"use strict";

var wl = 'at_wishlist',
  wlItems = JSON.parse(localStorage.getItem(wl));

class WishlistItems extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    console.log('in page');
    var wlProducts = JSON.parse(localStorage.getItem(wl));
    this.getWlProducts(wlProducts);
  }
  getWlProducts(p){
      var query = "",
        ajaxURL = "";

    if(p && p.length > 0) {
      query = p.join("%20OR%20id:");
      ajaxURL = `?q=id:${query}`;
    }
    
    fetch(`${this.dataset.url}${ajaxURL}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement("div");
        html.innerHTML = text;
        const wlProducts = html.querySelector("#collectionPr");
        const wlDiv = document.querySelector("#wishlist");
        if (wlProducts && wlProducts.innerHTML.trim().length) {
          wlDiv.innerHTML = wlProducts.innerHTML;
          document.querySelector(".wlnull").classList.add('hide');
          this.removeItem();
        }
        if (wlProducts.innerHTML.trim().length === 0){
          
        }
      })
      .finally(() => {
        checkWishlist();
        initializeScrollAnimationTrigger();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  removeItem(){
    var products = this.querySelectorAll(".grid_bx");
    products.forEach((box) => {
        box.insertAdjacentHTML("beforeend",`<button type="button" class="gbtn pr removeItem" data-id="8557873430679"><span class="txt"><svg class="at-icon"><use xlink:href="#icon-close"></use></svg></span><span class="tooltip-label left">`+ theme.wlremove +`</span><svg class="at-icon at-spin"><use xlink:href="#icon-loading"></use></svg></button>`);
    });
    var buttons = this.querySelectorAll(".removeItem");
    buttons.forEach((btn) => {
        var wraper = btn.closest('.gitem');
      btn.addEventListener("click", function(){
        wraper.remove();
        const id = this.dataset.id,
          index = wlItems.indexOf(id);
        wlItems.splice(index, 1);
        localStorage.setItem(wl, JSON.stringify(wlItems));
        checkWishlist();
      });
    });
  }
}
customElements.define("wishlist-items", WishlistItems);