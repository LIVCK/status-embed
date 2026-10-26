/**
 * LIVI, the LIVCK character, as a small icon in place of the dot: lamp, antenna and body, all
 * in the status colour like the figure on the status page. At 16 to 24px a line drawing with
 * only a coloured lamp did not carry the status; the coloured body does.
 * Static markup; no status page data is ever written into it.
 */
export const LIVI_ICON = '<svg class="livi" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
  + '<circle class="halo" cx="15.5" cy="4.5" r="4.4"/>'
  + '<path d="M12 10.5c0-3 1-4.6 2.4-5.5" fill="none" stroke-width="2" stroke-linecap="round"/>'
  + '<path d="M4.6 16.2c0-4 3.3-6.4 7.4-6.4s7.4 2.4 7.4 6.4c0 2.9-3.1 4.1-7.4 4.1s-7.4-1.2-7.4-4.1Z"/>'
  + '<circle class="lamp" cx="15.5" cy="4.5" r="2.4"/>'
  + '<g class="eyes"><ellipse cx="9.6" cy="15" rx="1.05" ry="1.35"/><ellipse cx="14.4" cy="15" rx="1.05" ry="1.35"/></g></svg>'
