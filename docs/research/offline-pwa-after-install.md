# Full offline PWA after installation

**Ticket:** Research full offline PWA after install  
**Scope:** A production React + TypeScript single-page application (SPA) that can be installed, launched offline after its first successful installation, and performs Map CRUD without network access.  
**Date:** 2026-07-18  
**Sources:** Official Vite PWA, Workbox, and MDN documentation only.

## Recommendation

Use Vite's React TypeScript application with `vite-plugin-pwa` in its generated-service-worker (`generateSW`) mode. Precache every built, same-origin application asset plus the app shell; keep Map catalog and Map CRUD in browser-local persistence (for example, IndexedDB), never behind an API request. Register the worker explicitly through `virtual:pwa-register` and use the **prompt** update flow, not automatic reload, because an automatic reload can discard in-progress editing.

This is sufficient for Mindi's required offline path:

1. The user opens the deployed app online and installs it.
2. Installation activates a service worker whose precache contains the app shell and all Vite-emitted JS, CSS, icons, fonts, and other same-origin assets.
3. A later launch or navigation, with no network, receives cached `index.html`; the SPA receives cached hashed assets; Map CRUD reads and writes only local persistence.

The last step is a product architecture decision, not something a service worker provides: a service worker caches *application resources*, while Maps must be deliberately stored locally. Do not make core Map commands depend on a network API, background sync, or a runtime cache hit.

## Concrete baseline

Install `vite-plugin-pwa` as a development dependency. The plugin generates and injects the web manifest, generates a service worker, and can register it; it uses Workbox build tooling beneath the generated worker. [Vite PWA: Getting Started](https://vite-pwa-org.netlify.app/guide/)

Use an explicit manifest and `generateSW` configuration equivalent to:

```ts
// vite.config.ts — shape only; exact branding and icon paths are product inputs.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Mindi',
        short_name: 'Mindi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [/* same-origin, generated icon assets */],
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
})
```

`globPatterns` is an explicit coverage guard, not a substitute for inspecting the generated precache manifest at build time. Use the plugin/Workbox-generated revisions rather than hand-maintaining a manifest: Workbox specifically recommends build tools because manually recorded revisions drift from file contents. [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching/)

Place every startup-critical asset under the deployed origin and ensure it is emitted or copied into the Vite build output. This includes the manifest icons and any local fonts used before the app is interactive. A service worker needs HTTPS in production and a root-scoped worker path/scope that covers every launch URL. [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

## Registration, readiness, and updates

Register from the React entry point (or a small browser-only module):

```ts
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onOfflineReady() {
    // Tell the user “Mindi is ready to work offline.”
  },
  onNeedRefresh() {
    // Offer “Reload update” and “Later”.
    // On explicit consent, call updateSW().
  },
})
```

The plugin documents `onOfflineReady` as the place for the offline-ready UI and `onNeedRefresh` plus `updateSW()` as the user-controlled refresh flow. Its documentation warns that `autoUpdate` reloads can lose form data; Mindi's editable Nodes make that risk material, so **prompt is the required policy**. [Vite PWA: Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html), [Vite PWA: Automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update.html)

Persist each editing command before treating it as complete, and do not offer an update reload while an edit is unsaved. The app should display offline readiness only after the callback, rather than treating installation or first page load as proof that all assets are cache-resident.

## Navigation and first offline launch

Set `navigateFallback: '/index.html'` explicitly. An SPA's browser navigation is a request whose mode is `navigate`; Workbox's navigation routing exists specifically for this request class and supports allow/deny lists where an app later gains routes that must not receive the shell. [Workbox routing](https://developer.chrome.com/docs/workbox/modules/workbox-routing/)

Precache `index.html` as the fallback. Workbox precaching can match a request for `/` to a precached `/index.html` by default; an explicit fallback makes the intended SPA contract testable and resilient when routes are added. [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching/)

Do **not** add navigation preload to this baseline. It can reduce online navigation latency, but it is irrelevant to an offline cache-first shell and has limited browser support; it must not become a dependency of startup. If a later performance measurement justifies it, enable it only alongside the normal precached fallback. [Workbox navigation preload](https://developer.chrome.com/docs/workbox/modules/workbox-navigation-preload/)

## Runtime cache policy

For the initial local-only product, require **no runtime caching** for Map CRUD: no endpoint is allowed in the critical flow. Precache is the guarantee for the installed shell; runtime caching only helps resources discovered after installation and introduces a first-request-online requirement.

If the product later deliberately adds a noncritical external asset, add one narrow runtime rule with a named cache, a bounded expiry, and an intentional response policy. Do not use a broad catch-all. For example, the plugin's official CDN-font example uses `CacheFirst`, an expiration limit, and permits status `0`/`200` for Google font origins. [Vite PWA: generateSW—Cache External Resources](https://vite-pwa-org.netlify.app/workbox/generate-sw.html)

## Failure modes and acceptance checks

| Risk | Required response |
| --- | --- |
| A Vite asset, icon, font, worker, or lazy-loaded chunk is absent from precache | Treat the production build's precache manifest as an acceptance artifact; test offline after installation by opening every startup path and feature that loads a chunk. Add asset inclusion or a deliberate local copy. |
| CDN/cross-origin asset is needed before interaction | Prefer self-hosting. If unavoidable, configure an exact runtime/precache rule and CORS/crossorigin behavior; third-party requests require an origin-anchored route match, unlike same-origin requests. [Workbox routing](https://developer.chrome.com/docs/workbox/modules/workbox-routing/) |
| `/map/:id` or a future client-side route is launched offline | Verify `navigateFallback` returns the cached shell and client routing resolves it from local Map storage. Denylist only true server routes and separately supply their offline behavior. |
| First install was interrupted or the app was never successfully online | Do not promise offline launch. The worker cache is populated during installation; without a completed install/cache, there is no shell to serve. [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) |
| Development appears offline-safe but production does not | Treat `vite build` + a served production build as the canonical test. Vite PWA's development service worker is opt-in through `devOptions.enabled`; it is not production behavior. [Vite PWA: Getting Started](https://vite-pwa-org.netlify.app/guide/) |
| New deployment has a mixed old/new shell | Keep the user-confirmed prompt update path and use Workbox's generated revisions plus cache cleanup. `generateSW` enables outdated-cache cleanup by default. [Vite PWA: Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html) |
| Browser/service-worker restrictions | Deploy HTTPS, serve the worker from a path whose scope includes the app, and gracefully retain normal online operation where service workers are unavailable. [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) |

The release test should be: install from a production build while online; close it; enable browser offline mode; launch from the installed app; create, rename, edit, restructure, export, and reopen Maps; then refresh and deep-link to a Map. Repeat after deploying an update, choosing both “Later” and “Reload update.”

## Decision support

Choose **Vite React TypeScript + `vite-plugin-pwa`/Workbox `generateSW` + explicit prompt registration + precached SPA shell + local Map persistence**. It has one clear offline boundary: application resources are versioned precache entries, and Map data is local application state. Avoid runtime network dependence in core Map CRUD, auto-reload updates, and externally hosted startup-critical assets.

## Primary sources

| Source | What it establishes |
| --- | --- |
| [Vite PWA: Getting Started](https://vite-pwa-org.netlify.app/guide/) | Plugin installation, generated manifest/service worker/registration, dev service-worker opt-in. |
| [Vite PWA: Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html) | `registerSW` prompt callbacks, explicit `updateSW()`, and generated-cache cleanup. |
| [Vite PWA: Automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update.html) | Auto-update behavior and its form-data-loss risk. |
| [Vite PWA: generateSW](https://vite-pwa-org.netlify.app/workbox/generate-sw.html) | CDN cache configuration and excluded-navigation warning. |
| [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching/) | Generated/revisioned precache manifests and matching cached `index.html`. |
| [Workbox routing](https://developer.chrome.com/docs/workbox/modules/workbox-routing/) | Navigation route semantics and cross-origin route matching. |
| [Workbox navigation preload](https://developer.chrome.com/docs/workbox/modules/workbox-navigation-preload/) | Optional preload behavior and support constraints. |
| [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) | HTTPS/scope constraints and install-time cache population. |
