/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to access manifest information with locale support.
 *
 * @constructor
 * @param {Object} manifest The app manifest.
 */

var ManifestHelper = function(manifest) {
  var locale = {};
  var localeRoot = {};

  if (manifest.locales) {
    var lang = document.documentElement.lang || '';

    locale = manifest.locales[lang] || {};
    localeRoot = manifest.locales[lang.split('-')[0]] || {};
  }

  function ManifestHelper_get(prop) {
    var value = locale[prop] || localeRoot[prop] || manifest[prop];
    if (typeof value === 'object') {
      return new ManifestHelper(value);
    }
    return value;
  }

  // Bind the localized property values.
  for (var prop in manifest) {
    Object.defineProperty(this, prop, {
      get: ManifestHelper_get.bind(null, prop),
      enumerable: true
    });
  }
};
