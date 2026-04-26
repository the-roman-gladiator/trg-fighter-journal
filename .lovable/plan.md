## Goal
Make TRG Fighter Journal installable to the home screen on iPhone and Android as **Combat Athlete Journal**, opening in standalone mode at the production domain — without touching design, routing, auth, Supabase, or any feature code.

## Approach: Manifest-only (no service worker)
Per Lovable's PWA guidance, **service workers cause stale builds and break navigation inside the editor preview iframe**. Since you only need installability (not offline support), the recommended approach is:

- ✅ Web app manifest + icons + iOS meta tags
- ❌ No `vite-plugin-pwa`, no `workbox`, no service worker

This gives you a real installable app (standalone, home-screen icon, splash) on both platforms, with **zero risk** to the existing app, preview, or auth flow.

---

## Files to create

### 1. `public/manifest.webmanifest`
The web app manifest. Key fields:
- `name`: `Combat Athlete Journal`
- `short_name`: `Athlete Journal`
- `start_url`: `/` (relative — opens whichever domain installed it, including the production domain `trg-fighter-journal.lovable.app` or future custom domain)
- `scope`: `/`
- `display`: `standalone`
- `orientation`: `portrait`
- `background_color`: `#0B0B0B` (matches your dark theme bg)
- `theme_color`: `#B11226` (your TRG primary red)
- `icons`: references to the icons below (192, 512, plus a 512 maskable)

### 2. App icons in `public/`
Generated from the existing favicon / TRG branding:
- `public/icon-192.png` (192×192, standard)
- `public/icon-512.png` (512×512, standard)
- `public/icon-maskable-512.png` (512×512, with safe-zone padding for Android adaptive icons)
- `public/apple-touch-icon.png` (180×180, required for iOS home-screen icon and splash)

These will be generated programmatically from a TRG-branded source so the home-screen icon matches your design (dark bg + red accent). If you'd prefer to upload your own logo, say the word and I'll use that instead.

### 3. iOS splash screens (optional but recommended)
A small set of `apple-touch-startup-image` PNGs in `public/splash/` for the most common iPhone sizes (e.g. iPhone 14/15/Pro/Pro Max, SE). iOS does not generate splashes from the manifest — they must be explicit `<link>` tags. Background `#0B0B0B` with the TRG mark centered.

If you prefer to skip splashes initially, iOS will fall back to a plain white screen briefly — installability still works.

---

## Files to modify

### `index.html` (only additions — no removals)
Add inside `<head>`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#B11226">`
- `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Athlete Journal">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- The `apple-touch-startup-image` `<link>` tags for the splash screens

The existing `<title>`, description, OG tags, favicon, and root div are left untouched.

### Nothing else changes
- ❌ No edits to `vite.config.ts`
- ❌ No new dependencies
- ❌ No edits to `src/main.tsx`, `App.tsx`, routes, hooks, Supabase client, or any component
- ❌ No service worker registration anywhere

---

## What this delivers

| Capability | iPhone (Safari) | Android (Chrome) |
|---|---|---|
| Add to Home Screen | ✅ Share → Add to Home Screen | ✅ Auto install banner / menu → Install app |
| Custom app name "Athlete Journal" | ✅ | ✅ |
| Standalone (no browser chrome) | ✅ | ✅ |
| Themed status bar / address bar | ✅ (translucent) | ✅ (`#B11226`) |
| Home-screen icon | ✅ apple-touch-icon | ✅ adaptive maskable icon |
| Splash screen | ✅ (via startup-image links) | ✅ (auto from manifest) |
| Opens production domain | ✅ Whatever URL was used to install (e.g. `trg-fighter-journal.lovable.app`) |

## What this does NOT do
- No offline mode (would need a service worker — explicitly avoided per Lovable guidance)
- No push notifications via service worker (your existing `useBrowserNotifications` hook continues to work as-is in the browser)
- No effect on Lovable's editor preview (because no SW is registered)

---

## How to test after deploy

**Important:** Installability only works on the **published** URL (`https://trg-fighter-journal.lovable.app`) over HTTPS — not in the in-editor preview iframe. After I push the changes you'll need to click **Publish → Update** to make them live.

### iPhone (iOS 16+, Safari)
1. Open `https://trg-fighter-journal.lovable.app` in **Safari** (not Chrome — iOS install only works from Safari).
2. Tap the **Share** button (square with arrow).
3. Scroll down → **Add to Home Screen**.
4. Confirm the title shows as **Athlete Journal** → tap **Add**.
5. Tap the new icon on the home screen — app opens fullscreen with no Safari UI.

### Android (Chrome)
1. Open `https://trg-fighter-journal.lovable.app` in **Chrome**.
2. Either tap the **Install** banner that appears, or open the **⋮ menu → Install app** (or "Add to Home Screen").
3. Confirm name **Combat Athlete Journal** → **Install**.
4. Launch from home screen — opens standalone with red themed status bar and a splash screen.

### Verifying it's a proper PWA (desktop Chrome)
1. Open the published URL in Chrome desktop.
2. DevTools → **Application** tab → **Manifest** — should show name, icons, theme color, no errors.
3. Address bar shows an **install icon** (⊕) on the right — click to install.

---

## Risk assessment
- **Auth / Supabase**: Untouched. No service worker means no request interception, so OAuth redirects and Supabase API calls behave identically to today.
- **Routing**: Untouched. React Router continues to work; Lovable hosting's SPA fallback handles deep links as it does now.
- **Existing pages / design**: Zero modifications to any `src/` file.
- **Editor preview**: No change — manifest links are inert in the preview iframe.

After approval I'll create the manifest, generate the icon set, add the meta tags to `index.html`, and confirm everything renders in DevTools before handing off.