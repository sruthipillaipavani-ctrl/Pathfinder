// Headless smoke test: loads the real app with a fake page and renders every screen in several states.
// Run from the project folder:  jsc tests/screens.js
var store = {};
function dummy() {
  var f = function () { return dummy(); };
  return new Proxy(f, {
    get: function (t, k) {
      if (k === Symbol.toPrimitive) return function () { return ''; };
      if (k === 'then') return undefined;
      if (k === 'querySelectorAll') return function () { return []; };
      if (k === 'value' || k === 'innerHTML' || k === 'innerText' || k === 'textContent' || k === 'id' || k === 'className') return '';
      if (k === 'checked' || k === 'disabled' || k === 'hidden') return false;
      if (k === 'classList') return { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } };
      if (k === 'style' || k === 'dataset') return {};
      return dummy();
    },
    set: function () { return true; },
    apply: function () { return dummy(); },
  });
}
var listeners = {};
var window = this;
var document = {
  querySelector: function () { return dummy(); }, querySelectorAll: function () { return []; },
  createElement: function () { return dummy(); }, getElementById: function () { return dummy(); },
  body: dummy(), documentElement: dummy(), addEventListener: function (n, f) { listeners[n] = f; },
  removeEventListener: function () {}, visibilityState: 'visible', hasFocus: function () { return true; }, write: function () {},
};
var location = { hash: '', href: '', search: '', pathname: '/', replace: function () {} };
var history = { replaceState: function (a, b, h) { location.hash = h; } };
var localStorage = { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }, clear: function () { store = {}; } };
var sessionStorage = localStorage;
window.addEventListener = function (n, f) { listeners[n] = f; };
window.removeEventListener = function () {};
window.scrollTo = function () {};
var setTimeout = function () { return 0; }, setInterval = function () { return 0; }, clearInterval = function () {}, clearTimeout = function () {};
var requestAnimationFrame = function () { return 0; };
var confirm = function () { return true; }, alert = function () {};
var navigator = { clipboard: {} };
var Worker = function () { return dummy(); };
var FormData = function () { return { get: function () { return ''; }, getAll: function () { return []; } }; };
var URLSearchParams = function (q) { var m = {}; String(q || '').split('&').forEach(function (p) { if (p) { var kv = p.split('='); m[kv[0]] = decodeURIComponent(kv[1] || ''); } }); this.entries = function () { return Object.keys(m).map(function (k) { return [k, m[k]]; }); }; this[Symbol.iterator] = function () { return this.entries()[Symbol.iterator](); }; };
var HashChangeEvent = function () {}, Event = function () {};
window.PF_V = 1;

['js/data.js', 'js/careers_extra.js', 'js/activities_extra.js', 'js/adapt.js', 'js/practice.js', 'js/lessons.js', 'js/exercises.js', 'js/app.js'].forEach(function (f) { load(f); });

