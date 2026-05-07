if (!customElements.get('product-bundel')) {
    customElements.define('product-bundel', class ProductForm extends HTMLElement {
        constructor() {
            super();
  
            this.form = this.querySelector('form');
            this.form.querySelector('.fbtVriants').disabled = false;
            this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
            this.cart = document.querySelector('cart-drawer');
            this.submitButton = this.querySelector('.upsellAddToCart');
            if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
            this.productBundleSelect();
        }

        onSubmitHandler(evt) {
            evt.preventDefault();
            if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

            this.handleErrorMessage();

            this.submitButton.setAttribute('aria-disabled', true);
            this.submitButton.classList.add('loading');
            this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

            const config = fetchConfig('javascript');
            config.headers['X-Requested-With'] = 'XMLHttpRequest';
            delete config.headers['Content-Type'];

            const formData = new FormData(this.form);
            if (this.cart){
                formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
                formData.append('sections_url', window.location.pathname);
                this.cart.setActiveElement(document.activeElement);
            }
            config.body = formData;

            fetch(`${routes.cart_add_url}`, config)
                .then((response) => response.json())
                .then((response) => {
                    if (response.status) {
                        this.handleErrorMessage(response.description);

                        const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
                        if (!soldOutMessage) return;
                        this.submitButton.setAttribute('aria-disabled', true);
                        this.submitButton.querySelector('span').classList.add('hidden');
                        soldOutMessage.classList.remove('hidden');
                        this.error = true;
                        return;
                    } else if (!this.cart) {
                        window.location = window.routes.cart_url;
                        return;
                    }

                    this.error = false;
                    const quickAddModal = this.closest('quick-add-modal');
                    this.cart.renderContents(response);
                })
                .catch((e) => {
                    console.error(e);
                })
                .finally(() => {
                    this.submitButton.classList.remove('loading');
                    if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
                    if (!this.error) this.submitButton.removeAttribute('aria-disabled');
                    this.querySelector('.loading-overlay__spinner').classList.add('hidden');
                    freeShippMsg();
                });
        }

        handleErrorMessage(errorMessage = false) {
            this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.pform-error-wrap');
            if (!this.errorMessageWrapper) return;
            this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.pform-error-msg');

            this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

            if (errorMessage) {
                this.errorMessage.textContent = errorMessage;
            }
        }

        productBundleSelect(){
          var labels = this.querySelectorAll('.fbtlbl'),
              selectOpt = this.querySelectorAll('.fbtVriants');

          labels.forEach((label) => {
            var col = label.closest('.fbdata'),
                selctDd = col.querySelector('.fbtVriants'),
                checkbox = label.querySelector('.fbtCheck'),
                image = document.getElementById(selctDd.getAttribute('data-id'));
            label.addEventListener("click",(event) => {
              if (checkbox.checked == true){
                  col.classList.add('checked');
                  image.classList.remove('disable');
                  selctDd.disabled = false;
                  //fbt_update(fbtVr, true);
              } else {
                  col.classList.remove('checked');
                  image.classList.add('disable');
                  selctDd.disabled = true;
                  //fbt_update(fbtVr, false);
              }
              this.totalPrice();
            });
          });

          selectOpt.forEach((select) => {
            select.addEventListener("change",(event) => {
                var target = event.target.options[event.target.selectedIndex],
                    col = target.closest('.fbdata'),
                    price = target.dataset.price,
                    cmprice = target.dataset.cmprice,
                    totalPrice = 0,
                    priceDiv = col.querySelector('.price'),
                    cmpriceDiv = col.querySelector('.cmprice'),
                    image = target.getAttribute('data-img'),
                    imgTag = document.getElementById(select.getAttribute('data-id'));

                priceDiv.innerHTML = theme.Currency.formatMoney(price, theme.moneyFormat);
                if(cmprice > price){
                  cmpriceDiv.classList.remove('hide');
                  cmpriceDiv.innerHTML = theme.Currency.formatMoney(cmprice, theme.moneyFormat);
                } else {
                  cmpriceDiv.classList.add('hide');
                }

                totalPrice = totalPrice+parseInt(price);

                if(image){
                  imgTag.setAttribute("src", image);
                }
                this.totalPrice();
            });
         });
        }
        totalPrice(price, df){
          var total = 0,
              cmtotal = 0,
              selectOpt = this.querySelectorAll('.fbtVriants'),
              fbtTotal = document.querySelector('.fbtTotal'),
              fbtCmTotal = document.querySelector('.fbtCmTotal');
          selectOpt.forEach((select) => {
            if(!select.disabled){
              var option = select.options[select.selectedIndex],
                  price = option.dataset.price,
                  cmprice = option.dataset.cmprice;
              total = total + Number(price);
              cmtotal = cmtotal + Number(cmprice);
            }
         });
          fbtTotal.innerHTML = theme.Currency.formatMoney(total, theme.moneyFormat);
          if(cmtotal > total){
            fbtCmTotal.classList.remove('hide');
            fbtCmTotal.innerHTML = theme.Currency.formatMoney(cmtotal, theme.moneyFormat);
          } else {
            fbtCmTotal.classList.add('hide');
          }
          if(theme.mlcurrency) currenciesChange(document.querySelectorAll('.fbtGroup span.money'));
        }
    });
}