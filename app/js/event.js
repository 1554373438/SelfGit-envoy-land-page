(function() {

  try {
    new Event('test');
  } catch(e) {
    window.Event = function(eventName) {
      var event = document.createEvent('Event');
      event.initEvent(eventName, true, false);

      return event;
    }
  }

  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();