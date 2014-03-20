/*jshint -W117 */ /* stops Eclipse from complaining about undefined Meteor classes. */

// Meteor's IronRouter page router maps URL paths -> templates.

// By default, all pages use the main Template.
Router.configure({
  layoutTemplate: 'main'
});

// The first parameter in each .route() is the Template
// plopped in {{yield}}.
Router.map(function () {
  // If you're at / (home), you don't send coordinates.
  this.route('home_controls', {
    path: '/',
  });
  // If you're on the /bus, you send coordinates.
  this.route('bus_controls', {
    path: '/bus',
  });
});
