if (!customElements.get('product-bundle-form')) {
  customElements.define(
    'product-bundle-form',
    class ProductBundleForm extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector('form');
        if (!this.form) return;

        this.maxSelect = Number(this.dataset.maxSelect || 3);
        this.minSelect = Math.min(3, this.maxSelect);
        this.cart = document.querySelector('cart-drawer');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.spinner = this.form.querySelector('.loading-overlay__spinner');
        this.selectedCount = this.form.querySelector('.bundle-selected-count');
        this.totalPrice = this.form.querySelector('.bundle-total-price');
        this.saveWrap = this.form.querySelector('.product-bundle__save');
        this.savePrice = this.form.querySelector('.bundle-save-price');
        this.selectedList = this.form.querySelector('.product-bundle__selected-list');
        this.placeholders = Array.from(
          this.selectedList.querySelectorAll('.product-bundle__selected-row.is-placeholder')
        );
        this.hiddenInputsWrap = this.form.querySelector('.bundle-items-inputs');
        this.rows = Array.from(this.form.querySelectorAll('.product-bundle__item'));
        this.removedDefaultsStorageKey = `product-bundle-removed-defaults-${this.dataset.sectionId || 'global'}-${window.location.pathname}`;

        this.bindEvents();
        this.initializeDefaults();
      }

      bindEvents() {
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.rows.forEach((row) => {
          const select = row.querySelector('.product-bundle__variant');
          const addButton = row.querySelector('.product-bundle__add-item');
          select.addEventListener('change', () => this.onVariantChange(row));
          addButton.addEventListener('click', () => this.addItem(row));
        });
        this.selectedList.addEventListener('click', (event) => {
          const removeButton = event.target.closest('.product-bundle__remove-item');
          if (!removeButton) return;
          this.removeItem(removeButton.dataset.variantId);
        });
      }

      initializeDefaults() {
        this.rows.forEach((row) => {
          this.onVariantChange(row);
          const addButton = row.querySelector('.product-bundle__add-item');
          const select = row.querySelector('.product-bundle__variant');
          const option = select.options[select.selectedIndex];
          if (
            addButton.dataset.defaultSelected === 'true' &&
            !this.getRemovedDefaultVariantIds().includes(option.value)
          ) {
            this.addItem(row, true);
          }
        });
        this.updateState();
      }

      onVariantChange(row) {
        const select = row.querySelector('.product-bundle__variant');
        const option = select.options[select.selectedIndex];
        const price = Number(option.dataset.price || 0);
        const comparePrice = Number(option.dataset.compare || 0);
        const priceEl = row.querySelector('.product-bundle__price');
        const compareEl = row.querySelector('.product-bundle__compare');

        priceEl.innerHTML = this.formatMoney(price);
        compareEl.innerHTML = this.formatMoney(comparePrice);
        compareEl.classList.toggle('hide', comparePrice <= price);
        const selectedRow = this.selectedList.querySelector(
          `[data-variant-id="${option.value}"]`
        );
        if (selectedRow) {
          selectedRow.querySelector('.product-bundle__selected-name').textContent =
            this.getSelectedLabel(row);
        }
        this.updateState();
      }

      addItem(row, isDefault = false) {
        const select = row.querySelector('.product-bundle__variant');
        const option = select.options[select.selectedIndex];
        const variantId = option.value;

        if (this.selectedList.querySelector(`[data-variant-id="${variantId}"]`)) return;
        if (this.getSelectedRows().length >= this.maxSelect) {
          if (!isDefault) this.handleErrorMessage(`You can select up to ${this.maxSelect} items.`);
          return;
        }

        const availablePlaceholder = this.placeholders.find(
          (item) => item.classList.contains('is-placeholder')
        );
        if (!availablePlaceholder) {
          if (!isDefault) this.handleErrorMessage(`You can select up to ${this.maxSelect} items.`);
          return;
        }

        availablePlaceholder.classList.remove('is-placeholder');
        availablePlaceholder.dataset.placeholderHtml = availablePlaceholder.innerHTML;
        availablePlaceholder.dataset.variantId = variantId;
        availablePlaceholder.innerHTML = this.getSelectedSlotMarkup(row, variantId);
        this.removeDefaultRemoval(variantId);
        this.handleErrorMessage();
        this.updateState();
      }

      removeItem(variantId) {
        const target = this.selectedList.querySelector(`[data-variant-id="${variantId}"]`);
        if (target) {
          const slot = target.dataset.slot;
          target.removeAttribute('data-variant-id');
          target.classList.add('is-placeholder');
          target.innerHTML =
            target.dataset.placeholderHtml ||
            `<p class="product-bundle__placeholder-text">Placeholder ${slot} (add product)</p>`;
        }
        this.saveRemovedDefaultVariant(variantId);
        this.handleErrorMessage();
        this.updateState();
      }

      getRemovedDefaultVariantIds() {
        try {
          const stored = sessionStorage.getItem(this.removedDefaultsStorageKey);
          const ids = stored ? JSON.parse(stored) : [];
          return Array.isArray(ids) ? ids : [];
        } catch (error) {
          return [];
        }
      }

      saveRemovedDefaultVariant(variantId) {
        if (!variantId) return;
        const ids = this.getRemovedDefaultVariantIds();
        if (ids.includes(variantId)) return;
        ids.push(variantId);
        try {
          sessionStorage.setItem(this.removedDefaultsStorageKey, JSON.stringify(ids));
        } catch (error) {}
      }

      removeDefaultRemoval(variantId) {
        if (!variantId) return;
        const ids = this.getRemovedDefaultVariantIds();
        if (!ids.includes(variantId)) return;
        const filtered = ids.filter((id) => id !== variantId);
        try {
          sessionStorage.setItem(this.removedDefaultsStorageKey, JSON.stringify(filtered));
        } catch (error) {}
      }

      getSelectedRows() {
        return Array.from(
          this.selectedList.querySelectorAll('.product-bundle__selected-row[data-variant-id]')
        );
      }

      getSelectedLabel(row) {
        const select = row.querySelector('.product-bundle__variant');
        const option = select.options[select.selectedIndex];
        const title = select.dataset.productTitle || '';
        if (option.textContent.trim() === 'Default Title') return title;
        return `${title} - ${option.textContent.trim()}`;
      }

      getSelectedSlotMarkup(row, variantId) {
        const select = row.querySelector('.product-bundle__variant');
        const option = select.options[select.selectedIndex];
        const imageEl = row.querySelector('.grid_img img, .grid_img video, .imgFt');
        const imageSrc = imageEl ? imageEl.currentSrc || imageEl.src || '' : '';
        const price = Number(option.dataset.price || 0);
        const moneyPrice = this.formatMoney(price);
        const label = this.getSelectedLabel(row);

        return `
          <div class="product-bundle__selected-product">
            <img class="product-bundle__selected-image" src="${this.escapeHtml(
              imageSrc
            )}" alt="${this.escapeHtml(label)}" loading="lazy">
            <p class="product-bundle__selected-name">${this.escapeHtml(
              label
            )}<span class="product-bundle__selected-price db fwsb">${moneyPrice}</span></p>
          </div>
          <button type="button" class="product-bundle__remove-item btn" data-variant-id="${variantId}"><svg class="at-icon"><use xlink:href="#icon-remove"></use></svg></button>
        `;
      }

      updateHiddenInputs() {
        if (!this.hiddenInputsWrap) return;
        this.hiddenInputsWrap.innerHTML = '';
        this.getSelectedRows().forEach((row, index) => {
          const idInput = document.createElement('input');
          idInput.type = 'hidden';
          idInput.name = `items[${index}][id]`;
          idInput.value = row.dataset.variantId;
          this.hiddenInputsWrap.appendChild(idInput);

          const qtyInput = document.createElement('input');
          qtyInput.type = 'hidden';
          qtyInput.name = `items[${index}][quantity]`;
          qtyInput.value = '1';
          this.hiddenInputsWrap.appendChild(qtyInput);
        });
      }

      updateState() {
        let total = 0;
        let compareTotal = 0;

        this.getSelectedRows().forEach((item) => {
          const variantId = item.dataset.variantId;
          const option = this.form.querySelector(`option[value="${variantId}"]`);
          if (!option) return;
          total += Number(option.dataset.price || 0);
          compareTotal += Number(option.dataset.compare || 0);
        });

        const selectedCount = this.getSelectedRows().length;
        const savings = Math.max(compareTotal - total, 0);
        if (this.selectedCount) this.selectedCount.textContent = selectedCount;
        this.totalPrice.innerHTML = this.formatMoney(total);
        if (this.savePrice) this.savePrice.innerHTML = this.formatMoney(savings);
        if (this.saveWrap) this.saveWrap.classList.toggle('hide', savings <= 0);
        this.submitButton.disabled = selectedCount < this.minSelect;
        this.rows.forEach((row) => {
          const button = row.querySelector('.product-bundle__add-item');
          const selectedOption = row.querySelector('.product-bundle__variant').selectedOptions[0];
          const alreadyAdded = selectedOption
            ? this.selectedList.querySelector(`[data-variant-id="${selectedOption.value}"]`)
            : false;
          button.disabled = selectedCount >= this.maxSelect || Boolean(alreadyAdded);
        });
        this.updateHiddenInputs();
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true' || this.submitButton.disabled) return;

        this.handleErrorMessage();
        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.spinner.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        const existingItemKeys = [];
        formData.forEach((_, key) => {
          if (key.startsWith('items[')) existingItemKeys.push(key);
        });
        existingItemKeys.forEach((key) => formData.delete(key));

        this.getSelectedRows().forEach((row, index) => {
          formData.append(`items[${index}][id]`, row.dataset.variantId);
          formData.append(`items[${index}][quantity]`, '1');
        });

        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }

        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.handleErrorMessage(response.description);
              return;
            }
            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }
            this.cart.renderContents(response);
          })
          .catch((error) => {
            console.error(error);
            this.handleErrorMessage('Unable to add bundle. Please try again.');
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            this.submitButton.removeAttribute('aria-disabled');
            this.spinner.classList.add('hidden');
            if (this.cart && this.cart.classList.contains('is-empty')) {
              this.cart.classList.remove('is-empty');
            }
            freeShippMsg();
          });
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.form.querySelector('.pform-error-wrap');
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage || this.errorMessageWrapper.querySelector('.pform-error-msg');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
        if (errorMessage) this.errorMessage.textContent = errorMessage;
      }

      formatMoney(amount) {
        if (
          typeof theme !== 'undefined' &&
          theme.Currency &&
          typeof theme.Currency.formatMoney === 'function'
        ) {
          return theme.Currency.formatMoney(amount, theme.moneyFormat);
        }
        return `${(Number(amount || 0) / 100).toFixed(2)}`;
      }

      escapeHtml(string) {
        const div = document.createElement('div');
        div.textContent = string;
        return div.innerHTML;
      }
    }
  );
}
