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
    const sidebar = window.document.createElement('div')
    const mobile = window.document.createElement('div')
    host.append(sidebar, mobile)
    context.appendBackgroundAudioControl(sidebar)
    context.appendBackgroundAudioControl(mobile)
    const button = sidebar.querySelector('button')
    assert.strictEqual(button.getAttribute('aria-label'), 'Unmute background video')
    button.click()
    assert.strictEqual(video.muted, false)
    assert.strictEqual(mobile.querySelector('button').getAttribute('aria-pressed'), 'true')
    button.click()
    assert.strictEqual(video.muted, true)
    sidebar.remove()
    mobile.remove()
    window.matchMedia = () => ({ matches: false })
    apply({ background: { src: '/stream', type: 'video' } })
    assert.strictEqual(host.querySelector('video').autoplay, true)
    for (const color of ['#abc', '#abcd', '#123456', '#12345678']) {
      apply({ background: color })
      const layer = host.querySelector('.note-background')
      assert.strictEqual(layer.tagName, 'DIV')
      assert(layer.style.backgroundColor)
      apply({ background: color })
      assert.strictEqual(host.querySelector('.note-background'), layer)
    }
    window.defaultBackground = '#123456'
    apply({})
    assert.strictEqual(host.querySelector('.note-background').tagName, 'DIV')
    for (const background of [false, 'none', ' NONE ', '#invalid', '', 'javascript:alert(1)', 'data:text/html,bad', { src: 42 }, ['bad']]) {
      apply({ background })
      assert.strictEqual(host.querySelector('.note-background'), null)
    }
    window.defaultBackground = 'none'
    apply({})
    assert.strictEqual(host.querySelector('.note-background'), null)
    window.defaultBackground = '/default.jpg'
    apply({})
    assert(host.querySelector('img'))
    window.close()
  })
})
