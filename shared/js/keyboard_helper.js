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

var SETTINGS_KEYS = {
  ENABLED: 'keyboard.enabled-layouts',
  DEFAULT: 'keyboard.default-layouts'
};

var defaultKeyboardOrigin = 'app://keyboard.gaiamobile.org';
// support http:// version as well
if (location.protocol === 'http:') {
  defaultKeyboardOrigin = 'http://keyboard.gaiamobile.org:8080';
}


var currentSettings = {
  'default': {}
};

// until we load otherwise, asssume the default keyboards are en and number
currentSettings['default'][defaultKeyboardOrigin] = {
  en: true,
  number: true
};

currentSettings.enabled = map2d_clone(currentSettings['default']);

// helper functions for dealing with the 2d objects stored in currentSettings
function map2d_is(appOrigin, layoutId) {
  // force boolean true or false
  return !!(this[appOrigin] && this[appOrigin][layoutId]);
}

function map2d_set(appOrigin, layoutId) {
  if (!this[appOrigin]) {
    this[appOrigin] = {};
  }
  this[appOrigin][layoutId] = true;
}

function map2d_unset(appOrigin, layoutId) {
  if (!this[appOrigin]) {
    return;
  }
  delete this[appOrigin][layoutId];
  if (!Object.keys(this[appOrigin]).length) {
    delete this[appOrigin];
  }
}

function map2d_clone(obj) {
  var result = {};
  for (var key1 in obj) {
    result[key1] = {};
    for (var key2 in obj[key1]) {
      result[key1][key2] = obj[key1][key2];
    }
  }
  return result;
}

// callbacks when something changes
var currentApps;
var watchQueries = [];

function kh_updateWatchers(reason) {
  if (watchQueries.length) {
    KeyboardHelper.getApps(function withApps() {
      watchQueries.forEach(function(watch) {
        KeyboardHelper.getLayouts(watch.query, function(layouts) {
          watch.callback(layouts, reason);
        });
      });
    });
  }
}

// callbacks when settings are loaded
var loadedSettings = new Set();
var waitingForSettings = [];


function kh_loadedSetting(setting) {
  loadedSettings.add(setting);
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    waitingForSettings.forEach(function(callback) {
      callback();
    });
    waitingForSettings = [];
    kh_updateWatchers({ settings: true });
  }
}

function kh_withSettings(callback) {
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    callback();
  } else {
    waitingForSettings.push(callback);
  }
}

function kh_getSettings() {
  loadedSettings = new Set();
  var lock = window.navigator.mozSettings.createLock();
  lock.get(SETTINGS_KEYS.DEFAULT).onsuccess = kh_parseDefault;
  lock.get(SETTINGS_KEYS.ENABLED).onsuccess = kh_parseEnabled;
}

function kh_parseDefault() {
  var value = this.result[SETTINGS_KEYS.DEFAULT];
  if (value) {
    currentSettings['default'] = value;
  }
  kh_loadedSetting(SETTINGS_KEYS.DEFAULT);
}

function kh_parseEnabled() {
  var value = this.result[SETTINGS_KEYS.ENABLED];
  var needsSave = false;
  if (!value) {
    currentSettings.enabled = map2d_clone(currentSettings['default']);
    needsSave = true;
  } else {
    var type = typeof value;
    if (type === 'string') {
      try {
        currentSettings.enabled = {};
        var oldSettings = JSON.parse(value);
        oldSettings.forEach(function(layout) {
          if (layout.enabled) {
            map2d_set.call(currentSettings.enabled, layout.appOrigin,
              layout.layoutId);
          }
        });

        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('keyboardsrefresh', true, false, {});
        window.dispatchEvent(evt);
      } catch (e) {
        currentSettings.enabled = map2d_clone(currentSettings['default']);
        needsSave = true;
      }
    } else {
      currentSettings.enabled = value;
    }
  }

  kh_loadedSetting(SETTINGS_KEYS.ENABLED);

  if (needsSave) {
    KeyboardHelper.saveToSettings();
  }
}


function KeyboardLayout(options) {
  for (var key in options) {
    this[key] = options[key];
  }
}

Object.defineProperties(KeyboardLayout.prototype, {
  'default': {
    get: function() {
      return map2d_is.call(
        currentSettings['default'], this.app.origin, this.layoutId
      );
    }
  },
  enabled: {
    get: function() {
      return map2d_is.call(
        currentSettings.enabled, this.app.origin, this.layoutId
      );
    }
  }
});

var kh_SettingsHelper = {};
Object.defineProperties(kh_SettingsHelper, {
  'default': {
    get: function() {
      return map2d_clone(currentSettings['default']);
    },
    set: function(value) {
      currentSettings['default'] = map2d_clone(value);
    },
    enumerable: true
  },
  'enabled': {
    get: function() {
      return map2d_clone(currentSettings['enabled']);
    },
    set: function(value) {
      currentSettings['enabled'] = map2d_clone(value);
    },
    enumerable: true
  }
});

var KeyboardHelper = exports.KeyboardHelper = {
  keyboardSettings: [],

  settings: kh_SettingsHelper,

  init: function kh_init() {
    watchQueries = [];
    currentApps = undefined;
    // load the current settings, and watch for changes to settings
    var settings = window.navigator.mozSettings;
    if (settings) {
      kh_getSettings();
      settings.addObserver(SETTINGS_KEYS.ENABLED, kh_getSettings);
      settings.addObserver(SETTINGS_KEYS.DEFAULT, kh_getSettings);
    }

    window.addEventListener('applicationinstallsuccess', this);
    window.addEventListener('applicationuninstall', this);
  },

  handleEvent: function(event) {
    currentApps = undefined;
    kh_updateWatchers({ apps: true });
  },

  isKeyboardType: function kh_isKeyboardType(type) {
    return BASE_TYPES.has(type);
  },

  setLayoutEnabled: function kh_setLayoutEnabled(appOrigin, layoutId, enabled) {
    var method = enabled ? map2d_set : map2d_unset;
    method.call(currentSettings.enabled, appOrigin, layoutId);
    this.saveToSettings();
  },

  getLayoutEnabled: function kh_getLayoutEnabled(appOrigin, layoutId) {
    return map2d_is.call(currentSettings.enabled, appOrigin, layoutId);
  },

  saveToSettings: function ke_saveToSettings() {
    var toSet = {};
    toSet[SETTINGS_KEYS.ENABLED] = currentSettings.enabled;
    toSet[SETTINGS_KEYS.DEFAULT] = currentSettings['default'];
    window.navigator.mozSettings.createLock().set(toSet);
  },

  getApps: function kh_getApps(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt) {
      return;
    }

    if (currentApps) {
      return callback(currentApps);
    }

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var keyboardApps = event.target.result.filter(function filterApps(app) {
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


      if (keyboardApps.length) {
        // every time we get a list of apps, clean up the settings
        Object.keys(currentSettings.enabled)
          .concat(Object.keys(currentSettings['default']))
          .forEach(function(origin) {
            if (!keyboardApps.some(function(app) {
              return app.origin === origin;
            })) {
              delete currentSettings.enabled[origin];
              delete currentSettings['default'][origin];
            }
          });
        currentApps = keyboardApps;
        callback(keyboardApps);
      }
    };
  },

  getLayouts: function kh_getLayouts(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    function withApps(apps) {
      var layouts = apps.reduce(function eachApp(result, app) {

        var manifest = new ManifestHelper(app.manifest);
        for (var layoutId in manifest.entry_points) {
          var entryPoint = manifest.entry_points[layoutId];
          if (!entryPoint.types) {
            console.warn(app.origin, layoutId, 'did not declare type.');
            continue;
          }

          var layout = new KeyboardLayout({
            app: app,
            manifest: manifest,
            entryPoint: entryPoint,
            layoutId: layoutId
          });

          if (options['default'] && !layout['default']) {
            continue;
          }

          if (options.enabled && !layout.enabled) {
            continue;
          }

          if (options.type) {
            options.type = [].concat(options.type);
            // check for any type in our options to be any type in the layout
            if (!options.type.some(function(type) {
              return entryPoint.types.indexOf(type) !== -1;
            })) {
              continue;
            }
          }

          result.push(layout);
        }

        // sort the default query by most specific keyboard
        if (options['default']) {
          result.sort(function(a, b) {
            return a.entryPoint.types.length - b.entryPoint.types.length;
          });
        }
        return result;
      }, []);

      kh_withSettings(callback.bind(null, layouts));
    }

    this.getApps(withApps);
  },

  stopWatching: function() {
    watchQueries = [];
  },

  watchLayouts: function(query, callback) {
    if (typeof query === 'function') {
      callback = query;
      query = {};
    }

    var watch = {
      query: query,
      callback: callback
    };
    watchQueries.push(watch);

    this.getLayouts(query, function initialCall(layouts) {
      watch.layouts = layouts;
      callback(layouts, { apps: true, settings: true });
    });
  }
};

KeyboardHelper.init();

}(window));
