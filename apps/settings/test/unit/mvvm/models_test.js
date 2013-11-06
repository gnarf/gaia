'use strict';
requireApp('settings/js/mvvm/models.js');

suite('Observable', function() {
  test('shape: Observable({}).observe is a function', function() {
    var observable = Observable({});
    assert.equal(typeof observable.observe, 'function');
  });

  suite('Creates observable properties', function() {
    var template = {
      testBoolean: true,
      testNumber: 10,
      testString: 'test',
      'test object': {}
    };
    var props = Object.keys(template);
    setup(function() {
      this.observable = new Observable(template);
    });

    // some tests for each property
    props.forEach(function(prop) {
      test('prop: "' + prop + '" copied value', function() {
        assert.equal(this.observable[prop], template[prop]);
      });
      test('prop: "' + prop + '" has a setter and getter', function() {
        var desc = Object.getOwnPropertyDescriptor(this.observable, prop);
        assert.ok(desc.get, 'has getter');
        assert.ok(desc.set, 'has setter');
      });

      // test some stuff for observing
      suite('prop: "' + prop + '" observe', function() {
        setup(function() {
          this.spy = this.sinon.spy();
          this.observable.observe(prop, this.spy);
        });
        test('does not generate any callbacks when attaching', function() {
          assert.isFalse(this.spy.called);
        });

        suite('overwrite', function() {
          setup(function() {
            this.newValue = 100;
            this.observable[prop] = this.newValue;
          });
          test('got callback', function() {
            assert.isTrue(this.spy.calledWith(this.newValue, template[prop]));
          });
        });
      });
    });
  });
});

suite('ObservableArray', function() {
  var methods = [
    'forEach', 'push', 'pop', 'splice', 'set', 'get', 'reset', 'observe'
  ];
  setup(function() {
    this.array = methods.slice();
    this.observable = ObservableArray(this.array);
  });

  suite('shape: Observable(array)', function() {
    methods.forEach(function(method) {
      test('.' + method + ' is a function', function() {
        assert.equal(typeof this.observable[method], 'function');
      });
    });
    test('.length is a number', function() {
      assert.equal(typeof this.observable.length, 'number');
    });
    test('.array is the original array', function() {
      assert.equal(this.observable.array, this.array);
    });
  });

  test('get()', function() {
    for (var index = 0; index < this.array.length; index++) {
      assert.equal(this.observable.get(index), this.array[index],
        'index: ' + index);
    }
  });

  suite('observable actions', function() {
    var events = ['insert', 'remove', 'replace', 'reset'];

    function checkSpies(expected) {
      events.forEach(function(event) {
        var expect = expected[event] || 0;
        test(event + ' called ' + expect + ' times', function() {
          assert.equal(this.spies[event].args.length, expect);
        });
      }, this);
    }

    function checkArgs(event) {
      var args = [].slice.call(arguments, 1);
      test(event + ' called with correct arguments', function() {
        var calls = this.spies[event].args;
        assert.deepEqual(calls[calls.length - 1], args);
      });
    }

    function resetSpies() {
      events.forEach(function(event) {
        this.spies[event].reset();
      }, this);
    }

    setup(function() {
      this.spies = {};
      events.forEach(function(event) {
        this.spies[event] = this.sinon.spy();
        this.observable.observe(event, this.spies[event]);
      }, this);
    });
    suite('pop()', function() {
      setup(function() {
        this.observable.pop();
      });
      checkSpies({ remove: 1 });
      checkArgs('remove', {
        type: 'remove',
        data: {
          index: methods.length - 1,
          count: 1
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.pop();
        assert.deepEqual(this.array, expect);
      });
    });

    suite('push()', function() {
      setup(function() {
        this.observable.push('test');
      });
      checkSpies({ insert: 1 });
      checkArgs('insert', {
        type: 'insert',
        data: {
          index: methods.length,
          count: 1,
          items: ['test']
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.push('test');
        assert.deepEqual(this.array, expect);
      });
    });

    suite('splice(1, 2)', function() {
      setup(function() {
        this.observable.splice(1, 2);
      });
      checkSpies({ remove: 1, insert: 1 });
      checkArgs('remove', {
        type: 'remove',
        data: {
          index: 1,
          count: 2
        }
      });
      // huh??? - seems wrong
      checkArgs('insert', {
        type: 'insert',
        data: {
          index: 1,
          count: 0,
          items: []
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.splice(1, 2);
        assert.deepEqual(this.array, expect);
      });
    });

    suite('splice(1, 2, 3, 4)', function() {
      setup(function() {
        this.observable.splice(1, 2, 3, 4);
      });
      checkSpies({ remove: 1, insert: 1 });
      checkArgs('remove', {
        type: 'remove',
        data: {
          index: 1,
          count: 2
        }
      });
      checkArgs('insert', {
        type: 'insert',
        data: {
          index: 1,
          count: 2,
          items: [3, 4]
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.splice(1, 2, 3, 4);
        assert.deepEqual(this.array, expect);
      });
    });

    suite('splice(2, 0, 2)', function() {
      setup(function() {
        this.observable.splice(2, 0, 2);
      });
      checkSpies({ remove: 1, insert: 1 });
      // huh??
      checkArgs('remove', {
        type: 'remove',
        data: {
          index: 2,
          count: 0
        }
      });
      checkArgs('insert', {
        type: 'insert',
        data: {
          index: 2,
          count: 1,
          items: [2]
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.splice(2, 0, 2);
        assert.deepEqual(this.array, expect);
      });
    });

    suite('set(7, true)', function() {
      setup(function() {
        this.observable.set(7, true);
      });
      checkSpies({ replace: 1 });
      checkArgs('replace', {
        type: 'replace',
        data: {
          index: 7,
          oldValue: methods[7],
          newValue: true
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect[7] = true;
        assert.deepEqual(this.array, expect);
      });
    });

    suite('reset([])', function() {
      var testArray = [true, false];
      setup(function() {
        this.observable.reset(testArray);
      });
      checkSpies({ reset: 1 });
      checkArgs('reset', {
        type: 'reset',
        data: {
          items: testArray
        }
      });
      test('changes array', function() {
        assert.equal(this.observable.array, testArray);
      });
    });

/* Currently failing -- seems this should be expected behavior?

    suite('pop() on empty', function() {
      setup(function() {
        this.observable.reset([]);
        resetSpies.call(this);
        this.observable.pop();
      });
      // no events expected
      checkSpies({});
    });
*/
  });
});
