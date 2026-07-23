(() => {
  'use strict';

  window.FA_ASSETS = window.FA_ASSETS || {};
  window.FA_ASSET_CHUNKS = window.FA_ASSET_CHUNKS || {
    open: [],
    closed: []
  };

  const openChunks = window.FA_ASSET_CHUNKS.open || [];
  const closedChunks = window.FA_ASSET_CHUNKS.closed || [];

  if (openChunks.length) {
    window.FA_ASSETS.cowrie_open_real =
      'data:image/webp;base64,' + openChunks.join('');
  }

  if (closedChunks.length) {
    window.FA_ASSETS.cowrie_closed_real =
      'data:image/webp;base64,' + closedChunks.join('');
  }

  window.FA_ASSETS.cowrie_open_flutter_clean =
    window.FA_ASSETS.cowrie_open_real;
  window.FA_ASSETS.cowrie_closed_flutter_clean =
    window.FA_ASSETS.cowrie_closed_real;

  window.FA_REAL_COWRIES_VERSION = '20260723-fa-flutter-v8';
})();
