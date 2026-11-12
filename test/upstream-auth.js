'use strict'

const assert = require('assert')
const models = require('../lib/models')

describe('Email authentication security backport', function () {
  // Earlier avatar/CSP suites install a config mock; auth exercises real defaults.
  before(() => require('mock-require').stop('../lib/config'))
  beforeEach(() => models.sequelize.sync({ force: true }))

  it('authenticates local accounts and rejects missing users through Passport', async function () {
    require('../lib/web/auth/email')
    const passport = require('passport')
    const verify = (email, password) => new Promise((resolve, reject) => {
      passport.authenticate('local', (error, user) => error ? reject(error) : resolve(user))(
        { body: { email, password } }, {}, reject
      )
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
