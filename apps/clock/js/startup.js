(function(exports) {
'use strict';

// eventually after some refactoring, this should be replaced with
// App.init.bind(App)
function initialize() {
  // after all the needed files have been loaded
  // and l10n has happened this will be called
  App.init();

  // all three of these should disappear as we refactor
  ClockView.init();
  AlarmList.init();
  ActiveAlarm.init();
}

var loadQueue = [
  'shared/js/async_storage.js',
  'shared/js/template.js',
  'js/emitter.js',
  'js/view.js',
  'js/panel.js',
  'js/constants.js',
  'js/utils.js',
  'js/alarm.js',
  'js/active_alarm.js',
  'js/alarmsdb.js',
  'js/clock_view.js',
  'js/alarm_list.js',
  'js/alarm_manager.js',
  'js/tabs.js',
  'js/app.js'
];

var needsMocks = !navigator.mozAlarms;

if (needsMocks) {
  loadQueue.push('test/unit/mocks/mock_mozAlarm.js');
}

LazyLoader.load(loadQueue, function() {
  if (needsMocks) {
    navigator.mozAlarms = new MockMozAlarms(function() {});
  }
  navigator.mozL10n.ready(initialize);
});

// end outer IIFE
}(this));
