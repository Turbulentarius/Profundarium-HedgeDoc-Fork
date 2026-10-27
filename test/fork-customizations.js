'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { JSDOM } = require('jsdom')

// Exercise the browser helper without loading the editor and its UI plugins.
const source = fs.readFileSync(path.join(__dirname, '../public/js/extra.js'), 'utf8')
const start = source.indexOf('export function rewriteExternalLinks (view) {')
const end = source.indexOf('window.rewriteExternalLinks = rewriteExternalLinks', start)
assert(start >= 0 && end > start)
const helper = source.slice(start, end).replace('export function', 'function')

describe('Profundarium link visibility', function () {
  it('shows both menu entries only for publicly readable permissions, including live changes', function () {
    const header = fs.readFileSync(path.join(__dirname, '../public/views/hedgedoc/header.ejs'), 'utf8')
    const dom = new JSDOM(header)
    const window = dom.window
    const $ = require('jquery')(window)
    const entries = $('.ui-public-view').closest('li')
    assert.strictEqual(entries.length, 2)
    entries.each((index, entry) => assert($(entry).hasClass('hidden')))

    const editor = fs.readFileSync(path.join(__dirname, '../public/js/index.js'), 'utf8')
    const start = editor.indexOf('function updatePermission (newPermission) {')
    const end = editor.indexOf('\nfunction havePermission () {', start)
    assert(start >= 0 && end > start)
    const context = vm.createContext({
      window,
      $,
      permission: null,
      personalInfo: {},
      ui: { infobar: { permission: { label: $('<span>') } } }
    })
    vm.runInContext(editor.slice(start, end), context)
    for (const permission of ['private', 'freely', 'limited', 'editable', 'protected', 'locked', null, 'unknown']) {
      context.updatePermission(permission)
      const hidden = !['freely', 'editable', 'locked'].includes(permission)
      entries.each((index, entry) => assert.strictEqual($(entry).hasClass('hidden'), hidden, String(permission)))
    }
    window.close()
  })
})

describe('Fork navigation', function () {
  for (const warning of [true, false]) {
    it(`preserves native link navigation with external warnings ${warning}`, function () {
      const dom = new JSDOM('', { url: 'https://notes.example/sub/note' })
      const window = dom.window
      window.externalLinkWarning = warning
      window.externalLinkWhitelist = ['trusted.example']
      window.urlpath = 'sub'
      const $ = require('jquery')(window)
      const view = $('<div><a href="https://outside.example/page">external</a><a href="https://notes.example/other">internal</a><a href="https://trusted.example/page">trusted</a><a href="#section">anchor</a><a href="https://outside.example/explicit" target="_blank">explicit</a></div>')
      const context = vm.createContext({ window, $, URL })
      vm.runInContext(helper, context)
      context.rewriteExternalLinks(view)
      const links = view.find('a')
      assert.strictEqual(links.eq(0).attr('href'), warning ? 'https://notes.example/sub/_link?url=https%3A%2F%2Foutside.example%2Fpage' : 'https://outside.example/page')
      assert.strictEqual(links.eq(1).attr('href'), 'https://notes.example/other')
      assert.strictEqual(links.eq(2).attr('href'), 'https://trusted.example/page')
      assert.strictEqual(links.eq(3).attr('href'), '#section')
      links.slice(0, 4).each((index, link) => {
        assert.strictEqual($(link).attr('target'), undefined)
        const event = $.Event('click', { ctrlKey: true })
        $(link).triggerHandler(event)
        assert.strictEqual(event.isDefaultPrevented(), false)
      })
      assert.strictEqual(links.eq(4).attr('target'), '_blank')
      window.close()
    })
  }
})

describe('Fork media sanitization', function () {
  it('retains video sources and captions but strips script attributes and URLs', function () {
    const context = vm.createContext({ window: {}, require, module: { exports: {} } })
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/render.js'), 'utf8'), context)
    const html = context.module.exports.preventXSS('<video controls playsinline onerror="alert(1)"><source src="/movie.webm" type="video/webm"><track src="/captions.vtt" kind="captions" srclang="en"></video><video src="javascript:alert(1)"></video>')
    assert(html.includes('<video controls playsinline>'))
    assert(html.includes('src="/movie.webm"'))
    assert(html.includes('src="/captions.vtt"'))
    assert(!html.includes('onerror'))
    assert(!html.includes('javascript:'))
  })
})
