/* RX SUBZERO: a progressively enhanced, manually controlled photo explorer. */
(function (window, document) {
  'use strict';

  function initExplorer(explorer) {
    if (explorer.hasAttribute('data-explorer-ready')) return;
    var slides = Array.prototype.slice.call(explorer.querySelectorAll('[data-explorer-slide]'));
    var buttons = Array.prototype.slice.call(explorer.querySelectorAll('[data-explorer-select]'));
    var stage = explorer.querySelector('[data-explorer-stage]');
    var controls = explorer.querySelector('[data-explorer-controls]');
    var zoom = explorer.querySelector('[data-explorer-zoom]');
    var dialog = explorer.querySelector('[data-explorer-dialog]');
    var zoomMedia = explorer.querySelector('[data-explorer-zoom-media]');
    var dialogTitle = explorer.querySelector('[data-explorer-dialog-title]');
    var dialogCaption = explorer.querySelector('[data-explorer-dialog-caption]');
    var dialogStatus = explorer.querySelector('[data-explorer-dialog-status]');
    var status = explorer.querySelector('[data-explorer-status]');
    var counts = explorer.querySelectorAll('[data-explorer-count]');
    if (!stage || !controls || !slides.length || buttons.length !== slides.length) return;

    var active = Math.max(0, slides.findIndex(function (slide) { return !slide.hidden; }));
    var requested = active;
    var version = 0;
    var cancelPending = null;
    var failed = false;
    var pointer = null;
    var locked = false;
    var savedRootOverflow = '';
    var savedBodyOverflow = '';
    var zoomImage = null;
    var zoomCaption = null;
    var zoomIndex = -1;
    var zoomSource = '';
    var zoomVersion = 0;
    var cancelZoomPending = null;
    var zoomFailed = false;

    function translation(key, fallback) {
      return (window.RXSZ && window.RXSZ.t(key)) || fallback;
    }

    function viewName() {
      var label = buttons[active].querySelector('[data-i18n]') || buttons[active];
      return label.textContent.trim();
    }

    function updateStatus() {
      var message = failed
        ? translation('explorer.load_error', 'This photo could not be loaded. Please try another view.')
        : translation('explorer.status', 'View {current} of {total}: {name}')
          .replace(/\{current\}/g, String(active + 1))
          .replace(/\{total\}/g, String(slides.length))
          .replace(/\{name\}/g, viewName());
      if (status) status.textContent = message;
      if (dialogStatus) {
        var dialogMessage = failed ? message : (zoomFailed
          ? translation('explorer.zoom_error', 'The larger photo could not be loaded. The current photo is still available.')
          : '');
        dialogStatus.textContent = dialog && dialog.open ? dialogMessage : '';
        dialogStatus.hidden = !dialogStatus.textContent;
      }
      Array.prototype.forEach.call(counts, function (count) {
        count.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      });
    }

    function syncDialog() {
      if (!dialog || !dialog.open || !zoomMedia) return;
      var original = slides[active].querySelector('img');
      if (!original) return;
      if (!zoomImage || zoomIndex !== active || zoomSource !== original.src) {
        var request = ++zoomVersion;
        if (cancelZoomPending) { cancelZoomPending(); cancelZoomPending = null; }
        zoomIndex = active;
        zoomSource = original.src;
        zoomFailed = false;
        // Start with the responsive source already decoded for the visible slide.
        // A separate image upgrades quality only after its download succeeds.
        zoomImage = document.createElement('img');
        zoomImage.src = original.currentSrc || original.src;
        zoomImage.decoding = 'async';
        zoomImage.loading = 'eager';
        zoomImage.draggable = false;
        zoomCaption = dialogCaption || document.createElement('p');
        if (dialogCaption) zoomMedia.replaceChildren(zoomImage);
        else {
          zoomCaption.className = 'rxsz-explorer__zoom-caption';
          zoomMedia.replaceChildren(zoomImage, zoomCaption);
        }
        if (zoomImage.src !== original.src) {
          var fullImage = document.createElement('img');
          fullImage.decoding = 'async';
          fullImage.draggable = false;
          fullImage.src = original.src;
          var loading = imageReady(fullImage);
          var selectedView = active;
          cancelZoomPending = loading.cancel;
          loading.promise.then(function () {
            if (request !== zoomVersion || !dialog.open || selectedView !== active) return;
            cancelZoomPending = null;
            fullImage.alt = zoomImage.alt;
            zoomImage.replaceWith(fullImage);
            zoomImage = fullImage;
            updateStatus();
          }).catch(function () {
            if (request !== zoomVersion || !dialog.open || selectedView !== active) return;
            cancelZoomPending = null;
            zoomFailed = true;
            updateStatus();
          });
        }
        updateStatus();
      }
      zoomImage.alt = original.alt;
      var caption = slides[active].querySelector('[data-explorer-caption]');
      zoomCaption.textContent = caption ? caption.textContent.trim() : '';
      if (dialogTitle) dialogTitle.textContent = viewName();
    }

    function sync() {
      slides.forEach(function (slide, index) {
        slide.hidden = index !== active;
        slide.inert = index !== active;
        slide.classList.remove('is-entering');
      });
      buttons.forEach(function (button, index) {
        button.setAttribute('aria-pressed', String(index === active));
      });
      updateStatus();
      syncDialog();
    }

    function imageReady(image) {
      var cancel;
      var promise = new Promise(function (resolve, reject) {
        var settled = false;
        var timer;
        function finish(error) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          image.removeEventListener('load', loaded);
          image.removeEventListener('error', errored);
          if (error) reject(error);
          else resolve();
        }
        function loaded() { finish(image.naturalWidth ? null : new Error('Empty photo')); }
        function errored() { finish(new Error('Photo unavailable')); }
        cancel = function () { finish(new Error('Photo request superseded')); };
        timer = window.setTimeout(function () { finish(new Error('Photo timed out')); }, 15000);
        image.loading = 'eager';
        // A broken request stays broken when decode() is called again. Reassigning
        // its source starts a new request, while an in-flight image is left alone.
        if (image.complete && !image.naturalWidth) {
          if (image.hasAttribute('srcset')) image.srcset = image.getAttribute('srcset');
          image.src = image.getAttribute('src');
        }
        if (typeof image.decode === 'function') {
          Promise.resolve().then(function () { return image.decode(); }).then(loaded, errored);
        } else if (image.complete) {
          loaded();
        } else {
          image.addEventListener('load', loaded);
          image.addEventListener('error', errored);
        }
      });
      return { promise: promise, cancel: cancel };
    }

    function select(index, moveFocus) {
      index = (index + slides.length) % slides.length;
      var request = ++version;
      if (cancelPending) { cancelPending(); cancelPending = null; }
      requested = index;
      failed = false;
      // Keyboard intent moves focus now; a later decode must not reclaim it.
      if (moveFocus) buttons[index].focus({ preventScroll: true });
      explorer.removeAttribute('data-explorer-error');
      stage.setAttribute('aria-busy', 'false');
      updateStatus();
      // Choosing the visible view also cancels any other photo still loading.
      if (index === active) {
        return;
      }
      var image = slides[index].querySelector('img');
      if (!image) return;
      stage.setAttribute('aria-busy', 'true');
      var loading = imageReady(image);
      cancelPending = loading.cancel;
      loading.promise.then(function () {
        if (request !== version) return;
        cancelPending = null;
        active = index;
        stage.setAttribute('aria-busy', 'false');
        sync();
        slides[active].classList.add('is-entering');
      }).catch(function () {
        if (request !== version) return;
        cancelPending = null;
        requested = active;
        failed = true;
        explorer.setAttribute('data-explorer-error', '');
        stage.setAttribute('aria-busy', 'false');
        updateStatus();
      });
    }

    function releaseDialog() {
      if (!locked || (dialog && dialog.open)) return;
      locked = false;
      document.documentElement.style.overflow = savedRootOverflow;
      document.body.style.overflow = savedBodyOverflow;
      ++zoomVersion;
      if (cancelZoomPending) { cancelZoomPending(); cancelZoomPending = null; }
      if (zoomMedia) zoomMedia.replaceChildren();
      zoomImage = null;
      zoomCaption = null;
      zoomIndex = -1;
      zoomSource = '';
      zoomFailed = false;
      if (dialogStatus) { dialogStatus.textContent = ''; dialogStatus.hidden = true; }
      if (zoom) zoom.focus({ preventScroll: true });
    }

    function openDialog() {
      if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
      // A queued close event may not have restored scrolling yet.
      if (locked) releaseDialog();
      savedRootOverflow = document.documentElement.style.overflow;
      savedBodyOverflow = document.body.style.overflow;
      dialog.showModal();
      locked = true;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      syncDialog();
      updateStatus();
    }

    function closeDialog() {
      if (!dialog) return;
      dialog.close();
      releaseDialog();
    }

    explorer.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button || !explorer.contains(button)) return;
      if (button.hasAttribute('data-explorer-select')) {
        var index = Number(button.getAttribute('data-explorer-select'));
        if (Number.isInteger(index) && index >= 0 && index < slides.length) select(index);
      } else if (button.hasAttribute('data-explorer-prev')) select(requested - 1);
      else if (button.hasAttribute('data-explorer-next')) select(requested + 1);
      else if (button.hasAttribute('data-explorer-zoom')) openDialog();
      else if (button.hasAttribute('data-explorer-close')) closeDialog();
    });

    explorer.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var scope = event.target.closest('[data-explorer-stage], [data-explorer-picker], [data-explorer-dialog]');
      if (!scope || !explorer.contains(scope)) return;
      var index;
      if (event.key === 'ArrowLeft') index = requested - 1;
      else if (event.key === 'ArrowRight') index = requested + 1;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = slides.length - 1;
      else return;
      event.preventDefault();
      select(index, !!event.target.closest('[data-explorer-picker]'));
    });

    stage.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || event.button !== 0 || event.target.closest('button, a, input, select, textarea, [contenteditable]')) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointerup', function (event) {
      if (!pointer || event.pointerId !== pointer.id) return;
      var deltaX = event.clientX - pointer.x;
      var deltaY = event.clientY - pointer.y;
      pointer = null;
      if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
        select(requested + (deltaX < 0 ? 1 : -1));
      }
    });
    stage.addEventListener('pointercancel', function () { pointer = null; });
    stage.addEventListener('lostpointercapture', function () { pointer = null; });

    if (dialog) {
      dialog.addEventListener('close', releaseDialog);
      dialog.addEventListener('cancel', function (event) {
        event.preventDefault();
        closeDialog();
      });
    }
    document.addEventListener('rxsz:langchange', function () {
      updateStatus();
      syncDialog();
    });
    slides.forEach(function (slide) {
      var image = slide.querySelector('img');
      if (image) image.draggable = false;
    });
    sync();
    stage.tabIndex = 0;
    controls.hidden = false;
    if (zoom && dialog && typeof dialog.showModal === 'function') zoom.hidden = false;
    explorer.setAttribute('data-explorer-ready', 'true');
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-explorer]'), initExplorer);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window, document);
