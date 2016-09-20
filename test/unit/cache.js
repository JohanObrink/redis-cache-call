'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const crypto = require('crypto')

chai.use(require('sinon-chai'))

function makeKey (name, args) {
  const hashedArgs = crypto
    .createHash('sha256')
    .update(JSON.stringify(args))
    .digest('base64')
  return `${name}_${hashedArgs}`
}

describe('cache-call.cache', () => {
  let redis, client, config, cache, err
  beforeEach(() => {
    config = {redis: 'config'}
    err = new Error('It b0rked!')
    client = {
      get: sinon.stub().yields(null, '{}'),
      set: sinon.stub().yields(),
      expire: sinon.stub().yields()
    }
    redis = {
      createClient: sinon.stub().returns(client)
    }

    cache = proxyquire(process.cwd() + '/lib/redis-cache-call', {
      'redis': redis
    }).init(config).cache
  })
  describe('store', () => {
    it('stores info using the correct key', () => {
      const data = {foo: 'bar'}
      const name = 'myCache'
      const args1 = 'simple'
      const args2 = {complex: true}
      const args3 = [{multiple: true}, 'foo', 'bar']

      cache(name, args1, data)
      cache(name, args2, data)
      cache(name, args3, data)

      expect(client.set)
        .calledThrice
        .calledWith(makeKey(name, args1), JSON.stringify(data))
        .calledWith(makeKey(name, args2), JSON.stringify(data))
        .calledWith(makeKey(name, args3), JSON.stringify(data))
    })
    it('sets ttl if supplied', () => {
      const key = makeKey('myCache', 'foo')
      return cache('myCache', 'foo', {foo: 'bar'}, 100)
        .then(() => {
          expect(client.expire)
            .calledOnce
            .calledWith(key, 100)
        })
    })
    it('rejects if set fails', () => {
      client.set.yields(err)
      return cache('myCache', 'foo', {foo: 'bar'})
        .then(res => Promise.reject(res))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
    it('rejects if expire fails', () => {
      client.expire.yields(err)
      return cache('myCache', 'foo', {foo: 'bar'}, 100)
        .then(res => Promise.reject(res))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
  })
  describe('retrieve', () => {
    it('retrieves information using the correct key', () => {
      const key = makeKey('myCache', 'foo')
      return cache('myCache', 'foo')
        .then(() => {
          expect(client.get)
            .calledOnce
            .calledWith(key)
        })
    })
    it('parses the returned information correctly', () => {
      const result = {foo: 'bar'}
      client.get.yields(null, JSON.stringify(result))
      return cache('myCache', 'foo')
        .then(res => {
          expect(res).to.eql(result)
        })
    })
    it('rejects if client.get throws', () => {
      client.get.yields(err)
      return cache('myCache', 'foo')
        .then(error => Promise.reject(error))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
  })
})
