# @superartillery/core

Transport-independent SuperArtillery game core. Runs unchanged in Node (the server) and in the browser
(offline "on this device" play), so it must never import `ws`, `express`, `node:crypto`, `process`, or
any DOM API. Platform capabilities are injected through ports instead.

The package is type-checked with `"lib": ["ES2022"]` and `"types": []`, which makes any Node-only or
DOM-only reference a compile error.

Contents:

- `src/contract/` — generated OpenAPI types and `CONTRACT_VERSION`; the single source both the server
  and the client re-export.

Consumption:

- Server: workspace dependency resolved to `dist/` via a TypeScript project reference (`tsc --build`).
- Client: Vite and Vitest alias `@superartillery/core` to `src/index.ts` so the browser bundles core
  from source.
