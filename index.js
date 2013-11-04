var microtime = require('microtime');
var config = require('./config');

var geoData = require('./core/geoData').geoData;
var lookup = require('./core/reverseLookup');

exports.lookupLocationByLatLong = function (latitude, longitude, count) {
  // should validate inputs for ranges/NaN

  //var t1 = microtime.nowDouble();
  var results = lookup.lookupLocationByLatLong(geoData, latitude, longitude, count);
  //console.log('Elapsed: ' + (microtime.nowDouble() - t1) + 'us');

  return results;
};