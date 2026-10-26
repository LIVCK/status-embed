import { LivckStatusElement } from './element'

export const TAG = 'livck-status'

/**
 * Register `<livck-status>` and turn every `<a data-livck-status>` into one. Safe to call (and
 * to load the script) any number of times: a page may paste the snippet once per badge.
 *
 * The link form is the one for site builders and CMS editors: an ordinary link survives every
 * editor, keeps working without JavaScript, and its `href` already names the status page.
 */
export function define(): void {
  if (typeof window === 'undefined' || !window.customElements) return
  if (!customElements.get(TAG)) customElements.define(TAG, LivckStatusElement)
  if ((window as { __livckStatusLinks?: boolean }).__livckStatusLinks) return
  ;(window as { __livckStatusLinks?: boolean }).__livckStatusLinks = true

  const scan = (root: ParentNode) => {
    root.querySelectorAll<HTMLAnchorElement>('a[data-livck-status]').forEach(upgradeLink)
  }
  const watch = () => {
    scan(document)
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches('a[data-livck-status]')) upgradeLink(node as HTMLAnchorElement)
          else if (node.firstElementChild) scan(node)
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true })
  else watch()
}

/**
 * `<a href="https://status.example.com" data-livck-status data-variant="dot">Status</a>` →
 * `<livck-status host="https://status.example.com" variant="dot">` with the original link kept
 * inside as the no-JavaScript fallback.
 */
export function upgradeLink(a: HTMLAnchorElement): void {
  if (a.closest(TAG)) return
  const el = document.createElement(TAG)
  for (const { name, value } of [...a.attributes]) {
    if (name.startsWith('data-') && name !== 'data-livck-status') el.setAttribute(name.slice(5), value)
  }
  if (!el.hasAttribute('host')) el.setAttribute('host', a.href)
  if (a.className) el.className = a.className
  if (a.id) {
    el.id = a.id
    a.removeAttribute('id')
  }
  a.replaceWith(el)
  el.append(a)
}
