# redis-cache-call
A generic, higher order function for caching promise returning function calls

## Install
```bash
npm install redis-cache-call
```

```javascript
// My redis config
const config = {};
const cacheCall = require('cacheCall')(config);

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
    // with the key myAsyncFunction|foo|bar
    // res == {foo: 'foo', bar: 'bar'}

    return myCachedFunction('foo', 'bar');
  })
  .then(res => {
    // The result {foo: 'foo', bar: 'bar'} is retrieved from redis
    // with the key myAsyncFunction|foo|bar
    // res == {foo: 'foo', bar: 'bar'}
  });
```

## Errors
The cached functions will not return errors even if redis breaks.

### Error events
To listen for errors, use:
```javascript
cacheCall.on('error', err => {
  console.log('Any cached call resulted in a redis error', err);
});

myCachedFunction.on('error', err => {
  console.log('myCachedFunction resulted in a redis error', err);
});
```

### Fragile mode
If you want the cachedCall to return an error if redis calls
(get/set/expire) break:
```javascript
const myFragileCachedFunction = cacheCall('myAsyncFunction', 100, myAsyncFunction, true);
```

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
