import { define } from './define'

define()

export { define, TAG, upgradeLink } from './define'
export { LivckStatusElement } from './element'
export {
  ATTRIBUTES, COLOR_ATTRIBUTES, DEFAULTS, ICONS, LENGTH_ATTRIBUTES, MAX_INTERVAL, MIN_INTERVAL,
  SIZES, TEXT_ATTRIBUTES, THEMES, VARIANTS, toOrigin,
} from './config'
export type { Config, Icon, Size, Theme, Variant } from './config'
export { LOCALES, STATES, TEXTS, stateAttr, toState } from './states'
export type { Locale, State } from './states'
export type { Snapshot } from './snapshot'
export { luminance } from './theme'
