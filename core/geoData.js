var geohash = require('ngeohash');

var RADIANS_IN_DEGREE = 0.017453292519943295;

exports.geoData = buildData('./../data/data.json');

function buildData(dataFile) {

  var data = require(dataFile);

  var invertedIndex = {};
  for (var country_code in data) {
    var country = data[country_code];

    for (var region_code in country.regions) {
      var region = country.regions[region_code];

      for (var ii in region.cities) {
        var city = region.cities[ii];

        city.country_code = country_code;
        city.country = country.name;
        city.region_code = region_code;
        city.region = region.name;

        var hash = geohash.encode(city.lat, city.lon, 6);
        var latRad = (city.lat * RADIANS_IN_DEGREE);
        var lonRad = (city.lon * RADIANS_IN_DEGREE);
        var loc = {
          src: city,
          coslat: Math.cos(latRad),
          sinlat: Math.sin(latRad),
          coslon: Math.cos(lonRad),
          sinlon: Math.sin(lonRad),
        };

        if ('undefined' === typeof invertedIndex[hash]) {
          invertedIndex[hash] = [loc];
        } else {
          invertedIndex[hash].push(loc);
        }
      }
    }
  }

  var objs = [];
  for (var ii in invertedIndex) {
    objs.push({ h: ii, l: invertedIndex[ii] });
  }

  objs.sort(function (a, b) {
    if (a.h === b.h)
      return 0;
    if (a.h > b.h)
      return 1;
    else
      return -1;
  });

  return objs;
};
