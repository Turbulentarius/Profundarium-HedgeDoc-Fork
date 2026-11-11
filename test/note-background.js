'use strict'
const assert = require('assert')
const fs = require('fs')
const vm = require('vm')
const { JSDOM } = require('jsdom')

describe('Note backgrounds', function () {
  it('switches media safely, restores defaults, and respects reduced motion', function () {
    const dom = new JSDOM('<div><main></main></div>', { url: 'https://notes.example/note' })
    const window = dom.window
    const host = window.document.querySelector('div')
    window.defaultBackground = '/default.jpg'
    window.matchMedia = () => ({ matches: true })
    window.HTMLMediaElement.prototype.pause = function () {}
    window.HTMLMediaElement.prototype.load = function () {}
    const view = { closest: () => [host], addClass: () => {} }
    const source = fs.readFileSync(require.resolve('../public/js/extra.js'), 'utf8')
    const start = source.indexOf('export function applyNoteBackground')
    const end = source.indexOf('// parse meta', start)
    const context = vm.createContext({ window, document: window.document, URL })
    vm.runInContext(source.slice(start, end).replace('export function', 'function'), context)
    const apply = meta => context.applyNoteBackground(view, meta)
    apply({})
    const original = host.querySelector('img')
    assert.strictEqual(original.src, 'https://notes.example/default.jpg')
    apply({})
    assert.strictEqual(host.querySelector('img'), original)
    apply({ background: '/movie.webm?token=abc' })
    const video = host.querySelector('video')
    assert(video.muted && video.loop && video.playsInline)
    assert.strictEqual(video.autoplay, false)
    window.matchMedia = () => ({ matches: false })
    apply({ background: { src: '/stream', type: 'video' } })
    assert.strictEqual(host.querySelector('video').autoplay, true)
    for (const background of [false, '', 'javascript:alert(1)', 'data:text/html,bad', { src: 42 }, ['bad']]) {
      apply({ background })
      assert.strictEqual(host.querySelector('.note-background'), null)
    }
    apply({})
    assert(host.querySelector('img'))
    window.close()
  })
})
