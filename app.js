var restify = require('restify');
var cluster = require('cluster');
var microtime = require('microtime');
var config = require('./config');

var geoData = require('./core/geoData').geoData;
var lookup = require('./core/reverseLookup');

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
  // define http server
  function reverseGeocode (req, res, next) {
    var t1 = microtime.nowDouble();
    var lat = req.query.lat || 0.0;
    var lon = req.query.lon || 0.0;
    var k = parseInt(req.query.k || 1);
    // should validate inputs for ranges/NaN

    var results = lookup.lookupLocationByLatLong(geoData, lat, lon, k);
    res.setHeader('content-type', 'application/json');
    res.send(results);
    next();
    //console.log('Elapsed: ' + (microtime.nowDouble() - t1) + 'us');
  }

  var server = restify.createServer();

  server.use(restify.queryParser({ mapParams: false }));
  server.get('/reverse', reverseGeocode);

  server.listen(config.port, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}
