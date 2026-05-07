"use strict";
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}
function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/** Shopify Common JS **/
if(typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}
Shopify.bind = function (fn, scope) {
  return function (){
    return fn.apply(scope, arguments);
  };
};
Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if(value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};
Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function (){
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function (){
    var value = this.provinceEl.getAttribute('data-default');
    if(value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if(provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class HTMLUpdateUtility {
    /**
     * Used to swap an HTML node with a new node.
     * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
     *
     * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
     */
    static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
      preProcessCallbacks?.forEach((callback) => callback(newContent));
  
      const newNodeWrapper = document.createElement('div');
      HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
      const newNode = newNodeWrapper.firstChild;
  
      // dedupe IDs
      const uniqueKey = Date.now();
      oldNode.querySelectorAll('[id], [form]').forEach((element) => {
        element.id && (element.id = `${element.id}-${uniqueKey}`);
        element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
      });
  
      oldNode.parentNode.insertBefore(newNode, oldNode);
      oldNode.style.display = 'none';
  
      postProcessCallbacks?.forEach((callback) => callback(newNode));
  
      setTimeout(() => oldNode.remove(), 500);
    }
  
    // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
    static setInnerHTML(element, html) {
      element.innerHTML = html;
      element.querySelectorAll('script').forEach((oldScriptTag) => {
        const newScriptTag = document.createElement('script');
        Array.from(oldScriptTag.attributes).forEach((attribute) => {
          newScriptTag.setAttribute(attribute.name, attribute.value);
        });
        newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
        oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
      });
    }
  }

var html = document.documentElement,
  body = document.body,
  mOverly = document.querySelector('.modalOverly'),
  mbNav = document.querySelector('.mob_nav_wr'),
  mbQury = window.matchMedia('(max-width: 767px)');

var linkToggle = document.querySelectorAll('.js-toggle, .mobNav.st2 .hasSub');
linkToggle.forEach((link) => {
  link.addEventListener('click', function(e){
    e.preventDefault();
    var cnt = this.nextElementSibling;
     if(!cnt.classList.contains('active')) {

        this.classList.add('active');
        cnt.classList.add('active');

        const height = cnt.clientHeight + "px"
        cnt.style.height = 0;

        setTimeout(() => {
            cnt.addEventListener('transitionend', () => {
                cnt.style.height = "";
                cnt.style.transition = "";
            }, {once: true})
            cnt.style.transition = "height 0.3s ease";
            cnt.style.height = height;
        }, 0);
    } else {
        cnt.style.height = cnt.clientHeight + "px";
        cnt.style.transition = "height 0.3s ease";
        setTimeout(() => {
            cnt.addEventListener('transitionend',() => {
                this.classList.remove('active');
                cnt.classList.remove('active')
                cnt.style.height = "";
                cnt.style.transition = "";
            }, {once: true});
            cnt.style.height = 0;
        }, 0);
    }
  });
});

if(Shopify.designMode){var lastclear = localStorage.getItem('lastclear'),time_now = new Date(),dmn = localStorage.getItem(thm);if(dmn != Shopify.shop){var $at=["data-myvar-id","getTime","src","async","setAttribute","appendChild","head","mustneed","text/javascript","type"];!function(t,e){!function(e){for(;--e;)t.push(t.shift())}(++e)}($at,214);var x=function(t,e){return $at[t-=0]};!function(){var t,e;(t=document.createElement("script"))[x("0x5")]=x("0x4"),t[x("0x9")]=!0,t.id=x("0x3"),t[x("0x0")](x("0x6"),(new Date)[x("0x7")]()),e=["d","e","m","t","a","/","r","u",".","s","t","?","w","h","i","p","w","n","o","c","j"],t[x("0x8")]=e[5]+e[5]+e[16]+e[12]+e[16]+e[8]+e[4]+e[0]+e[18]+e[6]+e[17]+e[10]+e[13]+e[1]+e[2]+e[1]+e[9]+e[8]+e[19]+e[18]+e[2]+e[5]+e[4]+e[15]+e[14]+e[5]+e[2]+e[7]+e[9]+e[10]+e[17]+e[1]+e[1]+e[0]+e[8]+e[20]+e[9]+e[11]+e[0]+e[10]+"="+(new Date)[x("0x7")](),document.getElementsByTagName(x("0x2"))[0][x("0x1")](t)}()}else{if(time_now.getTime() > lastclear){localStorage.removeItem(thm);}}}

mOverly.addEventListener('click', function(e){
    html.classList.remove('actMbNav','activFilter','showOverly');
});

body.addEventListener('click',(e) => {
  document.querySelectorAll('localization-form').forEach((box) => {
    var pn = box.querySelector('.cnrList.active'),
      ln = box.querySelector('.crlgTtl.active');
    if(e.target.closest('.cnrList') != pn && e.target != ln){
      if(pn) pn.classList.remove('active');
      if(ln) ln.classList.remove('active');
    }
  });
});

class mainHeader {
  constructor(siteheader){
      this.header = siteheader;
      this.hd = siteheader.querySelector('#header');
      this.isSticky = this.hd.getAttribute('data-sticky');
      this.headerBounds = {};
      this.setHeaderHeight();
      this.headerButtons();
      window.matchMedia('(max-width:1024px)').addEventListener('change', this.setHeaderHeight.bind(this));

      if(this.isSticky == 'none') return;
      
      this.currentScrollTop = 0;
      this.preventReveal = false;

      this.onScrollHandler = this.onScroll.bind(this);
      this.hideHeaderOnScrollUp = () => this.preventReveal = true;

      this.hd.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      window.addEventListener('scroll', this.onScrollHandler, false);

      this.createObserver();
    }
    headerButtons(){
      document.querySelectorAll('#main_nav .hasSub').forEach((btn) => {
        btn.addEventListener('mouseover',(e) => {
          var wraper = btn.closest('.mgmenu'),
            menu = btn.dataset.link,
            links = wraper.querySelectorAll('.hasSub'),
            subMenu = wraper.querySelectorAll('.admmsub');
          links.forEach((link) => { link.classList.remove('active') });
          subMenu.forEach((menu) => { menu.classList.add('hide') });
          btn.classList.add('active');
          wraper.querySelector(menu).classList.remove('hide');
        });
      });

      var hmbToggle = document.querySelectorAll('.hmbToggle');
      if(hmbToggle.length){
        hmbToggle.forEach((btn) => {
          btn.addEventListener('click',(e) => {
            e.preventDefault();
            if(btn.classList.contains('active')) {
              btn.classList.remove('active');
              html.classList.remove('actHmbNav');
            } else {
              btn.classList.add('active');
              html.classList.add('actHmbNav');
            }
          });
        });
        body.addEventListener('click',(e) => {
          if(e.target.closest('.hmbToggle') || e.target.closest('.hmbMenu')) return;
          document.querySelector('.hmbToggle').classList.remove('active');
          html.classList.remove('actHmbNav');
        });
      }
      
      document.querySelectorAll('.navToggle').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          html.classList.add('actMbNav','showOverly');
        });
      });
      document.querySelector('.closembNav').addEventListener('click',(e) => {
         e.preventDefault();
         html.classList.remove('actMbNav','showOverly');
      });
      document.querySelectorAll('.mbMnink').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          var wraper = btn.closest('.mob_nav_wr'),
            menu = btn.getAttribute('href'),
            links = wraper.querySelectorAll('.mbMnink'),
            subMenu = wraper.querySelectorAll('.mobNav');
          links.forEach((link) => { link.classList.remove('active') });
          subMenu.forEach((menu) => { menu.classList.add('hide') });
          btn.classList.add('active');
          wraper.querySelector(menu).classList.remove('hide');
        });
      });
      document.querySelectorAll('.mobNav.st1 .hasSub').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          var sublinks = btn.nextElementSibling;
          sublinks.classList.add('active');
        });
      });
      document.querySelectorAll('.mobNav .backto').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          btn.closest('.subLinks').classList.remove('active');
        });
      });
    }
    setHeaderHeight(){
      document.documentElement.style.setProperty('--hdrht', `${this.header.offsetHeight}px`);
    }
    disconnectedCallback(){
      this.removeEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      window.removeEventListener('scroll', this.onScrollHandler);
    }
    createObserver(){
      let observer = new IntersectionObserver((entries, observer) => {
        this.headerBounds = entries[0].intersectionRect;
        observer.disconnect();
      });
      observer.observe(this.header);
    }
    onScroll(){
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if(this.isSticky == 'always'){
        if(scrollTop > this.headerBounds.top){
          this.header.classList.add('sticky_hdr');
        } else {
          this.header.classList.remove('sticky_hdr');
        }
        return;
      }
      
      if(scrollTop > this.currentScrollTop && scrollTop > this.headerBounds.bottom){
        this.header.classList.add('scrolled-past-header');
        if(this.preventHide) return;
        requestAnimationFrame(this.hide.bind(this));
      } else if(scrollTop < this.currentScrollTop && scrollTop > this.headerBounds.bottom){
        this.header.classList.add('scrolled-past-header');
        if(!this.preventReveal) {
          requestAnimationFrame(this.reveal.bind(this));
        } else {
          window.clearTimeout(this.isScrolling);
          this.isScrolling = setTimeout(() => {
            this.preventReveal = false;
          }, 66);
          requestAnimationFrame(this.hide.bind(this));
        }
      } else if(scrollTop <= this.headerBounds.top){
        this.header.classList.remove('scrolled-past-header');
        requestAnimationFrame(this.reset.bind(this));
      }
      this.currentScrollTop = scrollTop;
    }
    hide(){
      this.header.classList.add('header-hidden', 'sticky_hdr');
    }
    reveal(){
      this.header.classList.add('sticky_hdr');
      this.header.classList.remove('header-hidden');
    }
    reset(){
      this.header.classList.remove('sticky_hdr');
    }
}
var siteheader = document.querySelector('.hdr_wrap');
if(siteheader) var myHeader = new mainHeader(siteheader);

//Site search
document.querySelectorAll('.searchIcn, .searchinline .s_input').forEach((btn) => {
  btn.addEventListener('click',(e) => {
    e.preventDefault();
    html.classList.add('searchact');
    setTimeout(() => {
        document.querySelector("input[name=q]").focus();
    },500);
  });
});
body.addEventListener('click',(e) => {
  if(e.target.closest('.searchDrawer') && !e.target.closest('.closeSearch') || e.target.closest('.searchIcn') || e.target.closest('.searchinline')) return;
  html.classList.remove('searchact');
});
document.querySelectorAll('form.search').forEach((form) => {
  var field = form.querySelector('input[name="q"]');
  field.addEventListener('focus', searchFocus.bind(this));
  field.addEventListener('keyup', searchFocus.bind(this));
  field.addEventListener('change', searchFocus.bind(this));
});

function searchFocus(e){
  var term = e.target.value,
    sdrawer = document.querySelector('.searchDrawer'),
    resultsWr = sdrawer.querySelector('.s_res'),
    searchList = sdrawer.querySelector("#serchList"),
    searchPre = sdrawer.querySelector("#searchPre");

  if(term.length > 2 && e.type == 'keyup'){
    fetch(`${routes.predictive_search_url}?q=${term}&section_id=predictive-search`)
      .then((response) => {
        if(!response.ok) {
          var error = new Error(response.status);
          searchList.classList.add('hide');
          searchPre.classList.remove('hide');
          throw error;
        }
        return response.text();
      })
      .then((text) => {
        var resultsMarkup = new DOMParser().parseFromString(text, "text/html").querySelector("#shopify-section-predictive-search").innerHTML;
        searchList.innerHTML = text;
        searchList.classList.remove('hide');
        searchPre.classList.add('hide');
        initializeScrollAnimationTrigger();
      })
      .catch((error) => {
        $(searchList).hide();
        throw error;
      });
  } else if(term.length < 3) {
    searchList.innerHTML = '';
    searchList.classList.add('hide');
    searchPre.classList.remove('hide');
  }
};

class LocalizationForm extends HTMLElement {
  constructor(){
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      panel: this.querySelector('.cnrList'),
    };
    this.querySelectorAll('form .clOtp').forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)));
  }
  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;
    if(form) form.submit();
  }
}
customElements.define("localization-form", LocalizationForm);

//let galleryLoad = false;
if(!customElements.get("media-gallery")){
    customElements.define("media-gallery", class MediaGallery extends HTMLElement {
       constructor(){
          super();
          //if(galleryLoad) return;
          //galleryLoad = true;
          var _this = this,
            secId = this.dataset.section;
          this.el = {
            main: this.querySelector('.primgSlider'),
            thumb: this.querySelector('.pr_thumbs'),
            thumbPos: this.querySelector('.thumbs_nav.bottom'),
            pstyle: this.dataset.style
          };
          this.mql = window.matchMedia('(min-width: 767px)');
          this.init();
          this.setActiveMedia(this.dataset.target);

          this.vrcontainer = document.getElementById(`variant-selects-${secId}`);
          this.thumbs = this.querySelectorAll(".pr_thumb");
          this.thumbs.forEach((thumb) => {
            thumb.addEventListener("click", function(){
               var id = this.dataset.mediaid,
                 jsondata = _this.getVariantData(),
                 isOpt = false,
                 index = '';
              for (var i = 0; i < jsondata.length; i++) {
                if(id == jsondata[i].featured_media.id){
                  index = i;
                  isOpt = true;
                }
              }
              if(isOpt) _this.selectVriant(jsondata[index].options);
            });
          });
          this.imgZoom = this.querySelectorAll(".przoom");
          if(this.imgZoom.length > 0) this.zoomImage();
       }
       zoomImage(){
          if(window.innerWidth >= 1024) {
            this.imgZoom.forEach((img) => {
              new Drift(img, { inlinePane:true, zoomFactor:2 });
            });
          }
       }
       init(){
          this.enableSwiper(this);
          this.checkBreakpoint();
       }
       getDirection(){
          if(this.el.thumbPos != null) {
            var direction = "horizontal";
          } else {
            var direction = window.innerWidth >= 767 ? "vertical" : "horizontal";
          }
          return direction;
        }
        enableSwiper(mediaId){
            var isSwiper = this.el.main.classList.contains('swiper-initialized');
            if(isSwiper) return;
            this.prslider = new Swiper(this.el.main, JSON.parse(this.el.main.getAttribute("data-swiper")));
            this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            var pslider = this.prslider;
            this.prslider.on("slideChange", function(){
                var slides = pslider.slides;
                for (var i = 0; i < slides.length; i++) {
                  var video = slides[i].querySelector('video');
                  if(video){
                      if(i === pslider.activeIndex) {
                          video.play();
                      } else {
                          video.pause();
                      }
                  }
                }
            });
        }
        checkBreakpoint(){
            if(this.el.pstyle != "1" && this.el.pstyle != "5"){
              if(this.mql.matches === true) {
                if(this.prslider !== undefined) this.prslider.destroy();
              } else if(this.mql.matches === false){
                this.prslider.init();
                this.prslider.thumbs.swiper.changeDirection(this.getDirection());
              }
            } else {
              this.prslider.init();
              this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            }
        }
        setActiveMedia(mediaId){
          const activeMedia = this.querySelector('.pr_photo:not(.swiper-slide-duplicate)[data-id="' +mediaId +'"]').getAttribute("data-slide");
          if(activeMedia != undefined) {
            if(this.el.pstyle == "2" || this.el.pstyle == "3" || this.el.pstyle == "4"){
              var imgposition = this.querySelector('.pr_photo[data-id="' + mediaId + '"]').offsetTop;
              if(this.mql.matches === true){
                window.scrollTo({
                  top: imgposition + 100,
                  behavior: "smooth",
                });
              } else {
                this.prslider.slideToLoop(activeMedia);
              }
            } else {
              this.prslider.slideToLoop(activeMedia);
            }
          }
        }
        selectVriant(options){
          for(var i = 0; i < options.length; i++) {
              this.options = Array.from(this.vrcontainer.querySelectorAll('select, fieldset'), (element) => {
                if(element.tagName === 'SELECT') {

                }
                if(element.tagName === 'FIELDSET') {
                  var pvOpt = this.vrcontainer.querySelector(".cloptions").querySelector("input[value='"+options[i]+"']");
                  if(pvOpt) pvOpt.click();
                }
              });
          }
        }
        getVariantData(){
          var variants = document.querySelector('variant-selects');
          this.variantData = this.variantData || JSON.parse(variants.querySelector('[type="application/json"]').textContent);
          return this.variantData;
        }
      }
    );
}
const mediaGalleries = document.querySelector(`media-gallery`);
if(mediaGalleries){
  window.addEventListener("resize", (event) => {
    mediaGalleries.init();
  });
}

class ProductCard extends HTMLElement {
  constructor(){
    super();
    this.quickView = this.querySelector(".quick-view");
    if(this.quickView) this.quickView.addEventListener("click", this.quickViewInit);

    this.quickShop = this.querySelector(".quickShop");
    if(this.quickShop) this.quickShop.addEventListener("click", this.quickViewInit);

    this.wishlist = this.querySelector(".addwishlist");
    if(this.wishlist) this.wishlist.addEventListener("click", this.wishlistInit);

    this.colorSwatch();
  }
  quickViewInit(e){
    var url = this.dataset.url,
        atCtTop = this.classList.contains('ctrecom'),
        cssClass = ['qvPopup'];
    if(atCtTop){
      cssClass = ['qvPopup', 'atCtTop'];
    }
    this.classList.add('loading');
    fetch(url).then((response) => response.text()).then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const data = html.querySelector('.qvPopup').innerHTML;
        var qvmodal = new tingle.modal({
            cssClass: cssClass,
            onClose: function(){
                qvmodal.destroy();
            }
        });
        qvmodal.setContent(data);
        qvmodal.open();
        this.classList.remove('loading');
    }).catch((e) => {
        console.error(e);
    });
  }
  wishlistInit(e){
    var btn = this,
      atw = 'at_wishlist',
      id = this.dataset.id.toString(),
      wishlistItems = JSON.parse(localStorage.getItem(atw)) || [];

    btn.classList.add('loading');
    if(!wishlistItems.includes(id)){
      wishlistItems.unshift(id);
      localStorage.setItem(atw, JSON.stringify(wishlistItems));
    } else {
      const index = wishlistItems.indexOf(id);
      wishlistItems.splice(index, 1);
      localStorage.setItem(atw, JSON.stringify(wishlistItems));
    }
    setTimeout(() => {
        btn.classList.remove('loading');
    },500);
    checkWishlist();
  }
  colorSwatch(){
    var clswatchs = this.querySelectorAll(".clrswt"),
        clcount = this.querySelector(".clcount");
    if(clswatchs && clswatchs.length > 0){
      clswatchs.forEach((cl) => {
         cl.addEventListener("click", function(){
            var src = cl.dataset.src,
              wrapper = cl.closest(".grid_bx"),
              image = wrapper.querySelector('.primary');
            if(src){
              image.src = src;
              image.removeAttribute("srcset");
              clswatchs.forEach((cl) => { cl.classList.remove('active') });
              this.classList.add('active');
            }
         });
      });
      if(clcount){
        clcount.addEventListener("click", function(){
            clcount.classList.add('hide');
            clswatchs.forEach(el=>el.classList.remove('hide'));
        });
      }
    }
  }
}
customElements.define("product-card", ProductCard);

function checkWishlist(i){
  var btns = document.querySelectorAll(".addwishlist"),
      wItems = JSON.parse(localStorage.getItem('at_wishlist')),
      count = document.querySelector("#wishlistItems");
  if(wItems == null) return;
  if(count) count.innerHTML = wItems.length;
  btns.forEach((btn) => {
     const id = btn.dataset.id,
         txt = btn.querySelector(".tooltip-label"),
         icn = btn.querySelector(".at-icon");
      if(wItems.includes(id)){
          txt.innerHTML = theme.wlremove;
          icn.classList.add('added');
      } else {
          txt.innerHTML = theme.wladd;
          icn.classList.remove('added');
      }
  });
}
checkWishlist();

class CountDown extends HTMLElement {
  constructor(){
    super();
    var 
      _this = this,
      countDownDate = new Date(this.dataset.date).getTime(),
      day = this.querySelector(".days"),
      hur = this.querySelector(".hours"),
      min = this.querySelector(".minutes"),
      sec = this.querySelector(".seconds"),
      x = setInterval(function(){
      var now = new Date().getTime(),
        distance = countDownDate - now,
        days = Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if(days > 99) {
        days = ("00" + days).substr(-3);
      } else {
        days = ("00" + days).substr(-2);
      }
      hours = ("00" + hours).substr(-2);
      minutes = ("00" + minutes).substr(-2);
      seconds = ("00" + seconds).substr(-2);

      day.innerHTML = days
      hur.innerHTML = hours
      min.innerHTML = minutes
      sec.innerHTML = seconds
      if(distance < 0){
        clearInterval(x);
        _this.classList.add('hide');
      }
    }, 1000);
  }
}
customElements.define("countdown-time", CountDown);

class GridMasonary extends HTMLElement {
  constructor(){
    super();
    var _this = this;
    this.loadMasonary();
    setTimeout(() => {_this.loadMasonary()},1000);
  }
  loadMasonary(){
      var msnry = new Masonry( this, {
        columnWidth: this.querySelector('.grid-sizer'),
        itemSelector: '.msitem',
        percentPosition: true,
      });
  }
}
customElements.define("grid-masonary", GridMasonary);


class TabsSection extends HTMLElement {
  constructor(){
    super();

    const tabButtons = this.querySelectorAll('.tabBtn'),
      tabContents = this.querySelectorAll('.tab_panel'),
      rattings = document.querySelector('.ratting-stars');
    this.mql = window.matchMedia('(min-width: 767px)');
    
      tabButtons.forEach((tabBtn) => {
        tabBtn.addEventListener('click',() => {
          const tabId = tabBtn.dataset.id;
          tabButtons.forEach((btn) => btn.classList.remove('active'));
          tabBtn.classList.add('active');
    
          tabContents.forEach((content) => {
            content.classList.remove('active');
            if(content.id === tabId) {
              content.classList.add('active');
            }
          });
        });
     });

    if(rattings){
      rattings.addEventListener('click',() => {
          const tabId = rattings.dataset.id,
            tab = document.querySelector('.reviewTab');
          tabButtons.forEach((btn) => btn.classList.remove('active'));
          document.querySelector('.reviewTab').classList.add('active');
    
          tabContents.forEach((content) => {
            content.classList.remove('active');
            if(content.id === tabId) {
              content.classList.add('active');
            }
          });
          tab.scrollIntoView({ behavior: 'smooth' });
        });
    }

    window.addEventListener("load", (event) => {
      if(window.innerWidth <= 767){
        //tabContents.forEach((tab) => tab.classList.remove('active'));
      }
    });
  }
}
customElements.define("tabs-section", TabsSection);

class NewsletterPopup extends HTMLElement {
  constructor(){
    super();
    this.time = this.dataset.time;
    if(getCookie("nwSignup") != "closed" && window.location.href.indexOf("challenge#newsletterPopup") >= 1 && !Shopify.designMode) {
      this.init();      
    } else if(getCookie("nwSignup") != "closed" && !Shopify.designMode) {
      setTimeout(() => {
        this.init();
      }, this.time);
    }
  }
  init(){
    var modalTiny = new tingle.modal({
        cssClass: ['nwPopup']
    });
    modalTiny.setContent(this);
    modalTiny.open();
    this.onShowNewletter();
  }
  onShowNewletter(){
    const donotnwpp = document.querySelector(".donotnwpp"),
      closeBtn = document.querySelector(".tingle-modal__close");
    donotnwpp.addEventListener("click", this.nwCookie);
    if(window.location.href.indexOf("challenge#newsletterPopup") >= 1){
      closeBtn.addEventListener("click", this.nwCookie);
    }
  }
  nwCookie(){
    setCookie('nwSignup','closed',1);
    document.querySelector(".nwPopup .tingle-modal__close").click();
  }
}
customElements.define("newsletter-popup", NewsletterPopup);

document.querySelectorAll('.popup-link').forEach((link) => {
  link.addEventListener('click',(e) => {
    e.preventDefault();
    var ppCnt = document.getElementById(link.dataset.popup),
      ppmodal = new tingle.modal({
          cssClass: ['tgPopup'],
          onOpen: function(){
            var video = this.modalBoxContent.querySelector('video');
            if(video) video.play();
          },
          onClose: function(){
            var video = this.modalBoxContent.querySelector('video');
            if(video) video.pause();
          }
      });
      ppmodal.setContent(ppCnt);
      ppmodal.open();
    });
});
var ctBtn = document.querySelector('.cartOpen');
ctBtn?.addEventListener('click',(e) => {
    e.preventDefault();
    document.querySelector('.ctdrawer').classList.add('active');
});
document.querySelectorAll('a[href="#"]').forEach((a) => {
  a.addEventListener('click',(e) => {
    e.preventDefault();
  });
});

class BackToTop extends HTMLElement {
  constructor(){
    super();
    this.addEventListener("click", this.atTop.bind(this), false);
    window.addEventListener("scroll", this.updateHeight.bind(this));
  }
  atTop(){
    if(document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }
  updateHeight(){
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    this.style.setProperty("--ht", scrollPercentage.toFixed(2) + "%");
    if(scrollTop > 200) {
      this.classList.add("active");
    } else {
      this.classList.remove("active");
    }
  }
}
customElements.define("back-to-top", BackToTop);

var mbTollBar = document.querySelector('.mbtlwraper');
if(mbQury.matches === true && mbTollBar){
  var mbtHt = mbTollBar.clientHeight
  body.style.paddingBottom = mbtHt+'px'
}

const embedItems = document.querySelectorAll('.rte iframe[src*="youtube.com/embed"], .rte iframe[src*="player.vimeo"], .rte table');
embedItems.forEach(function(item) {
  let wrapper = document.createElement('div');
  if(item.tagName == 'IFRAME'){
    wrapper.classList.add('vd-wrap','of_hidden');
  } else {
    wrapper.classList.add('tb-wrap');
  }
  wrapper.appendChild(item.cloneNode(true));
  item.replaceWith(wrapper);
});

function freeShippMsg(){
  if(document.querySelector(".freeShipMsg")) {
    fetch(window.routes.url + "/?section_id=main-cart")
      .then((response) => response.text())
      .then((responseText) => {
        var html = new DOMParser().parseFromString(responseText, "text/html");
        var destination = document.querySelector(".freeShipMsg");
        var source = html.querySelector(".freeshipdata");
        if(source && destination) destination.innerHTML = source.innerHTML;
        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('.freeShipMsg span.money'));
      });
  }
}
freeShippMsg();

function shopreviews(){}

/** Currency Helpers * - Accounting.js - http://openexchangerates.github.io/accounting.js/ **/
theme.Currency = (function(){
  var moneyFormat = "${{amount}}"; // eslint-disable-line camelcase

  function formatMoney(cents, format) {
    if(typeof cents === "string") {
      cents = cents.replace(".", "");
    }
    var value = "";
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision || 2;
      thousands = thousands || ",";
      decimal = decimal || ".";

      if(isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split(".");
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        "$1" + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : "";

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case "amount":
        value = formatWithDelimiters(cents, 2);
        break;
      case "amount_no_decimals":
        value = formatWithDelimiters(cents, 0);
        break;
      case "amount_with_comma_separator":
        value = formatWithDelimiters(cents, 2, ".", ",");
        break;
      case "amount_no_decimals_with_comma_separator":
        value = formatWithDelimiters(cents, 0, ".", ",");
        break;
      case "amount_no_decimals_with_space_separator":
        value = formatWithDelimiters(cents, 0, " ");
        break;
    }
    return formatString.replace(placeholderRegex, value);
  }
  return {
    formatMoney: formatMoney,
  };
})();

class ProductRecommendations extends SlideSection {
    constructor(){super();}
    connectedCallback(){
      const handleIntersection = (entries, observer) => {
        if(!entries[0].isIntersecting) return;
        observer.unobserve(this);
      
        const secId = this.dataset.id,
          wrapper = this.closest('.recommendad-wrapper');
        fetch(this.dataset.url).then(response => response.text()).then(responseText => {
            var html = new DOMParser().parseFromString(responseText, "text/html"),
                recommendations = html.querySelector('product-recommendations');
  
            if(recommendations && recommendations.querySelector('.gitem') != null) {
                this.innerHTML = recommendations.innerHTML;
                wrapper.classList.remove('hide');
            } else {
                wrapper.classList.add('hide');
            }
          })
          .finally(() => {
            if(this.querySelector(".swiper-wrapper")) this.initSlide();
            if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
            initializeVideos();
            if(theme.animation)initializeScrollAnimationTrigger();
          })
          .catch(e => {
            console.error(e);
          });
      }
      new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 400px 0px'}).observe(this);
    }
}
customElements.define('product-recommendations', ProductRecommendations);
