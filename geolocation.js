/*jshint -W117 */ /* stops Eclipse from complaining about undefined Meteor classes. */

/**
 *
 * Meteorized HTML5 geolocation to share geolocation information among clients.
 *
 * To see geolocation of others, include in your HTML:
 *
 *  <template name="geolocation">
 *    {{geolocation}}
 *  </template>
 *
 * To push updates every 5 seconds:
 *   Meteor.setInterval( geolocation.pushCurrentLocation, 5000 );
 *
 * To make reactive components:
 *   var location = Geolocation.findOne();
 *
 * location.position is the position object passed when navigator.geolocation.getCurrentPosition()
 * is successful, or null. (http://www.w3schools.com/html/html5_geolocation.asp)
 *
 * location.error is the error code passed when navigator.geolocation.getCurrentPosition()
 * triggers an error, or null. (http://www.w3schools.com/html/html5_geolocation.asp)
 *
 * location.speed is the speed returned in position.coords, or one calculated below.
 *
 * For the purposes of this app, I always assume there's only one person
 * broadcasting, and a lot of people snooping.  Expanding that is on the todo list below.
 *
 * @author Jim McGowan (http://jimm101.github.com)
 * @depends on Google Map V3 API (including the optional geometry library), which it loads.
 *
 * @todo: Currently hard-coded to a 'test' user name. Should use a proxy for a user there.
 * @todo: Currently use Meteor's autopublish, should server-side filter.
 */

// @global Geolocation Collection.
// Contains:
// @param position: the raw 'position' object returned by navigator.geolocation.getCurrentPosition(), or null
// @param speed: position.coords.speed if available, or an estimated computed below
// @param error: the error number returned by the error callback, or null
Geolocation = new Meteor.Collection("geolocation");

// Meteor client-side code initializes the collection for the current user.
// Note that this is deferred 2 seconds, since the Collection needs time to sync from the server,
// which is a nasty (but necessary) Meteor hack.  I can move some of that to the server side once
// multiple users are supported.
if (Meteor.isClient) {

  //
  Template.geolocation.geolocation = function() {
    if( geolocation.timerHandle === null ) {
      geolocation.pushCurrentLocation();
       geolocation.timerHandle = new TimeTracker( function() {
        geolocation.pushCurrentLocation();
      });
    }
    return;
  };
  Template.geolocation.destroyed = function() {
     Meteor.clearInterval(geolocation.timerHandle);
     geolocation.timerHandle = null;
  };

  //
  Meteor.startup(function () {
    Meteor.setTimeout( function () { // need to defer or async init above won't run, and collection will be empty
      geolocation.busUserId = 'test'; // hardcode default as 'test'
      var existingRecord = Geolocation.findOne({busUserId: geolocation.busUserId});
      if( existingRecord === undefined ) {
        geolocation.geolocation_id = Geolocation.insert({busUserId: geolocation.busUserId, position: null, speed: null, error: null});
      } else {
        if( geolocation.geolocation_id === null ) {
          geolocation.geolocation_id = existingRecord._id;
        }
        Geolocation.update(geolocation.geolocation_id, {$set: { busUserId: geolocation.busUserId, position: null, speed: null, error: null }} );
      }
    }, 2000);
  });
}

// Provide a method to delete straggling database entries.
// Meteor forces these to be on the server side.
// From your browser's console type:
//   Meteor.call('cleanGeolocation')
if (Meteor.isServer) {
  Meteor.startup(function () {
   return Meteor.methods({
      cleanGeolocation: function() {
        return Geolocation.remove({});
      }
    });
  });
}

// Global geolocation object for invoking methods.
// This is an object style collection, since we'll only have one instance.
geolocation = {
  // fake mode allows debugging/test by letting the developer control location.
  // I can't believe there isn't a decent lib to spoof geolocation outside of Android!
  geolocation_id: null,
  busUserId: null,
  fake_mode: false,																											// dynamically checked each .get()
  fake_coords: { 'latitude': 40.759884, 'longitude': -73.980330 },      // fake current
  fake_destination: { 'latitude': 40.759884, 'longitude': -73.980330 }, // fake destination

  //
  timerHandle: null,

  // Periodically call push geolocation from your browser to the collection.
  // If speed information isn't given (common without GPS), we calculate it.
  // So rather than use geolocation's location.coords.speed, use location.speed,
  // which is either the GPS version or the one calculated below.
  pushCurrentLocation: function() {
    if( this.fake_mode === true ) {
      this.success({
        coords: this.fake_coords,
        timestamp: new Date().getTime()
      });
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(this.success.bind(this), this.error.bind(this));
        return true;
      }
    }
    return false;
  },
  success: function(position) {
    if( !position.hasOwnProperty('coords') ) {
      return;
    }
    if( (position.coords.speed === null) || (isNaN(position.coords.speed)) ) {
      speed = this.get_speed(position);
    } else {
      speed = position.coords.speed;
    }
    Geolocation.update(this.geolocation_id, { $set: { busUserId: this.busUserId, position: position, speed: speed, error: null } } );
  },
  error: function(err) {
    Geolocation.update(this.geolocation_id, { $set: { busUserId: this.busUserId, position: null, speed: null, error: err } } );
  },
  // The remaining code calculates a rough speed, based on recent location measurements.
  // Exponential
  last_position: null,
  speed_alpha: 0.2,
  speed: 0,
  get_speed: function(position) {
    // If there's no previous position, we can't get a speed.
    if( this.last_position === null ) {
      this.last_position = position;
      return null;
    }
    // Calculate the distance & speed between the last two measurements.
    var lastLatlng = new google.maps.LatLng(this.last_position.coords.latitude, this.last_position.coords.longitude);
    var newLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    var distance = google.maps.geometry.spherical.computeDistanceBetween( lastLatlng, newLatlng, 3956.6); // 3956.6 = miles
    var time_delta = position.timestamp - this.last_position.timestamp;
    if( time_delta === 0) {
      return null;
    }
    var instantaneous_speed = distance / time_delta;
    // Use exponential smoothing to remove some noise from the final speed measurement.
    this.speed = (instantaneous_speed * this.speed_alpha) + (this.speed * (1-this.speed_alpha));
    // Update for next measurement
    this.last_position = position;
    return this.speed;
  }
};

