'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { JSDOM } = require('jsdom')
const ejs = require('ejs')
const models = require('../lib/models')

describe('Profile URL sanitization', function () {
  it('rejects script URLs and escapes CSS delimiters in avatar URLs', function () {
    const photo = source => models.User.parsePhotoByProfile({ provider: 'oauth2', photo: source })
    assert.strictEqual(photo('javascript:alert(1)'), null)
    assert.strictEqual(photo('file:///etc/passwd'), null)
    assert.strictEqual(photo('https://example.com/avatar.png'), 'https://example.com/avatar.png')
    assert(!/[()'"\\]/.test(photo('https://example.com/image(1).png?q=\'quoted\'')))
  })
})

describe('Published note metadata', function () {
  it('preserves background overrides when the server strips YAML and re-adds breaks', function () {
    const template = fs.readFileSync(path.join(__dirname, '../public/views/pretty.ejs'), 'utf8')
    const metaMarkup = template.match(/<div id="meta"[^>]*>[\s\S]*?<\/div>/)[0]
    const metadata = { background: '#123456', breaks: false, description: '</div><img src=x onerror=alert(1)>' }
    const dom = new JSDOM(ejs.render(metaMarkup, { meta: JSON.stringify(metadata) }) + '<div id="doc">text</div>')
    const $ = require('jquery')(dom.window)
    assert.strictEqual(dom.window.document.querySelector('img'), null)
    const md = { meta: {}, render: () => { md.meta = { breaks: false }; return 'rendered' } }
    const source = fs.readFileSync(path.join(__dirname, '../public/js/pretty.js'), 'utf8')
    const start = source.indexOf('const markdown =')
    const end = source.indexOf('if (md.meta.type', start)
    vm.runInNewContext(source.slice(start, end), { $, md })
    assert.strictEqual(md.meta.background, '#123456')
    assert.strictEqual(md.meta.breaks, false)
    dom.window.close()
  })
})

describe('Slideshow HTML security backport', function () {
  it('keeps authored Markdown out of slide markup until sanitization', function () {
    const dom = new JSDOM('<div class="slides"></div>')
    dom.window.$ = require('jquery')(dom.window)
    dom.window.postProcess = html => dom.window.$('<div>').html(html)
    dom.window.rewriteExternalLinks = () => {}
    const renderContext = vm.createContext({ window: {}, require, module: { exports: {} } })
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/render.js'), 'utf8'), renderContext)
    const renderer = renderContext.module.exports
    const context = {
      window: dom.window,
      document: dom.window.document,
      Node: dom.window.Node,
      exports: {},
      module: { exports: {} },
      preventXSS: renderer.preventXSS,
      escapeAttrValue: renderer.escapeAttrValue,
      md: require('markdown-it')('default', { html: true })
    }
    const source = fs.readFileSync(path.join(__dirname, '../public/js/reveal-markdown.js'), 'utf8').replace(/^import .*$/gm, '')
    vm.runInNewContext(source, context)
    const slides = dom.window.document.querySelector('.slides')
    slides.innerHTML = context.module.exports.slidify('# Slide\n</textarea><img src=x onerror="alert(1)">')
    assert.strictEqual(slides.querySelector('img'), null)
    assert(slides.querySelector('textarea').textContent.includes('<img'))
    context.module.exports.initialize()
    assert(!slides.innerHTML.includes('onerror'))
    dom.window.close()
  })
})
