'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire')

chai.use(require('sinon-chai'))

describe('redis-cache-call.init', () => {
  let redisCacheCall, redis, config
  beforeEach(() => {
    config = {redis: 'config'}
    redis = {
      createClient: sinon.stub().returns({})
    }
    redisCacheCall = proxyquire(process.cwd() + '/lib/redis-cache-call', {
      'redis': redis
    })
  })
  it('creates a redis client using the correct config', () => {
    redisCacheCall.init(config)
    expect(redis.createClient)
      .calledOnce
      .calledWith(config)
  })
})
