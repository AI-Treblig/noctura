theme.getOffsetTopFromDoc = el => el.getBoundingClientRect().top + window.scrollY, theme.getOffsetLeftFromDoc = el => el.getBoundingClientRect().left + window.scrollX, theme.getScrollParent = node => {
    const overflowY = node instanceof HTMLElement && window.getComputedStyle(node).overflowY,
        isScrollable = overflowY !== "visible" && overflowY !== "hidden";
    return node ? isScrollable && node.scrollHeight > node.clientHeight ? node : theme.getScrollParent(node.parentNode) || document.scrollingElement || window : null
}, theme.scrollToRevealElement = el => {
    const scrollContainer = theme.getScrollParent(el),
        scrollTop = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop,
        scrollVisibleHeight = scrollContainer === window ? window.innerHeight : scrollContainer.clientHeight,
        elTop = theme.getOffsetTopFromDoc(el),
        elBot = elTop + el.offsetHeight,
        inViewTop = scrollTop + theme.stickyHeaderHeight(),
        inViewBot = scrollTop + scrollVisibleHeight - 50;
    (elTop < inViewTop || elBot > inViewBot) && scrollContainer.scrollTo({
        top: elTop - 100 - theme.stickyHeaderHeight(),
        left: 0,
        behavior: "smooth"
    })
},theme.addDelegateEventListener = (element, eventName, selector, callback, addEventListenerParams = null) => {
    const cb = evt => {
        const el = evt.target.closest(selector);
        el && element.contains(el) && callback.call(el, evt, el)
    };
    return element.addEventListener(eventName, cb, addEventListenerParams), cb
}

function throttle(fn, wait = 300) {
    let throttleTimeoutId = -1,
        tick = !1;
    return () => {
        clearTimeout(throttleTimeoutId), throttleTimeoutId = setTimeout(fn, wait), tick || (fn.call(), tick = !0, setTimeout(() => {
            tick = !1
        }, wait))
    }
}
if (!customElements.get("scrolling-image-list")) {
    class ScrollingImageList extends HTMLElement {
        constructor() {
            super(), this.init()
        }
        init() {
            if (this.images = this.querySelectorAll(".scrolling-image-list__image"), this.images.length > 1) {
                this.contentColumn = this.querySelector(".scroll-content-col"), 
                this.featureText = this.querySelector(".scroll-content-col .feature-text-paired");
                const mq = window.matchMedia("(min-width: 768px)");
                this.addListeners(mq), mq.addEventListener("change", event => {
                    this.removeListeners(), this.addListeners(event)
                })
            }
            this.setAttribute("loaded", "")
        }
        addListeners(mq) {
            mq.matches ? (this.throttledHandleScroll = throttle(this.handleScroll.bind(this), 100), window.addEventListener("scroll", this.throttledHandleScroll), this.boundUpdatePositioning = this.updatePositioning.bind(this), window.addEventListener("scroll", this.boundUpdatePositioning), window.addEventListener("resize", this.boundUpdatePositioning), this.throttledHandleScroll(), this.boundUpdatePositioning(), this.contentClickListeners = [], this.querySelectorAll(".scrolling-image-list__image").forEach(el => {
                const oc = () => this.scrollToImage(el.dataset.index);
                this.contentClickListeners.push({
                    el,
                    oc
                }), el.addEventListener("click", oc)
            }), this.delegatedKeydownHandler = theme.addDelegateEventListener(this, "keydown", ".scrolling-image-list__image, .scrolling-image-list__content, .scrolling-image-list__content a", this.handleKeydown.bind(this))) : this.addEventListener("on:carousel-slider:select", this.handleSliderSelect.bind(this))
        }
        removeListeners() {
            if (window.removeEventListener("scroll", this.throttledHandleScroll), window.removeEventListener("scroll", this.boundUpdatePositioning), window.removeEventListener("resize", this.boundUpdatePositioning), this.contentClickListeners)
                for (let i = 0; i < this.contentClickListeners.length; i += 1) this.contentClickListeners[i].el.removeEventListener("click", this.contentClickListeners[i].oc);
            this.removeEventListener("click", this.delegatedKeydownHandler)
        }
        handleScroll() {
            let closestIndex = 1,
                closestDistance = Number.MAX_VALUE;
            this.images.forEach((el, index) => {
                const distance = ScrollingImageList.distanceFromViewportMiddle(el);
                distance < closestDistance && (closestIndex = index + 1, closestDistance = distance)
            });
            
          
            const crIndex = this.dataset.currentIndex,
              slides = this.querySelectorAll('.setAct'),
              activSl = this.querySelectorAll(".setAct[data-index='"+closestIndex+"']");
            if(crIndex == closestIndex) return;
            this.dataset.currentIndex = closestIndex
            slides.forEach((sl) => {
                sl.classList.remove('active');
                activSl.forEach((sl) => { sl.classList.add('active') });
            });
        }
        handleKeydown(evt, el) {
            if (evt.code === "Tab") {
                if (el.classList.contains("scrolling-image-list__image")) {
                    if (!evt.shiftKey) {
                        evt.preventDefault(), this.querySelector(`.scrolling-image-list__content[data-index="${el.dataset.index}"]`).focus();
                        return
                    }
                    if (el.dataset.index !== "1") {
                        evt.preventDefault(), this.querySelector(`.scrolling-image-list__image[data-index="${parseInt(el.dataset.index,10)-1}"]`).focus();
                        return
                    }
                    return
                }
                if (el.classList.contains("scrolling-image-list__content")) {
                    if (evt.shiftKey) {
                        evt.preventDefault(), this.querySelector(`.scrolling-image-list__image[data-index="${el.dataset.index}"]`).focus();
                        return
                    }
                    if (el.nextElementSibling !== null) {
                        evt.preventDefault(), el.querySelector("a") ? el.querySelector("a").focus() : this.querySelector(`.scrolling-image-list__image[data-index="${parseInt(el.dataset.index,10)+1}"]`).focus();
                        return
                    }
                    return
                }
                if (el.tagName === "A") {
                    const contentContainer = el.closest(".scrolling-image-list__content");
                    contentContainer.nextElementSibling !== null && [...contentContainer.querySelectorAll("a")].pop() === el && !evt.shiftKey && (evt.preventDefault(), this.querySelector(`.scrolling-image-list__image[data-index="${parseInt(contentContainer.dataset.index,10)+1}"]`).focus())
                }
            }
        }
        updatePositioning() {
            const containerBcr = this.contentColumn.getBoundingClientRect(),
                containerOffset = containerBcr.top + window.scrollY,
                contentHeight = this.featureText.getBoundingClientRect().height;
            let bcr = this.images[0].getBoundingClientRect();
            const topImageMid = bcr.top + window.scrollY + bcr.height / 2;
            bcr = this.images[this.images.length - 1].getBoundingClientRect();
            const botImageMid = bcr.top + window.scrollY + bcr.height / 2,
                windowMid = window.scrollY + window.innerHeight / 2;
            windowMid < topImageMid ? (this.style.setProperty("--content-offset-y", `${topImageMid-containerOffset-contentHeight/2}px`), this.style.removeProperty("--content-position"), this.style.removeProperty("--content-offset-x"), this.style.removeProperty("--scrolling-image-list-content-width")) : windowMid > botImageMid ? (this.style.setProperty("--content-offset-y", `${botImageMid-containerOffset-contentHeight/2}px`), this.style.removeProperty("--content-position"), this.style.removeProperty("--content-offset-x"), this.style.removeProperty("--scrolling-image-list-content-width")) : (this.style.setProperty("--content-position", "fixed"), this.style.setProperty("--content-offset-y", `${window.innerHeight/2-contentHeight/2}px`), this.style.setProperty("--content-offset-x", `${containerBcr.left}px`), this.style.setProperty("--scrolling-image-list-content-width", `${containerBcr.width}px`))
        }
        handleSliderSelect(evt){
          console.log(evt.detail.index);
            this.dataset.currentIndex = evt.detail.index + 1
        }
        scrollToImage(index) {
            const image = this.images[index - 1];
            window.scrollTo({
                left: 0,
                top: theme.getOffsetTopFromDoc(image) - (window.innerHeight - image.clientHeight) / 2,
                behavior: "smooth"
            })
        }
        static distanceFromViewportMiddle(el) {
            const viewportMidY = window.scrollY + window.innerHeight / 2,
                imageMidY = theme.getOffsetTopFromDoc(el) + el.clientHeight / 2;
            return Math.abs(viewportMidY - imageMidY)
        }
    }
    customElements.define("scrolling-image-list", ScrollingImageList)
}
