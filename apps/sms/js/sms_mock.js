/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */
(function(window) {
  var MockNavigatormozMobileMessage = window.DesktopMockNavigatormozMobileMessage = {};

  var outstandingRequests = 0;
  var requests = {};
  function getTestFile(filename, callback) {
    if (!requests[filename]) {
      requests[filename] = [];
      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onreadystatechange = function() {
        if (req.readyState === 4 && req.status === 200) {
          requests[filename].forEach(function(callback) {
            callback(req.response);
            requests[filename].data = req.response;
          });
          // we called em, no need to store anymore
          requests[filename].length = 0;
        }
        outstandingRequests--;
        if (!outstandingRequests) {
          doneCallbacks.forEach(function(callback) {
            callback();
          });
          doneCallbacks.length = 0;
        }
      };
      requests[filename].push(callback);
      outstandingRequests++;
      req.send();
    } else {
      if (requests[filename].data) {
        callback(requests[filename].data);
      } else {
        requests[filename].push(callback);
      }
    }
  }

  var doneCallbacks = [];
  MockNavigatormozMobileMessage._doneLoadingData = function(callback) {
    if (!outstandingRequests) {
      callback();
    } else {
      doneCallbacks.push(callback);
    }
  };

  getTestFile('/test/unit/media/kitten-450.jpg', function(testImageBlob) {
    messagesDb.messages.push({
      sender: '052780',
      type: 'mms',
      subject: 'test mms message subject',
      smil: '<smil><body><par><img src="example.jpg"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a test message'], { type: 'text/plain' })
      },{
        location: 'example.jpg',
        content: testImageBlob
      }],
      timestamp: new Date()
    });
    messagesDb.threads.push({
      senderOrReceiver: '052780',
      subject: 'Test MMS Image message',
      type: 'mms',
      timestamp: new Date()
    });
  });

  // Fake in-memory message database
  var messagesDb = {
    id: 0,
    messages: [
      {
        threadId: 1,
        sender: null,
        receiver: '1977',
        body: 'Alo, how are you today, my friend? :)',
        delivery: 'sent',
        read: true,
        timestamp: new Date(Date.now())
      },
      {
        threadId: 1,
        sender: null,
        receiver: '1977',
        body: 'arr :)',
        delivery: 'sent',
        read: true,
        timestamp: new Date(Date.now() - 8400000000)
      },
      {
        threadId: 2,
        sender: null,
        receiver: '436797',
        body: 'Sending :)',
        delivery: 'sending',
        timestamp: new Date(Date.now() - 172800000)
      },
      {
        threadId: 3,
        sender: null,
        receiver: '197743697',
        body: 'Nothing :)',
        delivery: 'sent',
        timestamp: new Date(Date.now() - 652800000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'Error message:)',
        delivery: 'sending',
        error: true,
        timestamp: new Date(Date.now() - 822800000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'sent',
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'error',
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        threadId: 4,
        sender: '197746797',
        body: 'Recibido!',
        delivery: 'received',
        timestamp: new Date(Date.now() - 50000000)
      }
    ],
    threads: [
      {
        id: 1,
        participants: ['1977'],
        body: 'Alo, how are you today, my friend? :)',
        timestamp: new Date(Date.now()),
        unreadCount: 0
      },
      {
        id: 2,
        participants: ['436797'],
        body: 'Sending :)',
        timestamp: new Date(Date.now() - 172800000),
        unreadCount: 0
      },
      {
        id: 3,
        participants: ['197743697'],
        body: 'Nothing :)',
        timestamp: new Date(Date.now() - 652800000),
        unreadCount: 0
      },
      {
        id: 4,
        participants: ['197746797'],
        body: 'Recibido!',
        timestamp: new Date(Date.now() - 50000000),
        unreadCount: 0
      },
      {
        id: 5,
        participants: ['14886783487'],
        body: 'Hello world!',
        timestamp: new Date(Date.now() - 60000000),
        unreadCount: 2
      }
    ]
  };

  // Initialize messages with unique IDs
  messagesDb.messages.forEach(function(message) {
    message.id = messagesDb.id++;
  });

  // Procedurally generate a large amount of messages for a single thread
  for (var i = 0; i < 150; i++) {
    messagesDb.messages.push({
      threadId: 5,
      sender: '14886783487',
      body: 'Hello world!',
      delivery: 'received',
      id: messagesDb.id++,
      timestamp: new Date(Date.now() - 60000000)
    });
  }

  // Internal publisher/subscriber implementation
  var allHandlers = {};
  var trigger = function(eventName, eventData) {
    var handlers = allHandlers[eventName];

    if (!handlers) {
      return;
    }

    handlers.forEach(function(handler) {
      handler.call(null, eventData);
    });
  };

  // Global simulation control
  // The following global variables, if properly defined in the global scope,
  // will affect the SMS mock's simulated network effects:
  // - SMSDebugDelay: A number defining the amount of time in milliseconds to
  //   delay asynchronous operations (default: 0)
  // - SMSDebugFail: A boolean value controlling the outcome of asynchronous
  //   operations (default: false)
  var simulation = {};

  simulation.delay = function() {
    if (typeof window.SMSDebugDelay === 'number') {
      return window.SMSDebugDelay;
    } else {
      return 0;
    }
  };

  simulation.failState = function() {
    if (typeof window.SMSDebugFail === 'boolean') {
      return window.SMSDebugFail;
    } else {
      return false;
    }
  };

  // mozSms API
  MockNavigatormozMobileMessage.addEventListener =
    function(eventName, handler) {
      var handlers = allHandlers[eventName];
      if (!handlers) {
        handlers = allHandlers[eventName] = [];
      }
      handlers.push(handler);
    };

  MockNavigatormozMobileMessage.send = function(number, text, success, error) {
    var sendId = messagesDb.id++;
    var request = {
      error: null
    };
    var sendInfo = {
      type: 'sent',
      message: {
        sender: null,
        receiver: number,
        delivery: 'sending',
        body: text,
        id: sendId,
        timestamp: new Date()
      }
    };

    var initiateSend = function() {
      messagesDb.messages.push(sendInfo.message);
      trigger('sending', sendInfo);

      setTimeout(completeSend, simulation.delay());
    };

    var completeSend = function() {
      request.result = sendInfo;

      if (simulation.failState()) {
        sendInfo.message.delivery = 'error';
        request.error = {
          name: 'mock send error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        trigger('failed', sendInfo);
      } else {
        sendInfo.message.delivery = 'sent';
        if (typeof request.onsuccess === 'function') {
          request.onsuccess();
        }
        trigger('sent', sendInfo);

        setTimeout(simulateResponse, simulation.delay());
      }
    };

    // Echo messages back
    var simulateResponse = function() {
      var receivedInfo = {
        type: 'received',
        message: {
          sender: number,
          receiver: null,
          delivery: 'received',
          body: 'Hi back! ' + text,
          id: messagesDb.id++,
          timestamp: new Date()
        }
      };
      messagesDb.messages.push(receivedInfo.message);
      trigger('received', receivedInfo);
    };

    setTimeout(initiateSend, simulation.delay());

    return request;
  };

  // getThreads
  // Parameters: none
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozMobileMessage.getThreads = function() {
    var request = {
      error: null
    };
    var threads = messagesDb.threads.slice();
    var idx = 0;
    var len, continueCursor;

    len = threads.length;

    var returnThread = function() {

      if (simulation.failState()) {
        request.error = {
          name: 'mock getThreads error'
        };

        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      } else {
        request.result = threads[idx];
        idx += 1;
        request.continue = continueCursor;
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(null);
        }
      }

    };
    continueCursor = function() {
      setTimeout(returnThread, simulation.delay());
    };

    continueCursor();

    return request;
  };

  // getMessages
  // Parameters:
  //  - filter: object specifying any optional criteria by which to filter
  //    results
  //  - reverse: Boolean that controls message ordering
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onsuccess: Function that may be set by the user. If set, will be
  //    invoked in the event of a success
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozMobileMessage.getMessages = function(filter, reverse) {
    var request = {
      error: null
    };
    // Copy the messages array
    var msgs = messagesDb.messages.slice();
    var idx = 0;
    var len, continueCursor;
    var num = filter && filter.numbers;

    if (num) {
      msgs = msgs.filter(function(element, index, array) {
        if (element.sender && num.indexOf(element.sender) != -1) {
          return true;
        }
        if (element.receiver && num.indexOf(element.receiver) != -1) {
          return true;
        }
        if (element.senderOrReceiver && num.indexOf(element.senderOrReceiver) != -1) {
          return true;
        }
        return false;
      });
    }

    // Sort according to timestamp
    if (!reverse) {
      msgs.sort(function(a, b) {
        return b.timestamp - a.timestamp;
      });
    } else {
      msgs.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
    }

    len = msgs.length;

    var returnMessage = function() {

      if (simulation.failState()) {
        request.error = {
          name: 'mock getMessages error'
        };

        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      } else {
        request.result = msgs[idx];
        idx += 1;
        request.continue = continueCursor;
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(null);
        }
      }

    };
    continueCursor = function() {
      setTimeout(returnMessage, simulation.delay());
    };

    continueCursor();

    return request;
  };

  // delete
  // Parameters:
  //  - id: Number specifying which message to delete
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onsuccess: Function that may be set by the user. If set, will be
  //    invoked in the event of a success
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozMobileMessage.delete = function(id) {
    var request = {
      error: null
    };
    // Convenience alias
    var msgs = messagesDb.messages;
    var idx, len;

    setTimeout(function() {
      if (simulation.failState()) {
        request.error = {
          name: 'mock delete error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        return;
      }

      for (idx = 0, len = msgs.length; idx < len; ++idx) {
        if (msgs[idx].id === id) {
          msgs.splice(idx, 1);
          break;
        }
      }

      if (typeof request.onsuccess === 'function') {
        request.onsuccess.call(null);
      }
    }, simulation.delay());

    return request;
  };

}(this));
