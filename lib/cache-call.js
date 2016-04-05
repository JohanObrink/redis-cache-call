'use strict';
const EventEmitter = require('events').EventEmitter;
const redis = require('redis');
const globalEmitter = new EventEmitter();
const emitterMethods = ['on', 'addListener', 'removeListener', 'removeAllListeners'];

function emitError(emitter, error) {
  if(emitter._events.error) {
    emitter.emit('error', error);
  }
}

function cacheCall(client, name, ttl, func, fragile) {
  let emitter = new EventEmitter();
  let cached = function () {
    let args = Array.from(arguments);
    let key = [name].concat(args).join('|');
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
                  client.expire(key, ttl, (err) => {
                    if(err) {
                      emitError(emitter, err);
                      emitError(globalEmitter, err);
                      if(fragile) { return reject(err); }
                    } else if(fragile) {
                      resolve(res);
                    }
                  });
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
  let cacheFunc = cacheCall.bind(null, client);
  emitterMethods.forEach(key => {
    cacheFunc[key] = globalEmitter[key].bind(globalEmitter);
  });
  return cacheFunc;
}

module.exports = init;
