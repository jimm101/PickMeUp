/* Collection of generic javascript utlities go here, pruned at release. */

// Semi-ensures there will be no 'console is undefined' errors ... necessary on things like iPads & iPhones.
var console = console || (function(){
    var c = {}; c.log = c.warn = c.debug = c.info = c.error = c.time = c.dir = c.profile = c.clear = c.exception = c.trace = c.assert = function(s){};
    return c;
})();
