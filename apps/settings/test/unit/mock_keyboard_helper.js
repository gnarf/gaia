'use strict';

var MockKeyboardHelper = {
  mSetup: function() {
    this.watchCallback = null;
    this.keyboards = [
      {
        origin: 'app://app1.gaiamobile.org',
        manifest: {
          name: 'app1',
          description: 'app1',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
            'layout1': {
              'name': 'layout1',
              'launch_path': '/index.html#layout1',
              'description': 'layout1',
              'types': ['url', 'text'],
              enabled: true,
              'default': true
            },
            'layout2': {
              'name': 'layout2',
              'launch_path': '/index.html#layout2',
              'description': 'layout2',
              'types': ['number', 'text']
            }
          }
        }
      },
      {
        origin: 'app://app2.gaiamobile.org',
        manifest: {
          name: 'app2',
          description: 'app2',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
            'layout1': {
              'name': 'layout1',
              'launch_path': '/index.html#layout1',
              'description': 'layout1',
              'types': ['url']
            }
          }
        }
      },
      {
        origin: 'app://app3.gaiamobile.org',
        manifest: {
          name: 'app3',
          description: 'app3',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
            'layout1': {
              'name': 'layout1',
              'launch_path': '/index.html#layout1',
              'description': 'layout1',
              'types': ['number'],
              enabled: true,
              'default': true
            }
          }
        }
      }
    ];

    this.layouts = this.keyboards.reduce(function(carry, keyboard) {
      var entryPoints = Object.keys(keyboard.manifest.entry_points);
      var layouts = entryPoints.map(function(layoutId) {
        var entryPoint = keyboard.manifest.entry_points[layoutId];
        return {
          app: keyboard,
          manifest: keyboard.manifest,
          entryPoint: entryPoint,
          layoutId: layoutId,
          enabled: entryPoint.enabled,
          'default': entryPoint['default']
        };

      });

      return carry.concat(layouts);
    }, []);
  },
  stopWatching: function() {
    this.watchCallback = null;
  },
  watchLayouts: function(callback) {
    this.watchCallback = callback;
    callback(this.layouts, { apps: true, settings: true });
  },
  checkDefaults: function() {},
  setLayoutEnabled: function(appOrigin, layoutId, enabled) {
    this.layouts.some(function eachLayout(layout) {
      if (layout.app.origin === appOrigin && layout.layoutId === layoutId) {
        layout.enabled = enabled;
        return true;
      }
    });
  },
  saveToSettings: function() {
    if (this.watchCallback) {
      this.watchCallback(this.layouts, { settings: true });
    }
  }
};

MockKeyboardHelper.mSuiteSetup = MockKeyboardHelper.mSetup;
