// Tests the keyboard_helper.js from shared
'use strict';

requireApp('system/shared/js/keyboard_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('KeyboardHelper', function() {
  var realMozSettings;
  var realMozApps;
  var SETTINGS_KEY = 'keyboard.enabled-layouts';
  var keyboardAppOrigin = 'http://keyboard.gaiamobile.org:8080';
  var standardKeyboards = [
    {
      origin: keyboardAppOrigin,
      manifest: {
        role: 'keyboard',
        entry_points: {
          en: {
            types: ['url', 'text'],
            launch_path: '/index.html#en'
          },
          es: {
            types: ['url', 'text'],
            launch_path: '/index.html#es'
          },
          fr: {
            types: ['url', 'text'],
            launch_path: '/index.html#fr'
          },
          pl: {
            types: ['url', 'text'],
            launch_path: '/index.html#pl'
          },
          number: {
            types: ['number'],
            launch_path: '/index.html#number'
          }
        }
      }
    }
  ];

  var defaultSettings = [
    {
      layoutId: 'en',
      appOrigin: keyboardAppOrigin,
      enabled: true
    },
    {
      layoutId: 'es',
      appOrigin: keyboardAppOrigin,
      enabled: false
    },
    {
      layoutId: 'fr',
      appOrigin: keyboardAppOrigin,
      enabled: false
    },
    {
      layoutId: 'pl',
      appOrigin: keyboardAppOrigin,
      enabled: false
    },
    {
      layoutId: 'number',
      appOrigin: keyboardAppOrigin,
      enabled: true
    }
  ];

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozSettings = navigator.mozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    MockNavigatorSettings.mSyncRepliesOnly = false;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    // reset KeyboardHelper each time
    KeyboardHelper.keyboardSettings = [];
    KeyboardHelper.init();
    this.keyboardsrefresh = this.sinon.spy();
    window.addEventListener('keyboardsrefresh', this.keyboardsrefresh);
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    window.removeEventListener('keyboardsrefresh', this.keyboardsrefresh);
  });

  test('observes settings', function() {
    assert.equal(MockNavigatorSettings.mObservers[SETTINGS_KEY].length, 1);
  });

  test('requests initial settings', function() {
    var requests = MockNavigatorSettings.mRequests;
    assert.equal(requests.length, 1);
    assert.ok(SETTINGS_KEY in requests[0].result);
  });

  suite('getInstalledKeyboards', function() {
    setup(function() {
      this.callback = this.sinon.spy();
      this.sinon.stub(navigator.mozApps.mgmt, 'getAll', function() {
        return {};
      });
      KeyboardHelper.getInstalledKeyboards(this.callback);
    });
    test('requests all apps from mozApps', function() {
      assert.isTrue(navigator.mozApps.mgmt.getAll.called);
    });
    test('never calls back if no response', function() {
      assert.isFalse(this.callback.called);
    });
    test('never calls back if no valid apps', function() {
      var request = navigator.mozApps.mgmt.getAll.returnValues[0];
      request.result = [];
      request.onsuccess({ target: request });
      assert.isFalse(this.callback.called);
    });
    test('correctly filters test data', function() {
      var request = navigator.mozApps.mgmt.getAll.returnValues[0];
      request.result = [
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifest: {
            role: 'keyboard',
            entry_points: {}
          }
        }, {
          origin: 'app://keyboard2.gaiamobile.org',
          manifest: {
            role: 'keyboard',
            entry_points: {}
          }
        },
        // invalid because it's system
        {
          origin: 'app://system.gaiamobile.org',
          manifest: {
            role: 'keyboard',
            entry_points: {}
          }
        },
        // invalid because there aren't entry_points
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifest: { role: 'keyboard' }
        },
        // invalid because it's not keyboard role
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifest: {
            role: 'notkeyboard',
            entry_points: {}
          }
        }
      ];
      // only the first 2 are valid
      var filtered = request.result.slice(0, 2);
      request.onsuccess({ target: request });
      assert.deepEqual(this.callback.args[0][0], filtered);
    });
  });

  suite('isBaseType', function() {
    ['text', 'url', 'email', 'password', 'number', 'option']
    .forEach(function(type) {
      test(type + ': true', function() {
        assert.isTrue(KeyboardHelper.isBaseType(type));
      });
    });

    ['not', 'base', 'type', undefined, 1]
    .forEach(function(type) {
      test(type + ': false', function() {
        assert.isFalse(KeyboardHelper.isBaseType(type));
      });
    });
  });

  suite('empty settings (create defaults)', function() {
    setup(function() {
      this.sinon.stub(KeyboardHelper, 'getInstalledKeyboards');
      MockNavigatorSettings.mReplyToRequests();
    });
    test('does not trigger keyboardsrefresh', function() {
      assert.isFalse(this.keyboardsrefresh.called);
    });
    test('requests installed keyboards to generate defaults', function() {
      assert.isTrue(KeyboardHelper.getInstalledKeyboards.called);
    });
    suite('got installed keyboards', function() {
      setup(function() {
        this.sinon.stub(KeyboardHelper, 'saveToSettings');
        // reply to the request for installed keyboards
        KeyboardHelper.getInstalledKeyboards.yield(standardKeyboards);
      });
      test('default settings loaded', function() {
        assert.deepEqual(KeyboardHelper.keyboardSettings, defaultSettings);
      });
      test('saves settings', function() {
        assert.isTrue(KeyboardHelper.saveToSettings.called);
      });
    });
  });

  suite('default settings', function() {
    setup(function() {
      this.sinon.spy(KeyboardHelper, 'saveToSettings');
      MockNavigatorSettings.mRequests[0].result[SETTINGS_KEY] =
        JSON.stringify(defaultSettings);
      MockNavigatorSettings.mReplyToRequests();
    });
    test('loaded settings properly', function() {
      assert.deepEqual(KeyboardHelper.keyboardSettings, defaultSettings);
    });
    test('does not save settings', function() {
      assert.isFalse(KeyboardHelper.saveToSettings.called);
    });
    test('es layout disabled (sanity check)', function() {
      assert.isFalse(KeyboardHelper.getLayoutEnabled(keyboardAppOrigin, 'es'));
    });
    suite('setLayoutEnabled', function() {
      setup(function() {
        KeyboardHelper.setLayoutEnabled(keyboardAppOrigin, 'es');
      });
      test('es layout enabled', function() {
        assert.isTrue(KeyboardHelper.getLayoutEnabled(keyboardAppOrigin, 'es'));
      });
      test('saves', function() {
        // saved
        assert.isTrue(KeyboardHelper.saveToSettings.called);
        // with the right data
        assert.equal(MockNavigatorSettings.mSettings[SETTINGS_KEY],
          JSON.stringify(KeyboardHelper.keyboardSettings));
        // and we requested to read it
        assert.equal(MockNavigatorSettings.mRequests.length, 1);
      });
      suite('save reloads settings', function() {
        setup(function() {
          this.oldSettings = KeyboardHelper.keyboardSettings;
          MockNavigatorSettings.mReplyToRequests();
        });
        test('new settings array', function() {
          assert.notEqual(KeyboardHelper.keyboardSettings, this.oldSettings);
        });
        test('same data', function() {
          assert.deepEqual(KeyboardHelper.keyboardSettings, this.oldSettings);
        });
      });
    });
  });

});
