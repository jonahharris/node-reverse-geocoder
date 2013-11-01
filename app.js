var restify = require('restify');
var Heap = require('heap');
var geohash = require('geo-hash');
var microtime = require('microtime');

var data = require('./data/data.json');

function bsearch (arr, searchElement) {
  'use strict';

  var minIndex = 0;
  var maxIndex = arr.length - 1;
  var currentIndex;
  var currentElement;
  var resultIndex;

  while (minIndex <= maxIndex) {
    resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = arr[currentIndex];

    if (currentElement.h < searchElement) {
      minIndex = currentIndex + 1;
    }
    else if (currentElement.h > searchElement) {
      maxIndex = currentIndex - 1;
    }
    else {
      return currentIndex;
    }
  }

  return ~maxIndex;
}

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

      var hash = geohash.encode(city.lat, city.lon, 9);
      var latRad = (city.lat * 0.017453292519943295);
      var lonRad = (city.lon * 0.017453292519943295);
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

function findNearestZOrder (k, lat, lon) {
  var latRad = (lat * 0.017453292519943295);
  var lonRad = (lon * 0.017453292519943295);
  var coslat = Math.cos(latRad);
  var sinlat = Math.sin(latRad);
  var coslon = Math.cos(lonRad);
  var sinlon = Math.sin(lonRad);

  var heapq = new Heap(function (item1, item2) {
    return (item1.distance - item2.distance);
  });

  var pos = Math.abs(bsearch(objs, geohash.encode(lat, lon, 9)));
  var elements = objs.slice(Math.max(0, (pos - 32)), Math.min(objs.length, (pos + 32)));
  for (var ii in elements) {
    for (var jj in elements[ii].l) {
      var city = elements[ii].l[jj];
      var val = (coslat * city.coslat * (city.coslon * coslon + city.sinlon * sinlon) + sinlat * city.sinlat);
      if (heapq.size() === k) {
        if (heapq.peek().distance < val) {
          heapq.replace({ distance: val, city: city });
        }
      } else {
        heapq.push({ distance: val, city: city });
      }
    }
  }

  var topTen = [];
  var entry = null;
  while (entry = heapq.pop()) {
    entry.distance = (Math.acos(entry.distance) * 3959.0);
    topTen.unshift(entry);
  }

  return topTen;
}

function reverseGeocode (req, res, next) {
  var t1 = microtime.nowDouble();
  var lat = req.query.lat || 0.0;
  var lon = req.query.lon || 0.0;
  var k = parseInt(req.query.k || 1);
  // should validate inputs for ranges/NaN

  var results = [];
  var locations = findNearestZOrder(k, lat, lon);
  for (var ii in locations) {
    results.push({
        country: locations[ii].city.src.country,
        country_code: locations[ii].city.src.country_code,
        region: locations[ii].city.src.region,
        region_code: locations[ii].city.src.region_code,
        city: locations[ii].city.src.name,
        latitude: locations[ii].city.src.latitude,
        longitude: locations[ii].city.src.longitude,
        distance: locations[ii].distance
      });
  }
  res.setHeader('content-type', 'application/json');
  res.send(results);
  //console.log('Elapsed: ' + (microtime.nowDouble() - t1) + 'us');
}

var server = restify.createServer();

server.use(restify.queryParser({ mapParams: false }));
server.get('/reverse', reverseGeocode);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

