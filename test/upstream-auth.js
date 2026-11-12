'use strict'

const assert = require('assert')
const models = require('../lib/models')

describe('Email authentication security backport', function () {
  // Earlier avatar/CSP suites install a config mock; auth exercises real defaults.
  before(() => require('mock-require').stop('../lib/config'))
  beforeEach(() => models.sequelize.sync({ force: true }))

  it('retains the email address when registering a new local account', async function () {
    const router = require('../lib/web/auth/email')
    const route = router.stack.find(layer => layer.route && layer.route.path === '/register').route
    const handler = route.stack[route.stack.length - 1].handle
    await new Promise((resolve, reject) => {
      handler({ body: { email: 'registered@example.com', password: 'test-password' }, flash: () => {} }, {
        redirect: resolve,
        status: () => ({ render: () => reject(new Error('Registration failed')) })
      }, reject)
    })
    const user = await models.User.findOne({ where: { email: 'registered@example.com' } })
    assert(user)
    assert.strictEqual(await user.verifyPassword('test-password'), true)
  })

  it('authenticates local accounts and rejects missing users through Passport', async function () {
    require('../lib/web/auth/email')
    const strategy = require('passport')._strategy('local')
    const verify = (email, password) => new Promise((resolve, reject) => {
      strategy._verify(email, password, (error, user) => error ? reject(error) : resolve(user))
    })
    const user = await models.User.create({ email: 'login@example.com', password: 'test-password' })
    assert.strictEqual((await verify(user.email, 'test-password')).id, user.id)
    assert.strictEqual(await verify(user.email, 'wrong-password'), false)
    assert.strictEqual(await verify('missing@example.com', 'test-password'), false)
  })

  it('rejects unknown accounts even if their password matches the dummy hash', async function () {
    assert.strictEqual(await models.User.verifyPassword('my secret pw', null), false)
    assert.strictEqual(await models.User.verifyPassword('incorrect', null), false)
  })
})
