/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to find all installed keyboard apps and layouts.
 * (Need mozApps.mgmt permission)
 */

(function(exports) {

var BASE_TYPES = new Set([
  'text', 'url', 'email', 'password', 'number', 'option'
]);
var SETTINGS_KEY = 'keyboard.enabled-layouts';

// helper function to get a layout from appOrigin/layoutId
function kh_getLayout(appOrigin, layoutId) {
  var keyboards = KeyboardHelper.keyboardSettings;
  for (var index = 0; index < keyboards.length; index++) {
    if (keyboards[index].appOrigin === appOrigin &&
      keyboards[index].layoutId === layoutId) {
      return keyboards[index];
    }
  }
  return null;
}

// used to create the default settings in the event of a broken settings string
// or no value stored to the enabled-layouts settings
// Handle the case where we need to fill enabled keyboard ourselves
// (It should have been filled by FTU or Settings app)
// http://bugzil.la/863719
function kh_generateDefaultSettings() {
  KeyboardHelper.getInstalledKeyboards(function withInstalledKeyboards(apps) {
    KeyboardHelper.keyboardSettings = [];
    apps.forEach(function(app) {
      var entryPoints = app.manifest.entry_points;
      for (var key in entryPoints) {
        if (!entryPoints[key].types) {
          console.warn('the keyboard app did not declare type.');
          continue;
        }
        // for settings
        KeyboardHelper.keyboardSettings.push({
          layoutId: key,
          appOrigin: app.origin,
          enabled: false
        });
      }
    });

    var defaultLayout = [];

    var protocol = window.location.protocol;
    var hackOrigin = 'app://keyboard.gaiamobile.org';
    if (protocol === 'http:') {
      hackOrigin = 'http://keyboard.gaiamobile.org:8080';
    }

    defaultLayout.push({
      layoutId: 'en',
      appOrigin: hackOrigin
    });

    defaultLayout.push({
      layoutId: 'number',
      appOrigin: hackOrigin
    });

    for (var j = 0; j < defaultLayout.length; j++) {
      var layout = kh_getLayout(defaultLayout[j].appOrigin,
        defaultLayout[j].layoutId);
      if (layout) {
        layout.enabled = true;
      }
    }

    KeyboardHelper.saveToSettings();
  });
}

function kh_getSettings() {
  window.navigator.mozSettings.createLock().get(SETTINGS_KEY).onsuccess =
    kh_parseSettings;
}

function kh_parseSettings() {
  var value = this.result[SETTINGS_KEY];
  if (!value) {
    kh_generateDefaultSettings();
  } else {
    try {
      KeyboardHelper.keyboardSettings = JSON.parse(value);

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('keyboardsrefresh', true, false, {});
      window.dispatchEvent(evt);
    } catch (e) {
      kh_generateDefaultSettings();
    }
  }
}

var KeyboardHelper = exports.KeyboardHelper = {
  keyboardSettings: [],

  init: function kh_init() {
    // load the current settings, and watch for changes to settings
    kh_getSettings();

    var settings = window.navigator.mozSettings;
    if (settings) {
      settings.addObserver(SETTINGS_KEY, kh_getSettings);
    }
  },

  isBaseType: function kh_isBaseType(type) {
    return BASE_TYPES.has(type);
  },

  setLayoutEnabled: function kh_setLayoutEnabled(appOrigin, layoutId, enabled) {
    var layout = kh_getLayout(appOrigin, layoutId);
    if (layout) {
      layout.enabled = true;
      this.saveToSettings();
    }
  },

  getLayoutEnabled: function kh_getLayoutEnabled(appOrigin, layoutId) {
    var layout = kh_getLayout(appOrigin, layoutId);
    // always return boolean true or false
    return !!(layout && layout.enabled);
  },

  saveToSettings: function ke_saveToSettings() {
    var toSet = {};
    toSet[SETTINGS_KEY] = JSON.stringify(this.keyboardSettings);
    window.navigator.mozSettings.createLock().set(toSet);
  },

  getInstalledKeyboards: function kh_getInstalledKeyboards(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt)
      return;

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var keyboardApps = event.target.result.filter(function eachApp(app) {
        // keyboard apps will set role as 'keyboard'
        // https://wiki.mozilla.org/WebAPI/KeboardIME#Proposed_Manifest_of_a_3rd-Party_IME
        if (!app.manifest || 'keyboard' !== app.manifest.role) {
          return;
        }
        //XXX remove this hard code check if one day system app no longer
        //    use mozKeyboard API
        if (app.origin === 'app://system.gaiamobile.org') {
          return;
        }
        // all keyboard apps should define its layout(s) in entry_points section
        if (!app.manifest.entry_points) {
          return;
        }
        return true;
      });

      if (keyboardApps.length && callback) {
        callback(keyboardApps);
      }
    };
  }
};

exports.KeyboardHelper.init();

}(window));

