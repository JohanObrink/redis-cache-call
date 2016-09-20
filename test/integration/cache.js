'use strict'
const {expect} = require('chai')
const rcc = require(`${process.cwd()}/lib/redis-cache-call`)
const redis = require('redis')

const config = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
}

function clear (client) {
  return new Promise((resolve, reject) => {
    client.flushall((err, res) => {
      if (err) {
        return reject(err)
      }
      return resolve(res)
    })
  })
}

function getKeys (client, pattern) {
  return new Promise((resolve, reject) => {
    client.keys(pattern, (err, res) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(res)
      }
    })
  })
}

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('cache', () => {
  let cache, client
  before(() => {
    client = redis.createClient(config)
    cache = rcc.init(config).cache
  })
  beforeEach(() => {
    return clear(client)
  })
  afterEach(() => clear(client))
  after(() => {
    client.end(true)
  })

  it('caches correctly without ttl', () => {
    const cacheName = 'my_cache'
    const key = 'my_cache_key'
    const value = {some: {arbitrary: 'value'}}

    return cache(cacheName, key, value)
      .then(() => getKeys(client, `${cacheName}_*`))
      .then(keys => {
        expect(keys).to.have.length(1)
      })
      .then(() => cache(cacheName, key))
      .then(res => {
        expect(res).to.eql(value)
      })
  })
  it('caches correctly with ttl', () => {
    const cacheName = 'my_cache'
    const key = 'my_cache_key'
    const value = {some: {arbitrary: 'value'}}
    const ttl = 1
    return cache(cacheName, key, value, ttl)
      .then(() => getKeys(client, `${cacheName}_*`))
      .then(keys => {
        expect(keys).to.have.length(1)
      })
      .then(() => cache(cacheName, key))
      .then(res => {
        expect(res).to.eql(value)
      })
      .then(() => wait(1100))
      .then(() => getKeys(client, `${cacheName}_*`))
      .then(keys => {
        expect(keys).to.have.length(0)
      })
      .then(() => cache(cacheName, key))
      .then(res => {
        expect(res).to.be.null
      })
  })
})
