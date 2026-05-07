class CartPerformance {
  static #metric_prefix = "cart-performance"

  static createStartingMarker(benchmarkName) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    return performance.mark(`${metricName}:start`);
  }

  static measureFromEvent(benchmarkName, event) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`, {
      startTime: event.timeStamp
    });

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }

  static measureFromMarker(benchmarkName, startMarker) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      startMarker.name,
      `${metricName}:end`
    );
  }

  static measure(benchmarkName, callback) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`);

    callback();

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }
}

class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options).find((option) => option.getAttribute('selected')).removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target.closest('.product-form__input').querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty('--swatch-focal-point', target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset' );

    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}
customElements.define('variant-selects', VariantSelects);

if(!customElements.get('product-info')) {
  customElements.define('product-info', class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      onVariantChangeUnsubscriber = undefined;
      cartUpdateUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];

      constructor() {
        super();

        this.quantityInput = this.querySelector('.quantity__input');
      }

      connectedCallback() {
        this.initializeProductSwapUtility();

        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );

        this.initQuantityHandlers();
        this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
      }

      addPreProcessCallback(callback) {
        this.preProcessHtmlCallbacks.push(callback);
      }

      initQuantityHandlers() {
        if (!this.quantityInput) return;

        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;

        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
      }

      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html.querySelectorAll('.scroll-trigger').forEach((element) => element.classList.add('scroll-trigger--cancel'))
        );
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;

        this.resetProductFormState();

        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;

        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct ? this.handleSwapProduct(productUrl, shouldFetchFullPage) : this.handleUpdateProductInfo(productUrl),
        });
      }

      resetProductFormState() {
        const productForm = this.productForm;
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
      }

      handleSwapProduct(productUrl, updateFullPage) {
        return (html) => {
          this.productModal?.remove();

          const selector = updateFullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);

          if (updateFullPage) {
            document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;

            HTMLUpdateUtility.viewTransition(
              document.querySelector('main'),
              html.querySelector('main'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector('product-info'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }
        };
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text()).then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            callback(html);
          }).then(() => {
            // set focus to last clicked option value
            document.querySelector(`#${targetId}`)?.focus();
          }).catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            } else {
              console.error(error);
            }
          });
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      buildRequestUrlWithParams(url, optionValues, shouldFetchFullPage = false) {
        const params = [];

        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

        if (optionValues.length) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}?${params.join('&')}`;
      }

      updateOptionValues(html) {
        const variantSelects = html.querySelector('variant-selects');
        if (variantSelects) {
          HTMLUpdateUtility.viewTransition(this.variantSelectors, variantSelects, this.preProcessHtmlCallbacks);
        }
      }

      handleUpdateProductInfo(productUrl) {
        return (html) => {
          const variant = this.getSelectedVariant(html);

          this.pickupAvailability?.update(variant);
          this.updateOptionValues(html);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);

          if (!variant) {
            this.setUnavailable();
            const fallbackMediaId =
              html.querySelector(`[id^="MediaGallery-${this.dataset.section}"]`)?.dataset?.target;
            if (fallbackMediaId) this.updateMedia(html, fallbackMediaId);
            return;
          }

          this.updateMedia(html, variant?.featured_media?.id);

          const updateSourceFromDestination = (id, shouldHide = (source) => false) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(`#${id}-${this.dataset.section}`);
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle('hidden', shouldHide(source));
            }
          };

          updateSourceFromDestination('price');
          updateSourceFromDestination('Sku', ({ classList }) => classList.contains('hidden'));
          updateSourceFromDestination('Inventory', ({ innerText }) => innerText === '');
          updateSourceFromDestination('Volume');
          updateSourceFromDestination('Price-Per-Item', ({ classList }) => classList.contains('hidden'));

          this.updateQuantityRules(this.sectionId, html);
          this.querySelector(`#Quantity-Rules-${this.dataset.section}`)?.classList.remove('hidden');
          this.querySelector(`#Volume-Note-${this.dataset.section}`)?.classList.remove('hidden');

          this.productForm?.toggleSubmitButton(
            html.getElementById(`ProductSubmitButton-${this.sectionId}`)?.hasAttribute('disabled') ?? true,
            window.variantStrings.soldOut
          );

          publish(PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });
        };
      }

      updateVariantInputs(variantId) {
        this.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`).forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateURL(url, variantId) {
        this.querySelector('share-button')?.updateUrl(
          `${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ''}`
        );

        if (this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${url}${variantId ? `?variant=${variantId}` : ''}`);
      }

      setUnavailable() {
        this.productForm?.toggleSubmitButton(true, window.variantStrings.unavailable);

        const selectors = ['price', 'Inventory', 'Sku', 'Price-Per-Item', 'Volume-Note', 'Volume', 'Quantity-Rules']
          .map((id) => `#${id}-${this.dataset.section}`).join(', ');
        document.querySelectorAll(selectors).forEach(({ classList }) => classList.add('hidden'));
      }

      updateMedia(html, variantFeaturedMediaId) {
        if (!variantFeaturedMediaId) return;
        const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
        mediaGalleries.forEach((mediaGallery) => {
            var activeSl = mediaGallery.querySelector('.product-image__slider .swiper-slide-active')?.dataset.id || 0;
            if(activeSl != `${variantFeaturedMediaId}` || Shopify.designMode){
                mediaGallery.setActiveMedia(`${variantFeaturedMediaId}`, true);
            }
        });

        // update media modal
        const modalContent = this.productModal?.querySelector(`.product-media-modal__content`);
        const newModalContent = html.querySelector(`product-modal .product-media-modal__content`);
        if (modalContent && newModalContent) modalContent.innerHTML = newModalContent.innerHTML;
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.quantityInput.dataset.cartQuantity ? parseInt(this.quantityInput.dataset.cartQuantity) : 0,
          min: this.quantityInput.dataset.min ? parseInt(this.quantityInput.dataset.min) : 1,
          max: this.quantityInput.dataset.max ? parseInt(this.quantityInput.dataset.max) : null,
          step: this.quantityInput.step ? parseInt(this.quantityInput.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.quantityInput.min = min;

        if (max) {
          this.quantityInput.max = max;
        } else {
          this.quantityInput.removeAttribute('max');
        }
        this.quantityInput.value = min;

        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.variantIdInput?.value;
        if (!currentVariantId) return;

        this.querySelector('.quantity__rules-cart .loading__spinner').classList.remove('hidden');
        return fetch(`${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.dataset.section, html);
          })
          .catch((e) => console.error(e))
          .finally(() => this.querySelector('.quantity__rules-cart .loading__spinner').classList.add('hidden'));
      }

      updateQuantityRules(sectionId, html) {
        if (!this.quantityInput) return;
        this.setQuantityBoundries();

        const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
        const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === '.quantity__input') {
            const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null) {
                current.setAttribute(attribute, valueUpdated);
              } else {
                current.removeAttribute(attribute);
              }
            }
          } else {
            current.innerHTML = updated.innerHTML;
            if (selector === '.quantity__label') {
              const updatedAriaLabelledBy = updated.getAttribute('aria-labelledby');
              if (updatedAriaLabelledBy) {
                current.setAttribute('aria-labelledby', updatedAriaLabelledBy);
                // Update the referenced visually hidden element
                const labelId = updatedAriaLabelledBy;
                const currentHiddenLabel = document.getElementById(labelId);
                const updatedHiddenLabel = html.getElementById(labelId);
                if (currentHiddenLabel && updatedHiddenLabel) {
                  currentHiddenLabel.textContent = updatedHiddenLabel.textContent;
                }
              }
            }
          }
        }
      }

      get productForm() {
        return this.querySelector(`product-form`);
      }

      get productModal() {
        return document.querySelector(`#ProductModal-${this.dataset.section}`);
      }

      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }

      get variantSelectors() {
        return this.querySelector('variant-selects');
      }

      get relatedProducts() {
        const relatedProductsSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'related-products'
        );
        return document.querySelector(`product-recommendations[data-section-id^="${relatedProductsSectionId}"]`);
      }

      get quickOrderList() {
        const quickOrderListSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'quick_order_list'
        );
        return document.querySelector(`quick-order-list[data-id^="${quickOrderListSectionId}"]`);
      }

      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
    }
  );
}

if(!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if(this.cart){
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            console.log(this.error);
            if (!this.error){
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            }
            this.error = false;
            
            CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
            });

          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
            freeShippMsg();cartTerms();
            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if(this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
      
    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if(previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if(this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".qtyBtn[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if(this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".qtyBtn[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function removeTrapFocus(elementToFocus = null){
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if(elementToFocus) elementToFocus.focus();
}

const trapFocusHandlers = {};
function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (e) => {
    if(e.target !== container && e.target !== last && e.target !== first) return;
    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(e) {
    if(e.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if(e.target === last && !e.shiftKey) {
      e.preventDefault();
      first.focus();
    }
    //  On the first focusable element and tab backward, focus the last element.
    if((e.target === container || e.target === first) && e.shiftKey){
      e.preventDefault();
      last.focus();
    }
  };
  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);
  elementToFocus.focus();
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (e) => {
      e.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);
    this.addEventListener('change', debouncedOnChange.bind(this));
  }
  
  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if(event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if(this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'), event.target.dataset.quantityVariantId);
  }
  onCartUpdate() {
    if(this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text()).then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for(const selector of selectors){
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if(targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart`)
        .then((response) => response.text()).then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender(){
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cartPage',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.gift-wraper',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.cartTotal',
      }
    ];
  }

  updateQuantity(line, quantity, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if(parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if(cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if(cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });
        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = '';
        if(items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if(typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
        if(lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if(parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
        } else if(document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }
  updateLiveRegions(line, message) {
    const lineItemError = document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if(lineItemError) lineItemError.querySelector('.ctItem-error').innerHTML = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);
    freeShippMsg();cartTerms();
    if(theme.mlcurrency) currenciesChange(document.querySelectorAll('cart-item span.money'));
    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }
  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }
  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}
customElements.define('cart-items', CartItems);

if(!customElements.get('cart-note')) {
  customElements.define('cart-note', class CartNote extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('input',debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, 300)
        );
      }
    }
  );
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cartLink');
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      const iscart = document.body.classList.contains('template-cart');
      if(!iscart) this.open(cartLink)
    });
    cartLink.addEventListener('keydown', (e) => {
      if(e.code.toUpperCase() === 'SPACE') {
        e.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if(triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if(cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {this.classList.add('animate', 'active')});

    this.addEventListener('transitionend', () => {
      const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.drawer-empty') : document.getElementById('CartDrawer');
      const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
      trapFocus(containerToTrapFocusOn, focusElement);
    }, { once: true });

    const isDrawer = document.getElementById('main-cart-items');
    if(!isDrawer) html.classList.add('of_hidden');
  }

  close() {
    this.classList.remove('active','poptop');
    removeTrapFocus(this.activeElement);
    html.classList.remove('of_hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if(cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (e) => {
      e.currentTarget.setAttribute('aria-expanded', !e.currentTarget.closest('details').hasAttribute('open'));
    });

    //cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') && this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section => {
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    }));

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
      if(theme.mlcurrency) currenciesChange(document.querySelectorAll('cart-item span.money'));
    });
  }
  getSectionInnerHTML(html, selector = '.shopify-section'){
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer'
      },
      {
        id: 'cart-icon-bubble'
      }
    ];
  }
  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }
  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];
  }
}
customElements.define('cart-drawer-items', CartDrawerItems);

class CartDiscount extends HTMLElement {
  #activeFetch = null;
  constructor() {
    super();
    const form = this.querySelector("form");
    form.addEventListener("submit", this.applyDiscount);

    this.addEventListener("click", (event) => {
      if (event.target.closest(".cart-discount-remove")) {
        this.removeDiscount(event);
      }
    });
    this.submitButton = this.querySelector('[type="submit"]');
    this.errorEl = document.querySelector('.cart-discount__error') || document.querySelector('CartDrawer-discount__error');
  }

  #createAbortController() {
    if(this.#activeFetch) this.#activeFetch.abort();

    const abortController = new AbortController();
    this.#activeFetch = abortController;
    return abortController;
  }

  async #updateCartDiscount(discountCodes, abortController) {
    const body = JSON.stringify({discount: discountCodes.join(","), sections: this.getSectionsToRender().map((section) => section.section), sections_url: window.routes.cart_url,});
    const response = await fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body: body, signal: abortController.signal } });
    return response.json();
  }

  #updateCartUI(data){
    // Update main cart sections
    this.getSectionsToRender().forEach((section) => {
      if (data.sections && data.sections[section.section]){
        const elementToReplace = document.getElementById(section.id) ?.querySelector(section.selector) || document.getElementById(section.id);
        if(elementToReplace){
          elementToReplace.innerHTML = this.getSectionInnerHTML(data.sections[section.section], section.selector);
        }
      }
    });
  }

  #setLoadingState(isLoading) {
    if (isLoading) {
      this.submitButton.setAttribute("aria-disabled", "true");
      this.submitButton.classList.add("loading");
      this.submitButton.querySelector('.loading__spinner').classList.remove("hidden");
    } else {
      this.submitButton.removeAttribute("aria-disabled");
      this.submitButton.classList.remove("loading");
      this.submitButton.querySelector('.loading__spinner').classList.add("hidden");
    }
  }

  /*** Returns an array of existing discount codes. * @returns {string[]} */
  #existingDiscounts() {
    const discountCodes = [];
    const discountPills = this.querySelectorAll(".discount-code, [data-discount-code]");

    for (const pill of discountPills){
      if (pill instanceof HTMLElement){
        const code = pill.dataset.discountCode || pill.dataset.code;
        if (typeof code === "string" && code.trim()) {
          discountCodes.push(code.trim());
        }
      }
    }
    return discountCodes;
  }
  applyDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    this.errorEl.classList.add('hidden');
    
    const form = event.target instanceof HTMLFormElement ? event.target : this.querySelector("form");
    const discountCode = form.querySelector('input[name="discount"]');
    const discountCodeValue = discountCode.value.trim();
    if(!discountCodeValue) return;

    // Check if discount already exists
    const existingDiscounts = this.#existingDiscounts();
    if (existingDiscounts.includes(discountCodeValue)){
      this.#handleDiscountError('exist');
      return;
    }

    this.#setLoadingState(true);
    const abortController = this.#createAbortController();

    try {
      const updatedDiscounts = [...existingDiscounts, discountCodeValue];
      const data = await this.#updateCartDiscount(updatedDiscounts, abortController);

      /** @type {{ code: string; applicable: boolean; }} */
      if(data.discount_codes.find((discount) => { return (discount.code === discountCodeValue && discount.applicable === false);})){
        this.#handleDiscountError('discount');
        return;
      }

      discountCode.value = "";
      this.#updateCartUI(data);
      //this.#checkShipCode(discountCodeValue,data.discount_codes);
    } catch (error) {
      var type = "applying discount"
      this.#handleDiscountError(type);
    } finally {
      this.#setLoadingState(false);
      this.#activeFetch = null;
    }
  };

  removeDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const removeButton = event.target.closest(".cart-discount-remove");
    removeButton.setAttribute("aria-disabled", "true");
    removeButton.classList.add("loading");
    if(event instanceof KeyboardEvent && event.key !== "Enter") return;

    const discountCode = this.#getDiscountCodeFromEvent(event);
    if(!discountCode) return;

    const existingDiscounts = this.#existingDiscounts();
    const updatedDiscounts = existingDiscounts.filter((code) => code !== discountCode);

    if(updatedDiscounts.length === existingDiscounts.length){
      console.warn("Discount code not found in existing discounts");
      return;
    }

    const abortController = this.#createAbortController();

    try {
      const data = await this.#updateCartDiscount(updatedDiscounts, abortController);
      this.#updateCartUI(data);
    } catch (error) {

    } finally {
      this.#activeFetch = null;
      removeButton.setAttribute("aria-disabled", "false");
      removeButton.classList.remove("loading");
      this.errorEl.classList.add('hidden');
    }
  };

  #getDiscountCodeFromEvent(event) {
    const removeButton = event.target.closest(".discount-code");
    if (!removeButton) return null;
    return (removeButton.dataset.code || removeButton.dataset.discountCode || removeButton.closest("[data-discount-code]")?.dataset.discountCode || null);
  }

  #checkShipCode(code, codes){
    const existingDiscounts = this.#existingDiscounts();
    if(!existingDiscounts.includes(code) && codes.find((discount) => { return (discount.code === code && discount.applicable === true);})){
      this.#handleDiscountError('shipping');
    }
  }
  /*** Handles the discount error. */
  #handleDiscountError(type){
    if(type == 'shipping'){
      this.errorEl.textContent = cartStrings?.discount_ship;
    } else if(type == 'exist'){
      this.errorEl.textContent = cartStrings?.discount_already;
    } else {
      this.errorEl.textContent = cartStrings?.discount_error;
    }
    this.errorEl.classList.remove('hidden');
  }

  getSectionsToRender(){
    const mainCartItems = document.getElementById("main-cart-items");
    if(mainCartItems){
        return [
          {
            id: 'main-cart-items',
            section: document.getElementById('main-cart-items').dataset.id,
            selector: '.js-contents',
          },
          {
            id: 'cart-icon-bubble',
            section: 'cart-icon-bubble',
            selector: '.shopify-section'
          },
          {
            id: 'main-cart-footer',
            section: document.getElementById('main-cart-footer').dataset.id,
            selector: '.cartTotal',
          },
          {
            id: 'cartDiscount',
            section: document.getElementById('cartDiscount').dataset.id,
            selector: '.cart-discount__codes',
          }
        ];
    } else {
       return [
          {
            id: 'CartDrawer',
            section: document.getElementById('cartDiscount').dataset.id,
            selector: '.drawer__inner'
          },
          {
            id: 'cartDiscount',
            section: document.getElementById('cartDiscount').dataset.id,
            selector: '.cart-discount__codes',
          }
        ];
    }
  }

  getSectionInnerHTML(html, selector) {
    return ( new DOMParser().parseFromString(html, "text/html").querySelector(selector)?.innerHTML || "" );
  }
}

if (!customElements.get("cart-discount")){
  customElements.define("cart-discount", CartDiscount);
}

class CartOption extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('.cftBtn').forEach((button) => button.addEventListener("click", function(e){
        e.preventDefault()
        const allElements = document.querySelectorAll('.cftDraw')
        allElements.forEach(el => el.classList.remove('active'))
        var ftbk = this.hash.substr(1);
        document.getElementById(ftbk).classList.add("active");
    }));

    document.querySelectorAll('.saveBtn').forEach((btn) => {
      btn.addEventListener('click',(e) => {
        e.preventDefault();
        [].forEach.call(document.querySelectorAll('.cftDraw'), function(dw){ dw.classList.remove("active"); });
      });
    });
  }
}
customElements.define('cart-option', CartOption);

function startTimer(duration, display) {
    var timer = duration, minutes, seconds;
    setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if(--timer < 0) {
            clearInterval(startTimer);
            document.querySelector('.cartCountdown').remove();
        }
    }, 1000);
}
window.onload = function(){
    if(document.querySelector('.cartCountdown')){
        var minutes = document.querySelector('.cartCountdown').getAttribute('data-countdown'),
            display = document.querySelector('#cartTime');
        startTimer(minutes, display);
    }
};

function cartTerms(){
  var cterms = document.querySelector('#cartTerms'),
    cBtn = document.querySelector('.cartCheckout');
  if(cterms && cBtn){
    cterms.onchange = function(){
      cBtn.disabled = !this.checked;
    }
  }
}
cartTerms();