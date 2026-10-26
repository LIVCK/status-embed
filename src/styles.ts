import { LIVI_CSS } from './livi'

/**
 * Every colour is a custom property with a default, so a site can restyle the embed from its
 * own CSS (`livck-status { --livck-operational: #0a0 }`) and the attributes can set the same
 * properties inline. Defaults are the status page's own colours, each at least 4.5:1 against
 * the default background of its theme.
 */
export const CSS = `
:host{display:inline-block;vertical-align:middle;max-width:100%;line-height:1.25}
:host([hidden]){display:none}
*{box-sizing:border-box}
.w{
--_operational:var(--livck-operational,#008649);--_degraded:var(--livck-degraded,#9c6600);
--_partial-outage:var(--livck-partial-outage,#b84d00);--_major-outage:var(--livck-major-outage,#c50220);
--_maintenance:var(--livck-maintenance,#4158bd);--_unknown:var(--livck-unknown,#71717a);
--_neutral:var(--livck-neutral,#155dfc);
--_bg:var(--livck-bg,#fff);--_fg:var(--livck-fg,#18181b);--_bd:var(--livck-border-color,#e4e4e7);--_mut:var(--livck-muted,#71717a);
--_c:var(--_unknown);
position:relative;display:inline-flex;align-items:center;gap:.5em;max-width:100%;
font:inherit;font-size:var(--_fs,1em);color:var(--_fg);-webkit-font-smoothing:antialiased
}
.w.dark{
--_operational:var(--livck-operational-dark,#00e59d);--_degraded:var(--livck-degraded-dark,#ffc31a);
--_partial-outage:var(--livck-partial-outage-dark,#f98f3a);--_major-outage:var(--livck-major-outage-dark,#ed4042);
--_maintenance:var(--livck-maintenance-dark,#6e89e4);--_unknown:var(--livck-unknown-dark,#a1a1aa);
--_neutral:var(--livck-neutral-dark,#3a79ff);
--_bg:var(--livck-bg-dark,#18181b);--_fg:var(--livck-fg-dark,#fafafa);--_bd:var(--livck-border-color-dark,#3f3f46);--_mut:var(--livck-muted-dark,#a1a1aa)
}
.w[data-state=operational]{--_c:var(--_operational)}
.w[data-state=degraded]{--_c:var(--_degraded)}
.w[data-state=partial_outage]{--_c:var(--_partial-outage)}
.w[data-state=major_outage]{--_c:var(--_major-outage)}
.w[data-state=maintenance]{--_c:var(--_maintenance)}
.w.neutral{--_c:var(--_neutral)}
.w.system{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.sm{--_fs:12px;--_dot:8px}.md{--_fs:14px;--_dot:10px}.lg{--_fs:16px;--_dot:12px}
a{color:inherit;text-decoration:none}
.main{display:inline-flex;align-items:center;gap:inherit;min-width:0;border-radius:inherit;outline:none}
.main::after{content:"";position:absolute;inset:0;border-radius:inherit}
.main:focus-visible::after{outline:2px solid var(--_c);outline-offset:2px}
.ind{position:relative;flex:none;width:.62em;height:.62em;border-radius:50%;background:var(--_c)}
.pulse .ind::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--_c);animation:pulse 2.2s cubic-bezier(0,0,.2,1) infinite}
.pulse[data-state=major_outage] .ind::after,.pulse[data-state=partial_outage] .ind::after{animation-duration:1.4s}
.pending .ind::after,.w[data-state=unknown] .ind::after{animation:none}
@keyframes pulse{0%{transform:scale(1);opacity:.5}75%,100%{transform:scale(2.6);opacity:0}}
.livi-icon{flex:none;width:1.3em;height:1.3em;overflow:visible}
.livi-icon .lamp{fill:var(--_c);stroke:var(--_c);transform-box:fill-box;transform-origin:center}
.pulse .livi-icon .lamp{animation:lamp 2.2s ease-in-out infinite}
.pending .livi-icon .lamp,.w[data-state=unknown] .livi-icon .lamp{animation:none}
@keyframes lamp{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
.txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy{display:flex;flex-direction:column;min-width:0}
.sub{color:var(--_mut);font-size:.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub:empty{display:none}
.pw{position:relative;z-index:1;color:var(--_mut);font-size:.82em;white-space:nowrap}
.pw a:hover{text-decoration:underline}
.arrow{color:var(--_mut);transition:transform .15s}
.main:hover .arrow{transform:translateX(2px)}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.v-badge,.v-button,.v-livi{background:var(--_bg);border:var(--livck-border-width,1px) solid var(--_bd);transition:border-color .15s}
.v-badge{padding:.32em .8em;border-radius:var(--livck-radius,999px)}
.v-button{padding:.6em 1em;border-radius:var(--livck-radius,8px);font-weight:500;box-shadow:0 1px 2px rgb(0 0 0/.06)}
.v-livi{padding:.6em 1.2em .6em .6em;gap:.75em;border-radius:var(--livck-radius,14px)}
.v-livi .txt{font-weight:600}
.v-badge:hover,.v-button:hover,.v-livi:hover{border-color:color-mix(in srgb,var(--_c) 45%,var(--_bd))}
.v-inline{gap:.4em;--_fs:1em}
.v-dot .ind{width:var(--_dot);height:var(--_dot)}
.v-dot .livi-icon{width:calc(var(--_dot) * 2);height:calc(var(--_dot) * 2)}
@media (prefers-reduced-motion:reduce){.w *,.w *::after{animation:none!important;transition:none!important}}
${LIVI_CSS}`
