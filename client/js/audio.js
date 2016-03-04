require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var AudioTagPlayer = require('./audio-tag-player')
var WebAudioPlayer = require('./web-audio-player')
var Emitter = require('events').EventEmitter
var AudioContext = window.AudioContext || window.webkitAudioContext

var player
if (AudioContext) {
  try {
    // Chrome throws error when having too many AudioContexts
    console.log('audio context')
    player = new WebAudioPlayer(AudioContext)
  } catch (e) {
    console.log('error, fallback to audio tag')
    player = new AudioTagPlayer()
  }
} else {
  player = new AudioTagPlayer()
}

function noop () {}

function AudioObject (url) {
  Emitter.call(this)
  this.url = url
  this.state = 'loading'
  player.load(url, function () {
    this.state = 'loaded'
    this.emit('load')
  }.bind(this))
}

var p = AudioObject.prototype = Object.create(Emitter.prototype)

p.play = function () {
  if (this.state === 'loaded') {
    player.play(this.url)
  } else {
    this.once('load', this.play.bind(this))
  }
}

p.stop = function () {
  player.stop(this.url)
}

Object.defineProperty(p, 'duration', {
  enumerable: true,
  get: function () {
    return player.durationOf(this.url)  
  },
  set: noop
})

Object.defineProperty(p, 'currentTime', {
  enumerable: true,
  get: function () {
    return player.time(this.url)
  },
  set: noop
})

module.exports = AudioObject
},{"./audio-tag-player":3,"./web-audio-player":4,"events":1}],3:[function(require,module,exports){
/**
 * A player using audio tags
 */

function AudioTagPlayer () {
  this.audios = {}
  this.loaded = {}
}

var p = AudioTagPlayer.prototype

p.load = function (url, cb) {
  var audio = this.audios[url]
  if (audio) {
    if (cb) {
      if (!this.loaded[url]) {
        audio.addEventListener('loadeddata', cb)
      } else {
        cb()
      }
    }
    return
  }
  audio = this.audios[url] = new Audio()
  audio.src = url
  audio.load()
  var self = this
  audio.addEventListener('loadeddata', function () {
    self.loaded[url] = true
    if (cb) cb()
  })
}

p.play = function (url) {
  var loaded = this.loaded[url]
  if (!loaded) {
    console.warn(
      'audio: attempting to play file: ' + url +
      ' which is not loaded yet.'
    )
    return
  }
  var audio = this.audios[url]
  audio.play()
}

p.stop = function (url) {
  var loaded = this.loaded[url]
  if (loaded) {
    var audio = this.audios[url]
    audio.pause()
    audio.currentTime = 0
  }
}

p.loadAll = function (files, cb) {
  var loaded = 0
  var self = this
  files.forEach(function (file) {
    self.load(file, function () {
      loaded++
      if (loaded >= files.length) {
        cb()
      }
    })
  })
}

p.durationOf = function (url) {
  if (this.loaded[url]) {
    return this.audios[url].duration
  }
}

p.time = function (url) {
  if (this.loaded[url]) {
    return this.audios[url].currentTime
  }
}

module.exports = AudioTagPlayer
},{}],4:[function(require,module,exports){
/**
* A player using the Web Audio API
*/

function WebAudioPlayer (AduioContext) {
  this.context = new AduioContext()
  this.pending = {}
  this.buffers = {}
  this.sources = {}
  this.timers = {}
}

var p = WebAudioPlayer.prototype

p.load = function (url, cb) {
  // check if there's a pending request.
  // if yes, merge the callback with the existing callback
  var request = this.pending[url]
  if (request) {
    if (cb) {
      var ocb = request.onload
      request.onload = function () {
        ocb()
        cb()
      }
    }
    return
  }
  // check if the buffer is already loaded.
  var buffer = this.buffers[url]
  if (buffer) {
    if (cb) cb()
    return
  }
  request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'arraybuffer'
  // Decode asynchronously
  var self = this
  request.onload = function () {
    self.context.decodeAudioData(
      request.response,
      function (buffer) {
        self.buffers[url] = buffer
        if (cb) cb()
      },
      function (e) {
        console.warn(
          'audio: error decoding response for ' + url
        )
      }
    )
  }
  request.send()
}

p.play = function (url) {
  var buffer = this.buffers[url]
  if (!buffer) {
    console.warn(
      'audio: attempting to play file: ' + url +
      ' which is not loaded yet.'
    )
    return
  }
  var source = this.context.createBufferSource()
  this.sources[url] = source
  source.buffer = buffer
  source.connect(this.context.destination)
  if (typeof source.noteOn === "function") {
    source.noteOn(0)
  } else {
    source.start()
  }
  var timers = this.timers
  timers[url] = this.context.currentTime
  source.onended = function () {
    timers[url] = null
  }
}

p.stop = function (url) {
  if (this.sources[url]) {
    this.sources[url].stop(0)
    this.sources[url] = null
    this.timers[url] = null
  }
}

p.loadAll = function (files, cb) {
  var loaded = 0
  var self = this
  files.forEach(function (file) {
    self.load(file, function () {
      loaded++
      if (loaded >= files.length) {
        cb()
      }
    })
  })
}

p.durationOf = function (url) {
  var buffer = this.buffers[url]
  if (buffer) return buffer.duration
}

p.time = function (url) {
  if (this.timers[url] != null) {
    return this.context.currentTime - this.timers[url]
  } else {
    return 0
  }
}

module.exports = WebAudioPlayer
},{}],"browser-audio":[function(require,module,exports){
var AudioObject = require('./lib/audio-object')

module.exports = {

  create: function (url) {
    return new AudioObject(url)
  },

  whenLoaded: function (objects, cb) {
    var loaded = 0
    if (!Array.isArray(objects)) {
      objects = [objects]
    }
    objects.forEach(function (o) {
      if (o.state === 'loaded') {
        check()
      } else {
        o.once('load', check)
      }
    })
    function check () {
      loaded++
      if (loaded === objects.length) {
        cb()
      }
    }
  }

}
},{"./lib/audio-object":2}]},{},[]);
