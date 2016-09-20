'use strict'
const chai = require('chai')
const {expect} = chai
const rcc = require(`${process.cwd()}/lib/redis-cache-call`)
const redis = require('redis')
const {stub} = require('sinon')
chai.use(require('sinon-chai'))
require('sinon-as-promised')

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

describe('cacheCall', () => {
  let cacheCall, client, baseFunc, cachedFunc
  before(() => {
    client = redis.createClient(config)
    cacheCall = rcc.init(config).cacheCall
  })
  beforeEach(() => {
    baseFunc = stub()
    return clear(client)
  })
  afterEach(() => clear(client))
  after(() => {
    client.end(true)
  })

  it('caches successful calls correctly', () => {
    const args = ['some', 'key']
    const result = {some: 'result'}

    baseFunc.resolves(result)
    cachedFunc = cacheCall('cachedBaseFunc', baseFunc)

    return cachedFunc(...args)
      .then(res => {
        expect(baseFunc)
          .calledOnce
          .calledWith(...args)
        expect(res).to.eql(result)
      })
      .then(() => getKeys(client, 'cachedBaseFunc_*'))
      .then(keys => {
        expect(keys).to.have.length(1)
      })
      .then(() => cachedFunc(...args))
      .then(res => {
        expect(baseFunc)
          .calledOnce
        expect(res).to.eql(result)
      })
  })
  it('does not cache unsuccessful calls', () => {
    const args = ['some', 'key']
    const result = {some: 'result'}
    const error = new Error('b0rk')

    baseFunc.rejects(error)
    cachedFunc = cacheCall('cachedBaseFunc', baseFunc)

    return cachedFunc(...args)
      .catch(err => {
        expect(baseFunc)
          .calledOnce
          .calledWith(...args)
        expect(err.toString()).to.equal(error.toString())
      })
      .then(() => getKeys(client, 'cachedBaseFunc_*'))
      .then(keys => {
        expect(keys).to.have.length(0)
      })
      .then(() => {
        baseFunc.resolves(result)
      })
      .then(() => cachedFunc(...args))
      .then(res => {
        expect(baseFunc)
          .calledTwice
          .calledWith(...args)
        expect(res).to.eql(result)
      })
      .then(() => getKeys(client, 'cachedBaseFunc_*'))
      .then(keys => {
        expect(keys).to.have.length(1)
      })
  })
  it('caches correctly with ttl', () => {
    const args = ['some', 'key']
    const result = {some: 'result'}
    const ttl = 1

    baseFunc.resolves(result)
    cachedFunc = cacheCall('cachedBaseFunc', ttl, baseFunc)

    return cachedFunc(...args)
      .then(res => {
        expect(baseFunc)
          .calledOnce
          .calledWith(...args)
        expect(res).to.eql(result)
      })
      .then(() => getKeys(client, 'cachedBaseFunc_*'))
      .then(keys => {
        expect(keys).to.have.length(1)
      })
      .then(() => wait(1100))
      .then(() => cachedFunc(...args))
      .then(res => {
        expect(baseFunc)
          .calledTwice
          .calledWith(...args)
        expect(res).to.eql(result)
      })
  })
})
