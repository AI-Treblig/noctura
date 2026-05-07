"use strict";

var rvp = "revone_recently-viewed",
  recentItems = JSON.parse(localStorage.getItem(rvp)),
  wraper = document.querySelector("recently-viewed-products"),
  crprID = wraper.dataset.id.toString(),
  limit = wraper.dataset.limit;

if (recentItems === null) recentItems = [];

var recentItems = recentItems.filter(item => item);

if (!recentItems.includes(crprID)) {
  recentItems.unshift(crprID);
  if (recentItems.length > limit) {
    recentItems.pop();
  }
  localStorage.setItem(rvp, JSON.stringify(recentItems));
} else {
  const index = recentItems.indexOf(crprID);
  if (index > -1) {
    recentItems.splice(index, 1);
  }
  recentItems.unshift(crprID);
  localStorage.setItem(rvp, JSON.stringify(recentItems));
}

class ProductRecentlyViewed extends SlideSection {
  constructor() {
    super();
  }
  init() {
    this.connectedCallback();
  }
  initData() {
    var savedProductsArr = JSON.parse(localStorage.getItem(rvp));
    const index = savedProductsArr.indexOf(this.dataset.id);
    if (index > -1) savedProductsArr.splice(index, 1);
    let cleanedItems = savedProductsArr.filter(item => item);
    this.getStoredProducts(cleanedItems);
  }
  getStoredProducts(p) {
    const limit = this.dataset?.limit;
    if (limit) {
      var query = "",
        ajaxURL = "";

      if (p && p.length > 0) {
        const sortedIds = p.slice();
        const idsToUse = sortedIds.slice(0, limit);
        query = idsToUse.join("%20OR%20id:");
        ajaxURL = `&q=id:${query}`;
      }
    }
    fetch(`${this.dataset.url}${ajaxURL}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement("div");
        html.innerHTML = text;
        const recentlyViewedProducts = html.querySelector(".recentPrList");
        const recentlyViewedDiv = document.querySelector(".recentPrList");
        if (
          recentlyViewedProducts &&
          recentlyViewedProducts.innerHTML.trim().length
        ) {
          recentlyViewedDiv.innerHTML = recentlyViewedProducts.innerHTML;
        }
        if (recentlyViewedProducts.innerHTML.trim().length === 0) {
          var recentSec = document.querySelector(".recent-product");
          recentSec.remove();
        }
      })
      .finally(() => {
        if(this.querySelector(".swiper-wrapper")) this.initSlide();
        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
        initializeScrollAnimationTrigger();
        initializeVideos();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  connectedCallback() {
    const __this = this;
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      __this.initData();
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}
customElements.define("recently-viewed-products", ProductRecentlyViewed);