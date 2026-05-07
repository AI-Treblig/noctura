if (!customElements.get('share-button')) {
  customElements.define(
    'share-button',
    class ShareButton extends HTMLElement {
      constructor() {
        super();
        this.el = {
          shareButton: this.querySelector('button'),
          successMessage: this.querySelector('[id^="ShareMessage"]'),
          urlInput: this.querySelector('input'),
        };
        this.urlToShare = this.el.urlInput ? this.el.urlInput.value : document.location.href;
        this.querySelector('.copy_url').addEventListener('click', this.copyToClipboard.bind(this));
      }
      copyToClipboard() {
        navigator.clipboard.writeText(this.el.urlInput.value).then(() => {
          this.el.successMessage.classList.remove('hidden');
        });
      }
      updateUrl(url) {
        this.urlToShare = url;
        this.el.urlInput.value = url;
      }
    }
  );
}