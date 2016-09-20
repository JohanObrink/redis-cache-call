'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire')

chai.use(require('sinon-chai'))
require('sinon-as-promised')

describe('redis-cache-call.cacheCall', () => {
  let redis, client, config, func, cacheCall, cached, result, err
  beforeEach(() => {
    config = {redis: 'config'}
    result = {
      some: 'data',
      isNice: true,
      level: 9001
    }
    err = new Error('It b0rked!')

    client = {
      get: sinon.stub().yields(null, JSON.stringify(result)),
      set: sinon.stub().yields(),
      expire: sinon.stub().yields()
    }
    redis = {
      createClient: sinon.stub().returns(client)
    }
    func = sinon.stub().resolves(result)

    cacheCall = proxyquire(process.cwd() + '/lib/redis-cache-call', {
      'redis': redis
    }).init(config).cacheCall

    cached = cacheCall('myFunc', 100, func)
  })
  it('tries to read using the correct key', () => {
    return cached('hello', 'world')
      .then(() => {
        expect(client.get)
          .calledOnce
          .calledWith('myFunc_lL7bJvscuVR7W3eQLolSLzE8f3/i6fAXXPsKJEh47gc=')
      })
  })
  describe('cache exists', () => {
    it('does not call the function', () => {
      return cached('hello', 'world')
        .then(() => {
          expect(func)
            .not.called
        })
    })
    it('returns cached result', () => {
      return cached('hello', 'world')
        .then(res => {
          expect(res).to.eql(result)
        })
    })
  })
  describe('cache does not exist', () => {
    beforeEach(() => {
      client.get.yields(null, null)
    })
    it('calls the function with the correct parameters', () => {
      return cached('hello', 'world')
        .then(() => {
          expect(func)
            .calledOnce
            .calledWith('hello', 'world')
        })
    })
    it('stores the function result in cache', () => {
      return cached('hello', 'world')
        .then(() => {
          expect(client.set)
            .calledOnce
            .calledWith('myFunc_lL7bJvscuVR7W3eQLolSLzE8f3/i6fAXXPsKJEh47gc=', JSON.stringify(result))
        })
    })
    it('sets the correct ttl', () => {
      return cached('hello', 'world')
        .then(() => {
          expect(client.expire)
            .calledOnce
            .calledWith('myFunc_lL7bJvscuVR7W3eQLolSLzE8f3/i6fAXXPsKJEh47gc=', 100)
        })
    })
    it('does not set ttl if ttl is omitted', () => {
      cached = cacheCall('myFunc', func)
      return cached('hello', 'world')
        .then(() => {
          expect(client.set)
            .calledOnce
            .calledWith('myFunc_lL7bJvscuVR7W3eQLolSLzE8f3/i6fAXXPsKJEh47gc=', JSON.stringify(result))
          expect(client.expire)
            .not.called
        })
    })
    it('returns the result', () => {
      return cached('hello', 'world')
        .then(res => {
          expect(res).to.eql(result)
        })
    })
  })
  describe('redis b0rks', () => {
    let onGlobalError, onLocalError
    beforeEach(() => {
      onGlobalError = sinon.spy()
      onLocalError = sinon.spy()
      cacheCall.on('error', onGlobalError)
      cached.on('error', onLocalError)
    })
    it('calls the function if client.get returns an error', () => {
      client.get.yields(err)
      return cached('hello', 'world')
        .then(() => {
          expect(func)
            .calledOnce
            .calledWith('hello', 'world')
        })
    })
    it('client.get emits an error event on the cached function', () => {
      client.get.yields(err)
      return cached('hello', 'world')
        .then(() => {
          expect(onLocalError)
            .calledOnce
            .calledWith(err)
        })
    })
    it('client.get emits an error event on cacheCall', () => {
      client.get.yields(err)
      return cached('hello', 'world')
        .then(() => {
          expect(onGlobalError)
            .calledOnce
            .calledWith(err)
        })
    })
    it('client.set emits an error event on the cached function', () => {
      client.get.yields()
      client.set.yields(err)
      cached('hello', 'world')
        .then(() => {
          expect(onLocalError)
            .calledOnce
            .calledWith(err)
        })
    })
    it('client.set emits an error event on cacheCall', () => {
      client.get.yields()
      client.set.yields(err)
      return cached('hello', 'world')
        .then(() => {
          expect(onGlobalError)
            .calledOnce
            .calledWith(err)
        })
    })
    it('client.expire emits an error event on the cached function', () => {
      client.get.yields()
      client.expire.yields(err)
      cached('hello', 'world')
        .then(() => {
          expect(onLocalError)
            .calledOnce
            .calledWith(err)
        })
    })
    it('client.expire emits an error event on cacheCall', () => {
      client.get.yields()
      client.expire.yields(err)
      return cached('hello', 'world')
        .then(() => {
          expect(onGlobalError)
            .calledOnce
            .calledWith(err)
        })
    })
  })
  describe('fragile', () => {
    it('fails if client.get returns an error', () => {
      cached = cacheCall('myFunc', 100, func, true)
      client.get.yields(err)
      return cached('hello', 'world')
        .then(r => Promise.reject(r))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
    it('fails if client.get returns an error with no ttl', () => {
      cached = cacheCall('myFunc', func, true)
      client.get.yields(err)
      return cached('hello', 'world')
        .then(r => Promise.reject(r))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
    it('calls the function if client.set returns an error', () => {
      cached = cacheCall('myFunc', 100, func, true)
      client.get.yields()
      client.set.yields(err)
      return cached('hello', 'world')
        .then(r => Promise.reject(r))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
    it('calls the function if client.set returns an error with no ttl', () => {
      cached = cacheCall('myFunc', func, true)
      client.get.yields()
      client.set.yields(err)
      return cached('hello', 'world')
        .then(r => Promise.reject(r))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
    it('calls the function if client.expire returns an error', () => {
      cached = cacheCall('myFunc', 100, func, true)
      client.get.yields()
      client.expire.yields(err)
      return cached('hello', 'world')
        .then(r => Promise.reject(r))
        .catch(error => {
          expect(error).to.equal(err)
        })
    })
  })
})
