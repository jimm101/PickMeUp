/*jshint -W117 */ /* stops Eclipse from complaining about undefined Meteor classes. */

/*
 * Time Tracker -- A variable-time callback javascript engine for Meteor.
 *
 * This is more of a stub for a future update than a functional part of the app.
 *
 * To save on battery, the geolocation update interval should be reasonably
 * infrequent when the destination is far away.  To ensure accuracy, the update
 * should be fairly frequent near the destination.
 *
 * Currently the TimeTracker object is only used to turn on/off Meteor setInterval.
 *
 * @author Jim McGowan (http://jimm101.github.com)
 *
 * @todo: TDD
 * @todo: Should allow arguments to setCallback, integrate with app.
 */

TimeTracker = function (cb) {
  this._callback = cb || function() { console.log('no callback set'); };
  this.lastTime = null;
  this.lastTimerLatency = null;
  this._minUpdateSeconds = 60;
  this._maxUpdateSeconds = 0.1;
  this.defaultTimerLatency = 4000.0;
  Session.set('timerLatency', this.defaultTimerLatency);
  this.timeoutID = null;
  this.startTimer();  // trigger time to start
  this.alertTime = null;
};
TimeTracker.prototype.setAlertOffsetMinutes = function(min) {
  this.alertTime = new Date().getTime() + min*60000;
};
TimeTracker.prototype.getLatencyForTimer = function() {
  return this.latencyInSeconds * 1000;
};
TimeTracker.prototype.setCallback = function(cb) {
  this._callback = cb;
};
TimeTracker.prototype.updateLatency = function() {
  var timerLatency = Session.get('timerLatency');
  Session.set('timerLatency', timerLatency); // make this smarter!
  if( Session.get('timerLatency') !== this.lastTimerLatency ) {
    this.lastTimerLatency = timerLatency;
    this.clearTimer();
    this.startTimer();
  }
};
TimeTracker.prototype.startTimer = function () {
  var timerLatency = Session.get('timerLatency') || this.defaultTimerLatency;
  this.timeoutID = Meteor.setInterval( (function() {
    this._callback.call();
    this.updateLatency();
  }).bind(this), timerLatency );
};
TimeTracker.prototype.clearTimer = function() {
  if( this.timeoutID !== null ) {
    Meteor.clearInterval(this.timeoutID);
    this.timeoutID = null;
  }
};
