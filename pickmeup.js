/*jshint -W117 */ /* stops Eclipse from complaining about undefined Meteor classes. */

// desc
// @auth
// @depends

// Create a livemap
var livemap = Livemap();

// Helper function to pretty-print time left.
function toHHMM(seconds) {
  if( isNaN(seconds) ) { return '--:--'; }
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds - (hours * 3600)) / 60);
  if (minutes < 10) {minutes = "0"+minutes;}
  return hours+':'+minutes;
}

// Helper function to calcuate time left traveling.
// Replace when livemap gets Google Directions API.
function time_delta() {
  if( livemap.currentLatlng === null || livemap.destLatlng === null ) {
    return "--:--";
  } else {
    var speed = Session.get('speed');
    if( speed < 10 ) { speed=10; }
    var distance = google.maps.geometry.spherical.computeDistanceBetween( livemap.currentLatlng, livemap.destLatlng, 3956.6); // 3956.6 = miles
    return distance / speed * 1000;
  }
}

// Helper function to detect an alert has been set.
// An alert is when it's time to go and pick up the bus rider!
function isAlerted() {
  var location = Geolocation.findOne();
  if( location !== undefined && 'alert' in location ) {
    return location.alert;
  }
  return false;
}

// Client-side Templating
if (Meteor.isClient) {
  // Reactive template fillers
  Template.livemap.geo_coords_msg = function () {
    return Session.get("geo_coords_msg");
  };
  Template.control_panel.speed = function () {
    return Math.round(Session.get('speed')) || 0;
  };
  Template.control_panel.estimated_time = function () {
    return toHHMM(time_delta());
  };
  Template.control_panel.alert_time = function () {
    return toHHMM( time_delta() - 5*60 ); // TODO: make hard-coded 5 minute alert configurable.
  };
  Template.home_controls.alert_button_label = function() {
    return isAlerted() ? "remove alert" : "send alert";
  };
  Template.bus_controls.alert_button_label = function() {
    return isAlerted() ? "cancel alert" : "send alert now";
  };
  Template.home_controls.alert_message = function () {
    return isAlerted() ? "alert!!! PickMeUp!!!" : "alert!!! PickMeUp!!!";
  };
  Template.bus_controls.alert_message = function () {
    return isAlerted() ? "alert has been sent" : "remove alert";
  };
  Template.bus_controls.alert_hide =
  Template.home_controls.alert_hide = function () {
    return isAlerted() ? "" : "hide_alert";
  };
  Template.control_panel.geolocation_status = function () {
    var location = Geolocation.findOne();
    if( typeof location === 'undefined' || !location.hasOwnProperty('error') ) {
      return "getting geolocation ...";
    }
    switch( location.error )
    {
      case null:
        if( ('speed' in location) && (location.speed!==null) ) {
          Session.set('speed', location.speed);
        }
        return "location enabled";
      case 0:
        return "location blocked by user";
      case 1:
        return "location not available";
      default:
        return "location error";
    }
  };
  // Handle UI events (clicks)
  Template.main.events({
    // Focus just on the bus (the current location).
    'click #bus_button': function (event) {
      $(".zoomers").addClass('fade').removeClass('round_background');
      $("#bus_button").removeClass('fade').addClass('round_background');
      livemap.zoom("current");
    },
    // Focus just on the destination.
    'click #dest_button': function (event) {
      $(".zoomers").addClass('fade').removeClass('round_background');
      $("#dest_button").removeClass('fade').addClass('round_background');
      livemap.zoom("destination");
    },
    // Zoom out to show both current and destination locations.
    'click #zoom_out_button': function (event) {
      $(".zoomers").addClass('fade').removeClass('round_background');
      $("#zoom_out_button").removeClass('fade').addClass('round_background');
      livemap.zoom("both");
    },
    // Toggle the alert button.
    'click .alert_button': function (event) {
      var current_hide = $(".alert_message").hasClass("hide_alert");
      var geo = Geolocation.findOne();
      if( geo._id ) {
        Geolocation.update(geolocation.geolocation_id, { $set: { alert: current_hide } } );
      }
    }
  });

  // Reactive dependencies.
  Deps.autorun(function() {
    livemap.create();
  });
}
