// outer IIFE
(function(exports) {
'use strict';

// private storage for event queues using WeakMap
var events = new WeakMap();

// A simple Event Emitter prototype.  You can enhance any object to become an
// event emitter by adding the methods to the object's prototype or object:
//
// MyConstructor.prototype = Object.create(Emitter.prototype)
// -or-
// Emitter.mixin(MyConstructor.prototype);
// -or-
// Emitter.mixin(MyObject);
function Emitter() {
}


// add our prototype properties to an arbitrary object
Emitter.mixin = function(target) {
  // generate a non-enumerable property for each method
  for (var method in Emitter.prototype) {
    Object.defineProperty(target, method, {
      configurable: true,
      value: Emitter.prototype[method]
    });
  }
  return target;
};

// Create or generate event map for a type
function getEvents(object, type) {
  var map = events.get(object);
  if (!map) {
    map = {};
    events.set(object, map);
  }
  if (typeof type !== 'string') {
    throw new Error('Event type must be a string');
  }
  if (!map[type]) {
    map[type] = [];
  }
  return map[type];
}

Emitter.prototype.on = function(type, handler) {
  var events = getEvents(this, type);
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }
  events.push(handler);
  return this;
};

Emitter.prototype.off = function(type, handler) {
  var events = getEvents(this, type, true);
  if (!handler) {
    events.length = 0;
  } else {
    var index = events.indexOf(handler);
    if (index !== -1) {
      events.splice(index, 1);
    }
  }
  return this;
};

Emitter.prototype.emit = function(type, data) {
  var event;
  var events = getEvents(this, type, true).slice();

  if (events.length) {
    while (event = events.shift()) {
      event.call(this, data);
    }
  }
  return this;
};

// export our Emitter
exports.Emitter = Emitter;

// end outer IIFE
}(this));
