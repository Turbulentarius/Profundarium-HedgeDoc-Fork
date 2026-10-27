# Profundarium HedgeDoc Fork notes

Profundarium HedgeDoc Fork is a customized fork of HedgeDoc 1.x. The display name distinguishes this fork while retaining attribution to upstream HedgeDoc.

Author: **Turbulentarius**.

This document describes the fork's customizations and the reasoning behind them.

## Updating this fork

After pulling updates, install the locked dependencies before building:

```sh
node .yarn/releases/yarn-4.13.0.cjs install --immutable
node .yarn/releases/yarn-4.13.0.cjs build
```

Check the build output for errors before restarting the application. The build contains separate editor and HTML-export compilations; an exported HTML asset alone does not prove that the editor build succeeded.

The upstream email uniqueness migration adds a unique index to `Users.email`. Before deploying this update, back up the database and check for duplicate email addresses. Existing duplicates must be resolved before that migration can run.

## Building a container image

This repository contains the application source and build tools. Upstream keeps its Dockerfiles and container startup scripts in the separate [hedgedoc/container repository](https://github.com/hedgedoc/container). Use that repository to build this fork locally; no image registry or publication is required. The upstream `quay.io/hedgedoc/hedgedoc` images contain upstream code, not this fork.

Install Docker with the Compose plugin and Git. Beside your existing Compose file, clone the upstream container repository:

```sh
git clone https://github.com/hedgedoc/container.git hedgedoc-container
```

In your existing HedgeDoc service, replace the upstream `image:` entry with this `build:` section. This is a partial example; keep your existing environment, ports, networks, and persistent storage settings:

```yaml
services:
  hedgedoc:
    build:
      context: ./hedgedoc-container
      dockerfile: alpine/Dockerfile
      args:
        HEDGEDOC_REPOSITORY: https://github.com/Turbulentarius/Profundarium-HedgeDoc-Fork.git
        VERSION: turbulentarius/dev
```

Upstream also provides `debian/Dockerfile` if you prefer Debian. `VERSION` selects a branch or tag in the fork. The build clones that source from GitHub; it does not use a local application checkout or its uncommitted changes.

Remove source mounts that replace application files, such as `public/build` or `public/views`: the image builds the backend, frontend, and templates together. Keep configuration and upload mounts, database storage, and the existing `CMD_SESSION_SECRET`. Replacing only frontend files on an older upstream image can introduce links or features that its backend does not support.

Before upgrading, back up the database, configuration, and uploads, and review the migration requirements under [Updating this fork](#updating-this-fork). From the directory containing your Compose file, run:

```sh
docker compose config --quiet
docker compose build --no-cache hedgedoc
docker compose up -d --no-deps hedgedoc
docker compose ps -a hedgedoc
docker compose logs --tail=50 hedgedoc
```

Substitute your actual service name for `hedgedoc` if different. Build successfully before recreating the running service. These commands assume your existing database service is running.

Repeat the commands above after publishing updates to the selected fork branch. `--no-cache` ensures the build fetches the branch again rather than reusing an older checkout. To update upstream's container build files as well, run `git -C hedgedoc-container pull --ff-only` before building. No changes to the fork's Docker packaging are needed.

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

The fork customizes TOC styling and spacing for desktop and mobile in `public/css/extra.css` and `public/css/site.css`. Preserve these adjustments. The custom TOC cards, section numbers, and floating TOC button follow the editor's night theme, including inline, sidebar, and mobile dropdown TOCs.

## Profundarium header link

This fork assumes that [Profundarium](https://github.com/beamtic/Profundarium) is installed and available at `/profundarium/` on the same site. The header link depends on that installation.

The note header and mobile menu include a **Profundarium** link with a globe icon. It points to `/profundarium/` followed by the URL-encoded current note ID. Both links stay hidden until the note permissions are received. They appear only for publicly readable notes (`freely`, `editable`, and `locked`) and update immediately when permissions change. Notes requiring sign-in or owner access (`limited`, `protected`, and `private`) do not show the links.

The markup lives in `public/views/hedgedoc/header.ejs`; the URL is assigned in `public/js/index.js` using `.ui-public-view`. Icons are decorative and use `aria-hidden="true"`.

Known inconsistency: these header links currently have explicit `target="_blank"` attributes, which differ from the preferred same-tab policy above.

## Regression coverage

`test/fork-customizations.js` checks native link navigation with external-link warnings enabled and disabled, and media sanitization that retains video sources and captions while stripping unsafe attributes and URLs. It also checks both Profundarium menu entries across public and restricted permission changes.
