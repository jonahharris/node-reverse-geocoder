var Heap = require('heap');
var geohash = require('ngeohash');

var RADIANS_IN_DEGREE = 0.017453292519943295;
var EARTH_RADIUS_MILES = 3959.0;

function bsearch(arr, searchElement) {
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

function findNearestZOrder(geoData, k, lat, lon) {
  var latRad = (lat * RADIANS_IN_DEGREE);
  var lonRad = (lon * RADIANS_IN_DEGREE);
  var coslat = Math.cos(latRad);
  var sinlat = Math.sin(latRad);
  var coslon = Math.cos(lonRad);
  var sinlon = Math.sin(lonRad);

  var heapq = new Heap(function (item1, item2) {
    return (item1.distance - item2.distance);
  });

  var pos = Math.abs(bsearch(geoData, geohash.encode(lat, lon, 6)));
  var count = geoData[pos].l.length;
  var maxOffset = Math.min(pos, (geoData.length - pos));
  var offset = 4;
  for (; offset < maxOffset; ++offset) {
    count += (geoData[pos - offset].l.length + geoData[pos + offset].l.length);
    if (count >= k) {
      break;
    }
  }
  offset = Math.ceil(offset * 1.25); // fudge
  var elements = geoData.slice(Math.max(0, (pos - offset)), Math.min(geoData.length, (pos + offset + 1)));
  /*
   console.log('count is ' + elements.length);
   var neighbors = [];
   var count = objs[pos].l.length;
   var offset = 1;
   do {
   var blocks = [];
   for (var jj = -offset; jj <= offset; ++jj) {
   blocks.push(geohash.neighbor(hash, [offset, jj]));
   blocks.push(geohash.neighbor(hash, [-offset, -jj]));
   }
   for (var ii = offset - 1; ii >= (-offset + 1); --ii) {
   blocks.push(geohash.neighbor(hash, [ii, offset]));
   blocks.push(geohash.neighbor(hash, [-ii, -offset]));
   }
   for (var ii in blocks) {
   if ('undefined' !== typeof invertedIndex[blocks[ii]]) {
   count += invertedIndex[blocks[ii]].length;
   //console.log('count -> ' + count);
   }
   }
   if (count >= k) {
   break;
   }
   ++offset;
   } while (true === true);
   console.log('count is ' + count);
   */
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

  var resultArray = [];
  var entry;
  while (entry = heapq.pop()) {
    entry.distance = (Math.acos(entry.distance) * EARTH_RADIUS_MILES);
    resultArray.unshift(entry);
  }

  return resultArray;
}

function lookupLocationByLatLong(geoData, latitude, longitude, count) {
  var k = count || 1;
  var results = [];
  var locations = findNearestZOrder(geoData, k, latitude, longitude);
  for (var ii in locations) {
    results.push({
      country: locations[ii].city.src.country,
      country_code: locations[ii].city.src.country_code,
      region: locations[ii].city.src.region,
      region_code: locations[ii].city.src.region_code,
      city: locations[ii].city.src.name,
      latitude: locations[ii].city.src.lat,
      longitude: locations[ii].city.src.lon,
      distance: locations[ii].distance
    });
  }
  return results;
}

exports.lookupLocationByLatLong = lookupLocationByLatLong;