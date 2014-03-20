/*jshint -W117 */ /* stops Eclipse from complaining about undefined Meteor classes. */

// Livemap is a Google map wrapper for dynamic updates.
//
// This is an app specific google map tool that depends on Geolocation.
//
// In html template:
//   {{> livemap}}
//
// In js:
//   var livemap = Livemap();
//   livemap.create();
//
// Update location when new coordinates come in:
//   livemap.updateCurrentPosition();
//
// Zoom the map:
//   livemap.zoom('current');      // bus rider only
//   livemap.zoom('destination');  // destination
//   livemap.zoom('zoom');         // overview of both
//
// With a little re-tooling I can package this as a generic Google map
// wrapper for Meteor rather than just a slave to pickmeup.  That's
// out-of-scope unless I get a real project requiring it.
//
// @author Jim McGowan (http://jimm101.github.com)
// @depends: geolocation.js

// Template helper usied in livemap.html.
if (Meteor.isClient) {
  Handlebars.registerHelper('livemap', function(mapSelector) {
    Session.set('mapSelector', mapSelector);
  });
}

// Livemap object.
Livemap = function() {
  return {
    created: false,
    map: null,
    currentPositionMarker: null,
    destinationPositionMarker: null,
    currentLatlng: null,
    destLatlng: null,
    trafficLayer: null,
    userOptions: {
      destination: {'coords': { 'latitude': 40.759884, 'longitude': -73.980330 } }, // magnolia bakery
    },
    /* Needs to be created *after* Geolocation returns coordinates, so place this where it depends on Geolocation. */
    create: function() {
      if( this.created === false ) {
        var location = Geolocation.findOne();
        if( !location || !location._id )
          return;
        if( location.hasOwnProperty('position') && location.position !== null ) {
          this.created = true;
          // create map at current position
          var coords = location.position.coords;
          this.currentLatlng = new google.maps.LatLng(coords.latitude, coords.longitude);
          var mapOptions = {
            disableDefaultUI: false,
            center: this.currentLatlng,
            mapTypeControl: true,
            navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoom: 16 /* NB: without a zoom parameter, the map is gray. seriously? */
          };
          this.map = new google.maps.Map($(Session.get('mapSelector')).get(0), mapOptions);
          // create marker at current position
          this.updateCurrentPosition();
          // create marker at destination
          var destCoords = this.userOptions.destination.coords;
          this.destLatlng = new google.maps.LatLng(destCoords.latitude, destCoords.longitude);
          this.destinationPositionMarker = new google.maps.Marker({
            position: this.destLatlng,
            map: this.map,
            draggable: false,
            icon: 'http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png',
            title:"you want to be here"
          });
          // show traffic
          this.trafficLayer = new google.maps.TrafficLayer();
          this.trafficLayer.setMap(this.map);
          this.zoom('both');
        }
      }
    },
    // Move the current position marker.
    updateCurrentPosition: function() {
      if( this.created === true ) {
        var location = Geolocation.findOne();
        if( location.hasOwnProperty('position') && location.position !== null ) {
           // create marker if it doesn't exist
          if( this.currentPositionMarker === null ) {
            this.currentPositionMarker = new google.maps.Marker({
              position: this.currentLatlng,
              map: this.map,
              title:"you are here"
            });
          }
          // change marker position
          var coords = location.position.coords;
          this.currentLatlng = new google.maps.LatLng(coords.latitude, coords.longitude);
          this.currentPositionMarker.setPosition(this.currentLatlng);
        }
      }
    },
    // Reposition map to either marker or the bounding box of both.
    zoom: function( zoom_mode ) {
      var coords, latlng;
      var location = Geolocation.findOne();
      if( location.hasOwnProperty('position') && location.position !== null ) {
        if( zoom_mode == 'both' ) {
          var bounds = new google.maps.LatLngBounds();
          coords = location.position.coords;
          latlng = new google.maps.LatLng(coords.latitude, coords.longitude);
          bounds.extend(latlng);
          coords = this.userOptions.destination.coords;
          latlng = new google.maps.LatLng(coords.latitude, coords.longitude);
          bounds.extend(latlng);
          this.map.fitBounds(bounds);
        } else {
          // TODO: For smoother panning between current & destination, I should
          //       temporarily zoom out to 'both'.
          if( zoom_mode == 'current' ) {
            coords = location.position.coords;
          } else if( zoom_mode == 'destination' ) {
            coords = this.userOptions.destination.coords;
          } else {
            return null;
          }
          latlng = new google.maps.LatLng(coords.latitude, coords.longitude);
          this.map.panTo(latlng);
          this.map.setZoom(14);
        }
      }
    }
   };
};
