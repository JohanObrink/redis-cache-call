'use strict';
const crypto = require('crypto');
const EventEmitter = require('events').EventEmitter;
const redis = require('redis');
const globalEmitter = new EventEmitter();
const emitterMethods = ['on', 'addListener', 'removeListener', 'removeAllListeners'];

function emitError(emitter, error) {
  if(emitter._events.error) {
    emitter.emit('error', error);
  }
}

function makeKey(name, args) {
  let hashedArgs = crypto
    .createHash('sha256')
    .update(JSON.stringify(args))
    .digest('base64');
  return `${name}_${hashedArgs}`;
}

function cacheStore(client, key, data, ttl) {
  return new Promise((resolve, reject) => {
    client.set(key, JSON.stringify(data), (err) => {
      if(err) {
        reject(err);
      } else if(ttl) {
        client.expire(key, ttl, (err) => {
          if(err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

function cacheRetrieve(client, key) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, res) => {
      if(err) {
        reject(err);
      } else {
        resolve(JSON.parse(res));
      }
    });
  });
}

function cache(client, name, args, data, ttl) {
  let key = makeKey(name, args);
  if(data) {
    return cacheStore(client, key, data, ttl);
  } else {
    return cacheRetrieve(client, key);
  }
}

function cacheCall(client, name, ttl, func, fragile) {
  if(typeof ttl === 'function') {
    fragile = func;
    func = ttl;
    ttl = undefined;
  }
  let emitter = new EventEmitter();
  let cached = function () {
    let args = Array.from(arguments);
    let key = makeKey(name, args);
    return new Promise((resolve, reject) => {
      client.get(key, (err, res) => {
        if(res) {
          resolve(JSON.parse(res));
        } else {
          if(err) {
            emitError(emitter, err);
            emitError(globalEmitter, err);
            if(fragile) { return reject(err); }
          }
          func.apply(null, args)
            .then(res => {
              client.set(key, JSON.stringify(res), (err) => {
                if(err) {
                  emitError(emitter, err);
                  emitError(globalEmitter, err);
                  if(fragile) { return reject(err); }
                } else {
                  if(ttl) {
                    client.expire(key, ttl, (err) => {
                      if(err) {
                        emitError(emitter, err);
                        emitError(globalEmitter, err);
                        if(fragile) { return reject(err); }
                      } else if(fragile) {
                        resolve(res);
                      }
                    });
                  } else {
                    resolve(res);
                  }
                }
              });
              if(!fragile) { resolve(res); }
            })
            .catch(reject);
        }
      });
    });
  };
  emitterMethods.forEach(key => {
    cached[key] = emitter[key].bind(emitter);
  });

  return cached;
}

function init(config) {
  let client = redis.createClient(config);
  let boundCache = cache.bind(null, client);
  let boundCacheCall = cacheCall.bind(null, client);
  emitterMethods.forEach(key => {
    boundCacheCall[key] = globalEmitter[key].bind(globalEmitter);
  });
  return {
    cache: boundCache,
    cacheCall: boundCacheCall
  };
}

module.exports = {init};
