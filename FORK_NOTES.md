# Profundarium HedgeDoc Fork notes

Profundarium HedgeDoc Fork is a customized fork of HedgeDoc 1.x. The display name distinguishes this fork while retaining attribution to upstream HedgeDoc.

Author: **Turbulentarius**.

This document describes the fork's customizations and the reasoning behind them.

## Updating this fork

After pulling updates, install the dependencies and build the application:

```sh
node .yarn/releases/yarn-4.13.0.cjs install --immutable
node .yarn/releases/yarn-4.13.0.cjs build
```

Restart HedgeDoc only after the build finishes without errors.

When upgrading an existing installation, back up the database first. This version requires each account to have a different email address. If multiple accounts share an email address, the database update will fail. Check for duplicates before upgrading and resolve them without deleting accounts or their notes.

## Fork releases and container images

The fork uses release tags such as `profundarium-v1.12.0-1`. The upstream version
identifies the base; the final number identifies successive fork releases.
Never move or reuse published release tags.

The `Publish fork release image` workflow builds matching tag pushes, runs lint,
the Mocha suite, and the frontend build, then checks the production runtime.
It publishes a Linux AMD64 image to GHCR and creates a GitHub Release after the
image has been pushed. It does not publish on an ordinary branch push or merge.
The workflow rejects tags whose version differs from `package.json` or whose
commit is not contained in the fork's `master` branch. HedgeDoc 2 branches are
not release sources for this workflow.

Before the first release, enable GitHub Actions in the fork, allow the workflow
to publish packages and create releases, and merge the tested `turbulentarius/dev`
changes (including the release workflow) into `master`. Review and resolve any
merge conflicts first; the existing `master` may contain older upstream code.
Then, from the reviewed stable commit, create and push a signed tag:

```sh
git tag -s profundarium-v1.12.0-1 -m "Profundarium HedgeDoc Fork 1.12.0 release 1"
git push origin profundarium-v1.12.0-1
```

The workflow uses GitHub's built-in `GITHUB_TOKEN`; no personal access token is
required. After the first publication, check the GHCR package settings and make
the package public if anonymous image pulls are desired. Private packages require
registry authentication. The first release has not been published merely by
adding this workflow.

In Compose, use the published version explicitly (the following image becomes
available only after the release workflow succeeds):

```yaml
services:
  hedgedoc:
    image: ghcr.io/turbulentarius/profundarium-hedgedoc-fork:profundarium-v1.12.0-1
    environment:
      CMD_DEFAULT_BACKGROUND: none
```

Keep your existing database, authentication settings, configuration, uploads,
and `CMD_SESSION_SECRET`. This image runs as UID/GID `10000:10000`; ensure the
uploads directory is writable by that account. Its working directory is
`/hedgedoc`; uploads default to `/hedgedoc/public/uploads`. Keep the appropriate
upload mount or set `uploadsPath` in `config.json` for a different path. Configuration can
be mounted read-only at `/hedgedoc/config.json`. Background media must be hosted
at a browser-accessible URL; local static files can be mounted read-only at
`/hedgedoc/public/static` and referenced with `/static/filename.mp4`.

Remove mounts that replace application code, `public/build`, or `public/views`:
the image already contains the matching backend, frontend, and templates.
Remove an existing Compose `build:` section when switching to a published image.
Back up the database and uploads before upgrading and read [Updating this
fork](#updating-this-fork), then run:

```sh
docker compose config --quiet
docker compose pull hedgedoc
docker compose up -d --no-deps hedgedoc
docker compose ps -a hedgedoc
docker compose logs --tail=50 hedgedoc
```

Substitute your service name if different. Pin the published image digest for
stronger reproducibility. Reverting the image does not reverse database migrations;
check migration compatibility before rolling back.

## Building a container image locally

Build the current checkout, including uncommitted source changes, without
publishing anything:

```sh
docker build -f docker/fork/Dockerfile -t profundarium-hedgedoc:local .
```

The multi-stage Alpine build installs locked dependencies, runs lint and tests,
builds the frontend, and keeps build tools out of the non-root runtime image.
The build context excludes local configuration, uploads, dependencies, and
previously generated bundles. This image uses `node app.js` directly; supply
`CMD_*` environment variables or `config.json` rather than depending on upstream
container entrypoint scripts. The upstream `quay.io/hedgedoc/hedgedoc` images do
not contain this fork's changes.

## Normal link navigation

The link policy follows Turbulentarius's preference for consistency with normal browser navigation, informed by Jakob Nielsen's UX recommendations. Navigation should be predictable, with users choosing whether to open another tab or window.

Ordinary clicks should stay in the same tab. Preserve native Ctrl/Cmd-click and middle-click behavior rather than intercepting clicks or forcing new tabs. Explicitly authored link targets remain respected. External-link warnings can still work with same-tab navigation.

The relevant link-rewriting logic is in `public/js/extra.js`.

## HTML media support

The sanitizer in `public/js/render.js` permits these elements and attributes:

- `video`: autoplay, controls, loop, muted, poster, preload, src, width, height, playsinline.
- `source`: src, type, media, sizes.
- `track`: default, kind, label, src, srclang.

Preserve this support while continuing to filter unsafe URLs and event-handler attributes. Standard allowed elements such as `figure` and `figcaption` should remain available as well.

## Table of contents

The fork customizes TOC styling and spacing for desktop and mobile in `public/css/extra.css` and `public/css/site.css`. Preserve these adjustments. The custom TOC cards, section numbers, and floating TOC button follow the editor's night theme, including inline, sidebar, and mobile dropdown TOCs. The `.toc-menu` controls share the TOC card background, border, rounded corners, and padding so they remain readable over note backgrounds.

## Profundarium header link

This fork assumes that [Profundarium](https://github.com/beamtic/Profundarium) is installed and available at `/profundarium/` on the same site. The header link depends on that installation.

The note header and mobile menu include a **Profundarium** link with a globe icon. It points to `/profundarium/` followed by the URL-encoded current note ID. Both links stay hidden until the note permissions are received. They appear only for publicly readable notes (`freely`, `editable`, and `locked`) and update immediately when permissions change. Notes requiring sign-in or owner access (`limited`, `protected`, and `private`) do not show the links.

The markup lives in `public/views/hedgedoc/header.ejs`; the URL is assigned in `public/js/index.js` using `.ui-public-view`. Icons are decorative and use `aria-hidden="true"`.

Known inconsistency: these header links currently have explicit `target="_blank"` attributes, which differ from the preferred same-tab policy above.

## Regression coverage

`test/fork-customizations.js` checks native link navigation with external-link warnings enabled and disabled, and media sanitization that retains video sources and captions while stripping unsafe attributes and URLs. It also checks both Profundarium menu entries across public and restricted permission changes.

## Note backgrounds and spacing

Set `defaultBackground` in the instance configuration or `CMD_DEFAULT_BACKGROUND`
to an image or video URL. The default is empty. Restart after configuration changes.
Notes can override it in their YAML front matter, alongside `robots` and `opengraph`:

```yaml
---
background: /uploads/landscape.webp
---
```

Video URLs ending in `.mp4`, `.webm`, `.ogv`, or `.mov` (including URLs with query
strings) are detected automatically. For a media URL without an extension, use:

```yaml
---
background:
  src: https://example.org/background
  type: video
---
```

Use `type: image` to force an image. Set `background: none` (or `background: false`)
to disable the configured background and use HedgeDoc's normal theme background.
For a solid color, use a quoted hex code, for example `background: "#1a2b3c"`.
Three-, four-, six-, and eight-digit hex colors are supported. Quote hex values
in YAML because an unquoted `#` begins a comment. The `none` value and hex colors
also work with `defaultBackground` / `CMD_DEFAULT_BACKGROUND`. In Compose, for
example, use `CMD_DEFAULT_BACKGROUND: "#1a2b3c"`. Removing the field restores the default. Only HTTP(S) and relative
URLs are accepted. External media must also be allowed by the instance CSP.
Videos are decorative, muted, looping, and inline; autoplay is disabled when the
page loads with reduced motion enabled. Browser autoplay restrictions still apply.
When a video background is active, a round button below the TOC menu toggles
audio on/off. It starts muted and is available in both sidebar and mobile TOCs;
its label and icon reflect the current audio state.

Editor previews and published notes have an opaque card with `2rem` corners,
`2.2rem` side padding to leave room for heading link icons and `50px` top
padding to accommodate the infobar. Bottom padding is `2.2rem`.
A `30px` bottom margin separates the card from the viewport edge.
The editor preview area also has `2em` bottom padding. The infobar uses a `-35px`
bottom margin to sit inside the card. The sidebar TOC has a `15px` left gap; its width
and visibility threshold reserve that space on narrower screens. These offsets
use pixels, matching HedgeDoc’s existing infobar and sidebar positioning.
Slides retain their existing presentation layout. Backgrounds and extra spacing
are omitted when printing.
