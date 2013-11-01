var restify = require('restify');
var Heap = require('heap');
var geohash = require('ngeohash');
var cluster = require('cluster');
var microtime = require('microtime');

var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
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

        var hash = geohash.encode(city.lat, city.lon, 6);
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

  //for (var ii in invertedIndex) {

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

    var pos = Math.abs(bsearch(objs, geohash.encode(lat, lon, 6)));
    var count = objs[pos].l.length;
    var maxOffset = Math.min(pos, (objs.length - pos));
    var offset = 4;
    for (; offset < maxOffset; ++offset) {
      count += (objs[pos - offset].l.length + objs[pos + offset].l.length);
      if (count >= k) {
        break;
      }
    }
    offset = Math.ceil(offset * 1.25); // fudge
    var elements = objs.slice(Math.max(0, (pos - offset)), Math.min(objs.length, (pos + offset + 1)));
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
    var entry = null;
    while (entry = heapq.pop()) {
      entry.distance = (Math.acos(entry.distance) * 3959.0);
      resultArray.unshift(entry);
    }

    return resultArray;
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
          latitude: locations[ii].city.src.lat,
          longitude: locations[ii].city.src.lon,
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
}
