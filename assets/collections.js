"use strict";
function pagination(){
    document.querySelectorAll(".loadMoreAct").forEach((btn) => {
      btn.classList.remove('loading');
      var url = btn.getAttribute('href');
      if (btn.classList.contains("infinite")){
        var observer = new IntersectionObserver(
          function(entries){
            entries.forEach((entry) => {
              if (entry.intersectionRatio === 1){
                loadMoreproducts(url);
              }
            });
          },
          { threshold: 1.0 }
        );
        observer.observe(btn);
      } else {
        btn.addEventListener("click",(e) => {
            e.preventDefault();
            btn.classList.add('loading');
            loadMoreproducts(url);
          },
          false
        );
      }
    });
}
pagination();
function loadMoreproducts(url){
    fetch(url).then((response) => response.text()).then((responseText) => {
      const html = new DOMParser().parseFromString(responseText, 'text/html'),
        products = document.getElementById('collectionPr'),
        productsSource = html.querySelector('#collectionPr').innerHTML,
        pagination = document.getElementById('pagination'),
        paginationSource = html.querySelector('#pagination');

      if(products) products.insertAdjacentHTML('beforeend', productsSource);
      if(pagination && paginationSource) {
        pagination.innerHTML = paginationSource.innerHTML;
      } else {
        pagination.innerHTML = '';
      }
    })
    .finally(() => {
      pagination();
      if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
      initializeVideos();
      initializeScrollAnimationTrigger();
    })
    .catch((e) => {
      console.error(e);
    });
}

class FiltersForm extends HTMLElement {
  constructor() {
      super();
      var _this = this,
        fbtns = document.querySelectorAll(".btn-filter"),
        topFilters = document.querySelector(".flTop");

      this.secId = this.dataset.id;
      this.mql = window.matchMedia('(min-width: 767px)');
  
      fbtns.forEach((btn) =>
        btn.addEventListener('click', this.mobileFilters.bind(this))
      );
      if(topFilters && this.mql.matches === true) this.blockToggle();
      this.selectFilters();
      this.priceRangeSlider();
      this.removeFilters();
      this.selectSort();
  }
  selectSort(){
    var shortby = document.getElementById('SortBy');
    shortby.addEventListener('change', this.onFormSubmit.bind(this));
  }
  selectFilters(){
    var filters = this.querySelectorAll('input');
    filters.forEach((filter) =>
       filter.addEventListener('change', this.onFormSubmit.bind(this))
    );
  }
  priceRangeSlider(){
    const isPriceRange = document.getElementById('priceSlider');
    if(!isPriceRange) return;
    const priceSlider = document.getElementById('priceSlider'),
      min = document.getElementById('Filter-Price-GTE'),
      max = document.getElementById('Filter-Price-LTE');

    priceSlider.addEventListener('change', (evt) => {
        min.value = evt.detail.value1.toString();
        max.value = evt.detail.value2.toString();
    });
    priceSlider.addEventListener('onMouseUp', (evt) => {
      min.dispatchEvent(new Event("change"));
      max.dispatchEvent(new Event("change"));
    });
    priceSlider.addEventListener('touchend', (evt) => {
      min.dispatchEvent(new Event("change"));
      max.dispatchEvent(new Event("change"));
    });
  }
  onFormSubmit(e){
    const flForm = this.querySelector('form'),
      formData = new FormData(flForm),
      params = new URLSearchParams(formData);
      this.renderSectionFromFetch(params);
  }
  renderSectionFromFetch(params){
    const url = `${window.location.pathname}?section_id=${this.secId}&${params.toString()}`
    document.body.classList.add('loadFilters');
    fetch(url).then((response) => response.text()).then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html'),
          products = document.getElementById('collectionPr'),
          filters = this.querySelector('.filterWrap'),
          counts = document.getElementById('itemsCount'),
          pagination = document.getElementById('pagination'),
          paginationSource =  html.querySelector('#pagination'),
          activeFilters =  document.getElementById('activeFilters');

        if(counts) counts.innerHTML = html.querySelector('#itemsCount').innerHTML;
        if(activeFilters) activeFilters.innerHTML = html.querySelector('#activeFilters').innerHTML;
        if(products) products.innerHTML = html.querySelector('#collectionPr').innerHTML;
        if(filters) filters.innerHTML = html.querySelector('.filterWrap').innerHTML;
        if(pagination && paginationSource) {
          pagination.innerHTML = paginationSource.innerHTML;
        } else if(pagination) {
          pagination.innerHTML = ' ';
        }
      })
      .finally(() => {
        const url = `${window.location.pathname}?${params.toString()}`
        history.pushState({ page: url }, url, url);
        document.body.classList.remove('loadFilters');
        this.selectFilters();this.priceRangeSlider();this.removeFilters();pagination();
        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
        initializeVideos();
        initializeScrollAnimationTrigger();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  removeFilters(){
    var _this = this,
        activeFl = document.querySelectorAll(".active-fl");
    activeFl.forEach((btn) => {
        btn.addEventListener("click",(e) => {
          e.preventDefault();
          var params = btn.getAttribute('href').split('?')[1];
          _this.renderSectionFromFetch(params);
        })
      });
  }
  mobileFilters(){
    var html = document.documentElement;
    html.classList.add('activFilter','showOverly');
    const blocks = this.querySelectorAll('.filterBx');
    blocks.forEach((blk) => {
      blk.open = true;
    });
    document.querySelector(".closeFilter").addEventListener('click', function(e){
        html.classList.remove('activFilter','showOverly');
    });
  }
  blockToggle(){
      const body = document.body,
        filters = document.querySelectorAll(".flTop .flTtl"),
        blocks = this.querySelectorAll('.filterBx');
      filters.forEach((blk) => {
        const act = blk.closest('.filterBx[open]');
        blocks.forEach((other) => {
           if(other !== act){
             other.removeAttribute('open');
           }
        });
      });
      body.addEventListener('click', function(e){
          blocks.forEach((blk) => {
            if(e.target.closest('.filterBx[open]')) return;
             blk.removeAttribute('open');
        });
      });
  }
}
customElements.define("filters-form", FiltersForm);

document.querySelectorAll(".change-view").forEach((btn) => {
  btn.addEventListener("click",(e) => {
     e.preventDefault();
      var view = btn.dataset.view,
        href = new URL(window.location.href);
      href.searchParams.set("type", view);
      window.location = href.toString();
  });
});