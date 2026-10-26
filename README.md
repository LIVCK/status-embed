# status-embed

Show the live status of a [LIVCK](https://livck.cloud) status page on any website: a badge in the footer, a dot next to your "Status" link, a button in your help center.

- **Easy to embed.** A normal link plus one script tag. Works wherever you can paste HTML, and in React, Vue and other frameworks as an element.
- **Looks right on your site.** Light or dark is decided by the background the badge actually sits on, and follows your theme switch. Colours, texts, radius and more can be set per attribute or from your CSS.
- **Small and quiet.** About 7.5 KB gzipped, no dependencies, no cookies, no tracking. One request per status page, however many badges you show. Polling pauses in background tabs, and a badge far down the page fetches nothing until the visitor scrolls close.
- **Honest.** If the status cannot be loaded, the badge stays a plain "Status" link. It never shows a state it does not know.

Build your badge with the visual builder at **[livck.cloud/badge-builder](https://livck.cloud/badge-builder)** and copy the snippet. Everything below is for reference.

## Quick start

```html
<a href="https://status.example.com" data-livck-status>Status</a>
<script src="https://assets.livck.cloud/badge/v1/embed.js" defer></script>
```

Replace `status.example.com` with the address of your status page (`yourname.statuspage.de` or your own domain). The link is turned into a live badge. Without JavaScript it stays a normal link.

Options go on the link as `data-*` attributes:

```html
<a href="https://status.example.com" data-livck-status data-variant="dot" data-theme="dark">Status</a>
```

The script can be included once per page or once per badge, both work. Only **public** status pages can be embedded.

## As an element

For frameworks and hand-written HTML there is the element itself. The same options are plain attributes:

```html
<script src="https://assets.livck.cloud/badge/v1/embed.js" defer></script>

<livck-status host="status.example.com" variant="button">
  <a href="https://status.example.com">Status</a>
</livck-status>
```

The link inside is shown only if the script does not run.

### npm

```sh
npm install @livck/status-embed
```

```js
import '@livck/status-embed'
```

Importing registers `<livck-status>`. Use it in React (19+), Vue, Svelte, Angular like any HTML element. In Vue, tell the compiler it is a custom element: `compilerOptions.isCustomElement = tag => tag === 'livck-status'`.

## Options

| Attribute | Values | Default | |
|---|---|---|---|
| `host` | domain or URL | from the link's `href` | The status page. https only. |
| `variant` | `badge`, `dot`, `inline`, `button`, `livi` | `badge` | `inline` sits in running text and takes its font size. `livi` is a card with LIVI, our status mascot. |
| `component` | component id | | Show one component instead of the whole page. Ids are listed in the page's `/status.json`. |
| `theme` | `auto`, `light`, `dark` | `auto` | See [Light and dark](#light-and-dark). |
| `size` | `sm`, `md`, `lg` | `md` | |
| `icon` | `dot`, `livi`, `none` | `dot` | `livi` shows LIVI as a small icon with the status in her lamp. |
| `locale` | `de`, `en` | visitor's language | Language of the built-in texts. |
| `label` | text | `%status%` | `%status%` is the status text, `%name%` the component or page name. Example: `API: %status%`. |
| `text-operational` … | text | | Your own wording for one state. States: `operational`, `degraded`, `partial-outage`, `major-outage`, `maintenance`, `unknown`. Per language: `text-operational-en`. |
| `neutral` | flag | off | Always the neutral colour and "Status", no traffic light. |
| `pulse` | `true`, `false` | `true` | Soft pulse on the dot. Always off for visitors who prefer reduced motion. |
| `target` | `_blank`, `_self` | `_blank` | Where the link opens. |
| `font` | `inherit`, `system` | `inherit` | `inherit` uses your site's font. |
| `interval` | seconds | `60` | Refresh interval, 30 to 3600. |
| `powered-by` | flag | off | A small "statuspage.de" link next to the badge. |
| `radius` | length | per variant | A bare number is px. |
| `border-width` | length | `1px` | |

### Colours

Every colour has a light value and a `-dark` value used when the badge renders dark:

`color-operational`, `color-degraded`, `color-partial-outage`, `color-major-outage`, `color-maintenance`, `color-unknown`, `color-neutral`, `bg`, `fg`, `border-color`, `muted`, each also as `…-dark`.

```html
<a href="https://status.example.com" data-livck-status
   data-color-operational="#0e9f6e" data-color-operational-dark="#31c48d"
   data-bg="#f9fafb" data-bg-dark="#111827" data-radius="6">Status</a>
```

The defaults are the colours of the status page itself, each with at least 4.5:1 contrast on the default background.

### From your CSS

The same values are custom properties, so you can also style from your stylesheet. Attributes win over CSS.

```css
livck-status {
  --livck-operational: #0e9f6e;
  --livck-operational-dark: #31c48d;
  --livck-radius: 6px;
}
```

For anything else the parts `base`, `link`, `indicator`, `label` and `powered-by` are exposed:

```css
livck-status::part(label) { font-weight: 600; letter-spacing: .01em; }
```

## Light and dark

With `theme="auto"` the badge looks at what is painted behind it and picks light or dark to match. That works whether your site has no dark mode, follows the operating system, or has its own switch (a `dark` class or `data-theme` on `<html>` or `<body>`, which the badge watches). Only if nothing behind it has a background colour does it fall back to the page's `color-scheme`. Set `theme="light"` or `theme="dark"` to decide yourself.

## Content Security Policy

The badge needs no inline script and no inline style. If your site sends a CSP, allow:

```
script-src  https://assets.livck.cloud
connect-src https://status.example.com
```

`connect-src` is the address of your status page. If you host the script yourself, `script-src` is your own origin.

## Privacy

The badge sets no cookies, stores nothing in the browser and sends no referrer. Each visitor's browser loads the script from `assets.livck.cloud` (unless you host it yourself) and the status from your status page, which means both see the visitor's IP address like any web request. Mention this in your privacy policy.

## Self-hosting

Copy `dist/embed.js` from the npm package to your server and point the script tag at it. Then only the status request leaves your site. The file at `https://assets.livck.cloud/badge/v1/embed.js` always carries the latest 1.x release. Fixed versions live at `https://assets.livck.cloud/badge/<version>/embed.js` and never change, so they can be pinned with Subresource Integrity.

## Browser support

Current Chrome, Edge, Firefox and Safari (Safari 16.4 and later).

## Development

```sh
npm ci
npm test            # unit tests
npm run build
npm run size        # size budget of dist/embed.js
npm run test:e2e    # Chromium, Firefox and WebKit against a real cross-origin status endpoint
```

## License

MIT
