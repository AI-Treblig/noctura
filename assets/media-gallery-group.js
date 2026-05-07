(function () {
  function galleryColorsForSection(sectionId) {
    var sid = String(sectionId);
    var groups = document.querySelectorAll('media-gallery-group[data-section="' + sid + '"]');
    if (!groups.length) return null;
    var colors = new Set();
    groups.forEach(function(g){
      if(g.dataset.color) colors.add(g.dataset.color);
    });
    return { groups: groups, colors: colors };
  }

  function selectedColorFromVariantSelects(sectionId, colors) {
    var vs = document.querySelector("#variant-selects-" + sectionId);
    if (!vs || !colors.size) return null;

    var selList = vs.querySelectorAll("select");
    for (var i = 0; i < selList.length; i++) {
      var opt = selList[i].selectedOptions[0];
      var v = opt && opt.value;
      if (v && colors.has(v)) return v;
    }

    var radios = vs.querySelectorAll("input[type='radio']:checked");
    for (var j = 0; j < radios.length; j++) {
      var rv = radios[j].value;
      if (colors.has(rv)) return rv;
    }

    return null;
  }

  function syncMediaGalleryGroupsForSection(sectionId) {
    var data = galleryColorsForSection(sectionId);
    if (!data) return;

    var selectedColor = selectedColorFromVariantSelects(sectionId, data.colors);
    data.groups.forEach(function (group) {
      var match = selectedColor != null && group.dataset.color === selectedColor;
      group.classList.toggle("hide", !match);
      if (match) group.init();
    });
  }

  function onOptionValueSelectionChange(payload) {
    var ev = payload && payload.data && payload.data.event;
    if (!ev || !ev.target) return;
    var vs = ev.target.closest("variant-selects");
    if (!vs || !vs.id || vs.id.indexOf("variant-selects-") !== 0) return;
    var sectionId = vs.id.replace("variant-selects-", "");
    if (!galleryColorsForSection(sectionId)) return;
    syncMediaGalleryGroupsForSection(sectionId);
  }

  function onVariantChange(payload) {
    var d = payload && payload.data;
    if (!d || d.sectionId == null) return;
    if (!galleryColorsForSection(d.sectionId)) return;
    syncMediaGalleryGroupsForSection(d.sectionId);
  }

  function initMediaGalleryGroupPubSub() {
    if (window.__mediaGalleryGroupPubSub__) return;
    if (typeof subscribe === "undefined" || typeof PUB_SUB_EVENTS === "undefined")
      return;
    window.__mediaGalleryGroupPubSub__ = true;
    subscribe(PUB_SUB_EVENTS.optionValueSelectionChange, onOptionValueSelectionChange);
    subscribe(PUB_SUB_EVENTS.variantChange, onVariantChange);
  }

  function boot() {
    initMediaGalleryGroupPubSub();

    if (customElements.get("media-gallery-group")) return;

    customElements.define("media-gallery-group", class MediaGalleryGroup extends HTMLElement {
        constructor() {
          super();
          this.el = {
            main: this.querySelector(".primgSlider"),
            thumb: this.querySelector(".pr_thumbs"),
            thumbPos: this.querySelector(".thumbs_nav.bottom"),
            pstyle: this.dataset.style,
          };
          this.mql = window.matchMedia("(min-width: 767px)");
          this.init();

          this.imgZoom = this.querySelectorAll(".przoom");
          this._driftAttached = false;
          if (this.imgZoom.length > 0) this.zoomImage();
        }

        zoomImage() {
          var self = this;
          if (!self.imgZoom || !self.imgZoom.length || self._driftAttached) return;

          function attach() {
            if (typeof window.Drift === "undefined") return false;
            if (window.innerWidth < 1024) return true;
            self.imgZoom.forEach(function (img) {
              var container = img.closest(".przoom");
              new window.Drift(img, {
                paneContainer: container,
                inlinePane: false,
                zoomFactor: 2,
              });
            });
            self._driftAttached = true;
            return true;
          }

          if (attach()) return;

          window.addEventListener("load", function(){
              attach();
            },
            { once: true }
          );

          var tries = 0;
          function retry() {
            tries += 1;
            if (attach() || tries > 120) return;
            requestAnimationFrame(retry);
          }
          requestAnimationFrame(retry);
        }

        init() {
          this.enableSwiper(this);
          this.checkBreakpoint();
        }

        getDirection() {
          if (this.el.thumbPos != null) {
            return "horizontal";
          }
          return window.innerWidth >= 767 ? "vertical" : "horizontal";
        }

        enableSwiper() {
          if (!this.el.main) return;

          var isSwiper = this.el.main.classList.contains("swiper-initialized");
          if (isSwiper && this.prslider) {
            try {
              this.prslider.update();
              if (this.prslider.thumbs && this.prslider.thumbs.swiper) {
                this.prslider.thumbs.swiper.update();
                this.prslider.thumbs.swiper.changeDirection(this.getDirection());
              }
            } catch (e) {}
            return;
          }

          if (isSwiper) return;

          this.prslider = new Swiper(
            this.el.main,
            JSON.parse(this.el.main.getAttribute("data-swiper"))
          );
          this.prslider.thumbs.swiper.changeDirection(this.getDirection());
          var pslider = this.prslider;
          this.prslider.on("slideChange", function () {
            var slides = pslider.slides;
            for (var i = 0; i < slides.length; i++) {
              var video = slides[i].querySelector("video");
              if (video) {
                if (i === pslider.activeIndex) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }
          });
        }

        checkBreakpoint() {
          if (!this.prslider) return;
          if( this.el.pstyle != "1" && this.el.pstyle != "5" && this.el.pstyle != "6"){
            if (this.mql.matches === true) {
              if (this.prslider !== undefined) this.prslider.destroy();
            } else if (this.mql.matches === false) {
              this.prslider.init();
              this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            }
          } else {
            this.prslider.init();
            this.prslider.thumbs.swiper.changeDirection(this.getDirection());
          }
        }
      }
    );
  }

  // Defer boot until DOMContentLoaded so all earlier/later deferred scripts (e.g. drift.min.js)
  // in the document have run before custom element constructors call zoomImage().
  if (document.readyState === "complete") {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }

  window.addEventListener("resize", function () {
    document.querySelectorAll("media-gallery-group").forEach(function (group) {
      group.init();
    });
  });
})();