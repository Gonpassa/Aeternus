---
name: eslint-config
description: Rationale and rule-by-rule overrides for this repo's ESLint configs. Use before changing client/eslint.config.js or backend/eslint.config.js, or when an Airbnb/typescript-eslint rule seems to misfire.
---

# ESLint config in this repo

Both `client/` and `backend/` pin **ESLint 8.57.1** (flat config via `typescript-eslint`) because Airbnb's config (used by the client) doesn't yet support ESLint 9's flat-config-native rule option merging. Because of that, rule options are passed **explicitly** in both configs rather than relying on that merge — don't assume upgrading ESLint alone is safe; Airbnb compat would need to catch up first.

**Backend**: `typescript-eslint` recommended + Prettier. `no-console` is an error — use `// eslint-disable-next-line no-console` where logging is unavoidable (see `index.ts`, `db/index.ts`) rather than adding a logging library speculatively.

**Client** (`client/eslint.config.js`): `eslint:recommended` + `typescript-eslint` recommended + Airbnb + Airbnb hooks (via `FlatCompat`) + `react-refresh` + Prettier. Notable overrides, all commented in place in the config file:

- `import/no-unresolved` off — `tsc -b` already validates module resolution, including TS path/subpath exports `eslint-plugin-import` can't resolve without extra resolver config.
- `import/extensions` off — same reasoning; without resolver config for the `@/*` alias, this rule would demand a file extension on every `@/...` import.
- `no-unused-expressions`, `no-unused-vars`, `no-shadow` (base rules) off, in favor of the `@typescript-eslint/*` equivalents — Airbnb's eslintrc-era config re-enables the base rules on top of typescript-eslint's recommended config (which disables them for the TS-aware versions); this restores that precedence.
- `react/react-in-jsx-scope` off, `react/jsx-filename-extension` restricted to `.tsx` — Airbnb predates React 18's automatic JSX runtime and this project's TS/TSX file layout.
- `react/require-default-props` off — deprecated pattern for function components; TS interfaces already express optionality, defaults handled via destructuring.
- `import/prefer-default-export` off.

If a rule seems to misfire on a valid pattern, check this list and the config file's inline comments before disabling it ad hoc — it's likely one of these known Airbnb/TS interactions.
