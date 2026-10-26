import type { State } from './states'

/**
 * LIVI, the LIVCK character. Two forms, because the drawn face is only legible from 88px up:
 *
 * - `LIVI_ICON`: the 24px line icon (lamp, antenna, body). Used in place of the dot; the lamp
 *   carries the status colour, the strokes follow the text colour.
 * - `liviFigure()`: the full figure for the `livi` card, same construction and faces as on
 *   the status page. Body colours are LIVI's own palette, not the UI status colours: they are
 *   brand colours and stay the same in light and dark.
 *
 * All markup here is static; no status page data is ever written into it.
 */

export const LIVI_ICON = '<svg class="livi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + '<path d="M12 10c0-3 1-4.5 2.4-5.4"/><path d="M5 16a7 6 0 0 1 14 0c0 3-3 4-7 4s-7-1-7-4Z"/>'
  + '<circle class="lamp" cx="15.5" cy="4.5" r="2"/></svg>'

type Tone = 'operational' | 'degraded' | 'partial' | 'major' | 'maintenance' | 'unknown'
type Pose = 'idle' | 'alert' | 'scan'

const TONE: Record<State, Tone> = {
  operational: 'operational',
  degraded: 'degraded',
  partial_outage: 'partial',
  major_outage: 'major',
  maintenance: 'maintenance',
  unknown: 'unknown',
}

const POSE: Record<Tone, Pose> = {
  operational: 'idle',
  degraded: 'alert',
  partial: 'alert',
  major: 'idle',
  maintenance: 'scan',
  unknown: 'idle',
}

const eye = (cx: number, cy: number, rx: number, ry: number, wink = '') =>
  `<g class="wink${wink}"><g class="blink"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--detail)"/></g></g>`
const line = (x1: number, y1: number, x2: number, y2: number, w: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--detail)" stroke-width="${w}" stroke-linecap="round"/>`

const FACE: Record<Tone, string> = {
  operational: `<g class="eyes">${eye(128, 150, 8, 10.5, ' wink-l')}${eye(172, 150, 8, 10.5, ' wink-r')}</g>`
    + '<path fill="var(--detail)" d="M141,174 q9,8 18,0 q-9,4 -18,0 Z"/>',
  degraded: '<g class="eyes"><ellipse cx="128" cy="146" rx="9.6" ry="12" fill="var(--detail)"/><ellipse cx="172" cy="146" rx="9.6" ry="12" fill="var(--detail)"/></g>'
    + '<ellipse cx="150" cy="176" rx="7.5" ry="6" fill="var(--detail)"/>',
  maintenance: `<g class="eyes">${eye(128, 149, 9, 9.4)}${eye(172, 149, 9, 9.4)}</g>`
    + '<ellipse cx="150" cy="177" rx="6.4" ry="5.6" fill="var(--detail)"/>',
  partial: '',
  major: '',
  unknown: `<g class="eyes">${line(119, 150, 137, 150, 7.5)}${line(163, 150, 181, 150, 7.5)}</g>${line(141, 176, 159, 176, 6.5)}`,
}
FACE.partial = FACE.major = `<g class="eyes">${line(117, 156, 139, 144, 8.5)}${line(183, 156, 161, 144, 8.5)}</g>`
  + '<ellipse cx="150" cy="180" rx="9" ry="7" fill="var(--detail)"/>'

export function liviFigure(state: State): string {
  const tone = TONE[state]
  return `<svg class="livi st-${tone} pose-${POSE[tone]}" viewBox="0 0 300 250" aria-hidden="true" focusable="false">`
    + '<g class="fig">'
    + '<g class="l-ant"><path fill="none" stroke="var(--body)" stroke-width="7" stroke-linecap="round" d="M150,110 C150,80 156,64 166,50"/>'
    + '<circle class="l-halo" cx="168" cy="44" r="21" fill="var(--body)" opacity=".18"/>'
    + '<g class="l-lamp"><circle cx="168" cy="44" r="11.5" fill="var(--body)"/><circle cx="165.5" cy="41" r="4" fill="#fff" opacity=".45"/></g></g>'
    + '<rect x="128" y="196" width="14" height="32" rx="7" fill="var(--body)"/>'
    + '<rect x="158" y="196" width="14" height="32" rx="7" fill="var(--body)"/>'
    + '<rect x="80" y="158" width="12" height="32" rx="6" fill="var(--body)"/>'
    + '<rect class="l-arm-r" x="208" y="158" width="12" height="32" rx="6" fill="var(--body)"/>'
    + '<g class="l-body"><path fill="var(--body)" d="M150,96 C193,96 214,128 214,164 C214,192 187,206 150,206 C113,206 86,192 86,164 C86,128 107,96 150,96 Z"/>'
    + FACE[tone]
    + '</g></g></svg>'
}

/** LIVI's palette. Theme-invariant on purpose (see above). */
export const LIVI_CSS = `
.livi{width:88px;height:73px;flex:none;overflow:visible;--detail:#0f192a}
.livi.st-operational{--body:#00e091}.livi.st-degraded{--body:#ffc53d}.livi.st-partial{--body:#ff9040}
.livi.st-major{--body:#ff5c5c}.livi.st-maintenance{--body:#5b9bff}.livi.st-unknown{--body:#8a9ab0}
.fig,.l-ant{transform-box:view-box}.fig{transform-origin:150px 228px}.l-ant{transform-origin:150px 110px}
.eyes{transform-box:view-box;transform-origin:150px 150px}
.l-body{transform-box:fill-box;transform-origin:center bottom}
.l-lamp,.l-halo,.wink,.blink,.l-arm-r{transform-box:fill-box;transform-origin:center}
.l-arm-r{transform-origin:top center}
.blink{animation:lv-blink 5.2s infinite}
@keyframes lv-blink{0%,95.5%,100%{transform:scaleY(1)}97.4%{transform:scaleY(.08)}}
.l-lamp{animation:lv-lamp 2.4s ease-in-out infinite}
@keyframes lv-lamp{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.13);opacity:.86}}
.l-halo{animation:lv-halo 2.4s ease-in-out infinite}
@keyframes lv-halo{0%,100%{transform:scale(1);opacity:.14}50%{transform:scale(1.5);opacity:.32}}
@keyframes lv-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,.985)}}
.pose-idle .l-body{animation:lv-breathe 3.6s ease-in-out infinite}
.pose-idle .l-ant{animation:lv-sway 3.6s ease-in-out infinite}
@keyframes lv-sway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}
.pose-alert .l-body{animation:lv-breathe 1.7s ease-in-out infinite}
.pose-alert .l-ant{animation:lv-alert .62s ease-out infinite}
@keyframes lv-alert{0%,100%{transform:rotate(-2deg)}28%{transform:rotate(-11deg)}60%{transform:rotate(5deg)}}
.pose-scan .l-body{animation:lv-breathe 3.4s ease-in-out infinite}
.pose-scan .l-ant{animation:lv-scan 3.4s ease-in-out infinite}
@keyframes lv-scan{0%,100%{transform:rotate(-17deg)}50%{transform:rotate(17deg)}}
.pose-scan .eyes{animation:lv-look 3.4s cubic-bezier(.7,0,.2,1) infinite}
@keyframes lv-look{0%,18%{transform:translateX(-9px)}24%,44%{transform:translateX(9px)}50%,58%{transform:translateX(0)}64%,100%{transform:translateX(-9px)}}
.st-major .l-ant{animation:lv-droop 2.1s ease-in-out infinite}
@keyframes lv-droop{0%,100%{transform:rotate(38deg)}50%{transform:rotate(44deg)}}
.st-degraded .l-lamp,.st-partial .l-lamp{animation-duration:1.1s}
.st-major .l-lamp{animation-duration:1.4s}
.st-unknown .l-lamp{animation:none;opacity:.55}.st-unknown .l-halo{animation:none;opacity:.07}
.st-operational .fig{animation:lv-hop 16s ease-in-out infinite}
.st-operational .l-arm-r{animation:lv-wave 16s ease-in-out infinite}
.st-operational .wink-r{animation:lv-wink 16s ease-in-out infinite}
@keyframes lv-wave{0%,3%{transform:rotate(0)}5.5%{transform:rotate(-142deg)}7.5%{transform:rotate(-112deg)}9.5%{transform:rotate(-146deg)}11.5%{transform:rotate(-115deg)}13.5%{transform:rotate(-140deg)}17%,100%{transform:rotate(0)}}
@keyframes lv-hop{0%,30%{transform:translateY(0)}32%{transform:translateY(-17px)}34.5%{transform:translateY(0)}36%{transform:translateY(-7px)}38%,100%{transform:translateY(0)}}
@keyframes lv-wink{0%,48%{transform:scaleY(1)}49.6%,52%{transform:scaleY(.08)}53.6%,100%{transform:scaleY(1)}}
`
