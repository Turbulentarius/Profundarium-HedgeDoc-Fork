# HedgeDoc fork notes

Author: **Turbulentarius**.

This document describes the fork's customizations and the reasoning behind them.

## Normal link navigation

The link policy follows Turbulentarius's preference for consistency with normal
browser navigation, informed by Jakob Nielsen's UX recommendations. Navigation
should be predictable, with users choosing whether to open another tab or window.

Ordinary clicks should stay in the same tab. Preserve native Ctrl/Cmd-click and
middle-click behavior rather than intercepting clicks or forcing new tabs.
Explicitly authored link targets remain respected. External-link warnings can
still work with same-tab navigation.

The relevant link-rewriting logic is in `public/js/extra.js`.

## HTML media support

The sanitizer in `public/js/render.js` permits these elements and attributes:

- `video`: autoplay, controls, loop, muted, poster, preload, src, width, height,
  playsinline.
- `source`: src, type, media, sizes.
- `track`: default, kind, label, src, srclang.

Preserve this support while continuing to filter unsafe URLs and event-handler
attributes. Standard allowed elements such as `figure` and `figcaption` should
remain available as well.

## Table of contents

The fork customizes TOC styling and spacing for desktop and mobile in
`public/css/extra.css` and `public/css/site.css`. Preserve these adjustments.
The custom TOC cards, section numbers, and floating TOC button follow the
editor's night theme, including inline, sidebar, and mobile dropdown TOCs.

## Profundarium header link

This fork assumes that [Profundarium](https://github.com/beamtic/Profundarium)
is installed and available at `/profundarium/` on the same site. The header link
depends on that installation.

The note header and mobile menu include a **Profundarium** link with a globe icon.
It points to `/profundarium/` followed by the URL-encoded current note ID.
Both links stay hidden until the note permissions are received. They appear
only for publicly readable notes (`freely`, `editable`, and `locked`) and update
immediately when permissions change. Notes requiring sign-in or owner access
(`limited`, `protected`, and `private`) do not show the links.

The markup lives in `public/views/hedgedoc/header.ejs`; the URL is assigned in
`public/js/index.js` using `.ui-public-view`. Icons are decorative and use
`aria-hidden="true"`.

Known inconsistency: these header links currently have explicit `target="_blank"`
attributes, which differ from the preferred same-tab policy above.

## Regression coverage

`test/fork-customizations.js` checks native link navigation with external-link
warnings enabled and disabled, and media sanitization that retains video sources
and captions while stripping unsafe attributes and URLs.
