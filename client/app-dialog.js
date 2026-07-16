(() => {
  const state = {
    active: null,
    queue: [],
    returnFocus: null
  };

  function show(options) {
    return new Promise(resolve => {
      state.queue.push({ options: normalizeOptions(options), resolve });
      openNext();
    });
  }

  function normalizeOptions(options = {}) {
    return {
      type: options.type || 'alert',
      title: options.title || 'Notice',
      kicker: options.kicker || 'MODEL PROMPT FORGE',
      message: String(options.message || ''),
      confirmLabel: options.confirmLabel || 'OK',
      cancelLabel: options.cancelLabel || 'Cancel',
      inputLabel: options.inputLabel || 'Value',
      value: options.value == null ? '' : String(options.value),
      placeholder: options.placeholder || '',
      required: options.required === true,
      options: Array.isArray(options.options) ? options.options : []
    };
  }

  function openNext() {
    if (state.active || state.queue.length === 0) return;
    state.active = state.queue.shift();
    state.returnFocus = document.activeElement;
    const { options } = state.active;
    const modal = document.getElementById('app-dialog-modal');
    const inputField = document.getElementById('app-dialog-input-field');
    const selectField = document.getElementById('app-dialog-select-field');
    const input = document.getElementById('app-dialog-input');
    const select = document.getElementById('app-dialog-select');
    document.getElementById('app-dialog-kicker').textContent = options.kicker;
    document.getElementById('app-dialog-title').textContent = options.title;
    document.getElementById('app-dialog-message').textContent = options.message;
    document.getElementById('app-dialog-confirm').textContent = options.confirmLabel;
    document.getElementById('app-dialog-cancel').textContent = options.cancelLabel;
    document.getElementById('app-dialog-input-label').textContent = options.inputLabel;
    document.getElementById('app-dialog-select-label').textContent = options.inputLabel;
    document.getElementById('app-dialog-error').textContent = '';

    inputField.hidden = options.type !== 'prompt';
    selectField.hidden = options.type !== 'select';
    input.value = options.value;
    input.placeholder = options.placeholder;
    select.innerHTML = '';
    options.options.forEach(option => {
      const element = new Option(option.label, option.value);
      element.selected = String(option.value) === options.value;
      select.add(element);
    });

    const showCancel = options.type !== 'alert';
    document.getElementById('app-dialog-cancel').hidden = !showCancel;
    document.getElementById('app-dialog-close').setAttribute('aria-label', options.cancelLabel);
    modal.style.display = 'flex';
    document.body.classList.add('app-dialog-open');
    requestAnimationFrame(() => {
      if (options.type === 'prompt') input.focus();
      else if (options.type === 'select') select.focus();
      else document.getElementById('app-dialog-confirm').focus();
    });
  }

  function complete(confirmed) {
    if (!state.active) return;
    const { options, resolve } = state.active;
    const input = document.getElementById('app-dialog-input');
    const select = document.getElementById('app-dialog-select');
    if (confirmed && options.required && options.type === 'prompt' && !input.value.trim()) {
      document.getElementById('app-dialog-error').textContent = 'This field is required.';
      input.focus();
      return;
    }

    let result = confirmed;
    if (options.type === 'prompt') result = confirmed ? input.value : null;
    if (options.type === 'select') result = confirmed ? select.value : null;
    if (options.type === 'alert') result = true;

    document.getElementById('app-dialog-modal').style.display = 'none';
    document.body.classList.remove('app-dialog-open');
    state.active = null;
    const returnFocus = state.returnFocus;
    state.returnFocus = null;
    resolve(result);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    openNext();
  }

  function handleKeydown(event) {
    if (!state.active) return;
    const modal = document.getElementById('app-dialog-modal');
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      complete(false);
      return;
    }
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      event.stopImmediatePropagation();
      complete(true);
      return;
    }
    if (event.key !== 'Tab') return;
    event.stopImmediatePropagation();
    const focusable = [...modal.querySelectorAll('button:not([hidden]):not(:disabled), input:not([hidden]), select:not([hidden])')]
      .filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-dialog-confirm')?.addEventListener('click', () => complete(true));
    document.getElementById('app-dialog-cancel')?.addEventListener('click', () => complete(false));
    document.getElementById('app-dialog-close')?.addEventListener('click', () => complete(false));
    document.getElementById('app-dialog-modal')?.addEventListener('mousedown', event => {
      if (event.target.id === 'app-dialog-modal') complete(false);
    });
    document.addEventListener('keydown', handleKeydown);
  });

  window.AppDialog = {
    alert: (message, options = {}) => show({ ...options, type: 'alert', message }),
    confirm: (message, options = {}) => show({ ...options, type: 'confirm', message }),
    prompt: (message, options = {}) => show({ ...options, type: 'prompt', message }),
    select: (message, options = {}) => show({ ...options, type: 'select', message })
  };
})();
