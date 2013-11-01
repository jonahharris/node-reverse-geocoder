var assert = require('assert');
var reverse_geocoder = require('./../index');

suite('reverseLookup', function () {

  test('lookup 1 location with valid lat long', function (done) {

    var results = reverse_geocoder.lookupLocationByLatLong(40.36508, -74.95435, 1);
    assert(results instanceof Array);
    assert.equal(1, results.length);

    assert.equal('United States', results[0].country);
    assert.equal('US', results[0].country_code);
    assert.equal('Pennsylvania', results[0].region);
    assert.equal('PA', results[0].region_code)
    assert.equal('New Hope', results[0].city);
    assert.equal(40.354, results[0].latitude);
    assert.equal(-74.9997, results[0].longitude);
    assert.equal(2.5075081357549003, results[0].distance);

    done();

  });

  test('lookup 3 locations with valid lat long', function (done) {

    var results = reverse_geocoder.lookupLocationByLatLong(40.36508, -74.95435, 3);
    assert(results instanceof Array);
    assert.equal(3, results.length);

    assert.equal('United States', results[0].country);
    assert.equal('US', results[0].country_code);
    assert.equal('Pennsylvania', results[0].region);
    assert.equal('PA', results[0].region_code)
    assert.equal('New Hope', results[0].city);
    assert.equal(40.354, results[0].latitude);
    assert.equal(-74.9997, results[0].longitude);
    assert.equal(2.5075081357549003, results[0].distance);

    assert.equal('Lambertville', results[1].city);
    assert.equal('Solebury', results[2].city);

    done();

  });

});