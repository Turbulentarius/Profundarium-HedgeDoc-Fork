# HedgeDoc fork instructions

Read [FORK_NOTES.md](FORK_NOTES.md) before changing this fork. It describes
Turbulentarius's customizations and their rationale.

- Preserve normal same-tab navigation, native modifier-click behavior, HTML media
  support with sanitization, TOC styling, and the Profundarium header link.
- Keep sessions database-backed through `connect-session-sequelize`; the
  Sandboxer integration supplies a stable `CMD_SESSION_SECRET` so sessions
  survive restarts.
- Keep changes focused and validate affected behavior, including the regression
  tests in `test/fork-customizations.js` when relevant.
- This fork targets HedgeDoc 1.x. Do not migrate to HedgeDoc 2 without explicit
  instruction.
- Keep documentation focused on the fork. Do not include private development
  environments, deployment details, credentials, or troubleshooting history.
