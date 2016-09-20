# redis-cache-call
A generic, higher order function for caching promise returning function calls

## Install
```bash
npm install redis-cache-call
```

## Use
```javascript
// My redis config
const config = {};
const redisCacheCall = require('redis-cache-call').init(config);
const cacheCall = redisCacheCall.cacheCall;
const cache = redisCacheCall.cache;
```

### .cacheCall
Wraps a call in a caching mechanism so that a redis result is returned if it exists. Otherwise, the function calls through and the result is stored in redis.

```javascript
function myAsyncFunction(foo, bar) {
  return new Promise((resolve, reject) => {
    resolve({foo, bar});
  });
}

// Calls to myCachedFunction will be cached in redis with a ttl of 100 seconds
const myCachedFunction = cacheCall('myAsyncFunction', 100, myAsyncFunction);

myCachedFunction('foo', 'bar')
  .then(res => {
    // The result {foo: 'foo', bar: 'bar'} is stored in redis
    // with the key myAsyncFunction_[sha256 hash of arguments]
    // res == {foo: 'foo', bar: 'bar'}

    return myCachedFunction('foo', 'bar');
  })
  .then(res => {
    // The result {foo: 'foo', bar: 'bar'} is retrieved from redis
    // with the key myAsyncFunction_[sha256 hash of arguments]
    // res == {foo: 'foo', bar: 'bar'}
  });
```

To use without expiration:
```javascript
const myCachedFunction = cacheCall('myAsyncFunction', myAsyncFunction);
```

#### Errors
The cached functions will not return errors even if redis breaks.

##### Error events
To listen for errors, use:
```javascript
cacheCall.on('error', err => {
  console.log('Any cached call resulted in a redis error', err);
});

myCachedFunction.on('error', err => {
  console.log('myCachedFunction resulted in a redis error', err);
});
```

#### Fragile mode
If you want the cachedCall to return an error if redis calls
(get/set/expire) break:
```javascript
const myFragileCachedFunction = cacheCall('myAsyncFunction', 100, myAsyncFunction, true);
```

### .cache
Caches or retrieves a result in/from redis

```javascript
// stores {my: {cached: 'result'}} with the key myCacheName_[sha256 of ['myCacheKey']]
// and a TTL of 100 seconds
cache('myCacheName', 'myCacheKey', {my: {cached: 'result'}}, 100)
  // and then retrieves it using the same key
  .then(_ => cache('myCacheName', 'myCacheKey'));

// If no cached result is found, null will be returned

// Same operation without TTL
cache('myCacheName', 'myCacheKey', {my: {cached: 'result'}})
  .then(_ => cache('myCacheName', 'myCacheKey'));
```

Since cache doesn't have a function to call trough on, cache is fragile by default.

# The MIT License (MIT)

Copyright (c) 2016 Johan Öbrink

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
