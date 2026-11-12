'use strict'

const assert = require('assert')
const { checkViewPermission } = require('../lib/permissions')

describe('HTTP and realtime read permissions', function () {
  for (const transport of ['http', 'realtime']) {
    const request = (id, authenticated) => transport === 'http'
      ? { user: id ? { id } : undefined, isAuthenticated: () => authenticated }
      : { user: id ? { id, logged_in: authenticated } : undefined }
    const note = permission => ({ permission, [transport === 'http' ? 'ownerId' : 'owner']: 'owner' })
    it(`preserves public and restricted access over ${transport}, rejecting invalid permissions`, function () {
      for (const permission of ['freely', 'editable', 'locked']) {
        assert.strictEqual(checkViewPermission(request(null, false), note(permission)), true)
      }
      for (const permission of ['limited', 'protected', 'private']) {
        assert.strictEqual(checkViewPermission(request(null, false), note(permission)), false)
        assert.strictEqual(checkViewPermission(request('owner', true), note(permission)), true)
      }
      assert.strictEqual(checkViewPermission(request('other', true), note('private')), false)
      assert.strictEqual(checkViewPermission(request('owner', false), note('private')), false)
      for (const permission of ['invalid', null, undefined, '__proto__']) {
        assert.strictEqual(checkViewPermission(request('owner', true), note(permission)), false)
      }
    })
  }
})
