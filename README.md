## node-reverse-geocoder


#### As a standalone server:

```
npm start
```

This will return the closest city to the given point (40.36508, -74.95435).
```
http://localhost:8080/reverse?k=1&lat=40.36508&lon=-74.95435
```
will return a JSON response as follows:
```javascript
[
    {
        country: "United States",
        country_code: "US",
        region: "Pennsylvania",
        region_code: "PA",
        city: "New Hope",
        latitude: 40.354,
        longitude: -74.9997,
        distance: 2.5075081357549003
    }
]
```

By altering k, you can return the top cities to the given point (40.36508, -74.95435) ordered in ascending distance.
```
http://localhost:8080/reverse?k=10&lat=40.36508&lon=-74.95435
```


#### As an npm node module:
```
npm install reverse-geocoder
```

```javascript
var reverse_geocoder = require('reverse-geocoder');

var results = reverse_geocoder.lookupLocationByLatLong(40.36508, -74.95435, 1);
```

results will be as follows:
```javascript
[
    {
        country: "United States",
        country_code: "US",
        region: "Pennsylvania",
        region_code: "PA",
        city: "New Hope",
        latitude: 40.354,
        longitude: -74.9997,
        distance: 2.5075081357549003
    }
]
```
