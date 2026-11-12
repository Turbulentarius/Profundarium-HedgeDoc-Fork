'use strict'

const assert = require('assert')
const EditorSocketIOServer = require('../lib/ot/editor-socketio-server')

describe('Realtime selection security backport', function () {
  it('ignores malformed selections and continues to accept valid client updates', function () {
    const events = {}
    const socket = {
      id: 'security-test-client',
      join: () => {},
      emit: () => {},
      on: (name, handler) => { events[name] = handler },
      broadcast: { to: () => ({ emit: () => {} }) }
    }
    const server = new EditorSocketIOServer('text', [], 'security-test-note')
    server.addClient(socket)
    for (const selection of [{ ranges: {} }, { ranges: [{}] }, { ranges: [{ anchor: 'bad', head: 1 }] }]) {
      assert.doesNotThrow(() => events.selection(selection))
    }
    events.selection({ ranges: [{ anchor: 1, head: 2 }] })
    assert.strictEqual(server.users[socket.id].selection.ranges[0].anchor, 1)
    events.selection(null)
    assert.strictEqual(server.users[socket.id].selection, undefined)
    assert.strictEqual(server.document, 'text')
  })
})
