/**
 * Every colour is a custom property with a default, so a site can restyle the embed from its
 * own CSS (`livck-status { --livck-operational: #0a0 }`) and the attributes can set the same
 * properties inline. Defaults are the status page's own colours, each at least 4.5:1 against
 * the default background of its theme (test/contrast.test.ts).
 *
 * Heights, line height and dot size are whole pixels of the same parity per size, so the dot
 * and the text centre exactly instead of rounding differently per variant, and a badge never
 * changes height between loading and loaded or between fonts. Measured across system-ui,
 * Arial, Georgia and a monospace font, the dot then sits within 1px of the optical centre
 * (between cap height and x-height); any fixed nudge made the worst font worse.
 */
export const CSS = `
:host{display:inline-block;vertical-align:middle;max-width:100%;line-height:1.2}
:host([hidden]){display:none}
*{box-sizing:border-box}
.w{
--_operational:var(--livck-operational,#008649);--_degraded:var(--livck-degraded,#9c6600);
--_partial-outage:var(--livck-partial-outage,#b84d00);--_major-outage:var(--livck-major-outage,#c50220);
--_maintenance:var(--livck-maintenance,#4158bd);--_unknown:var(--livck-unknown,#71717a);
--_neutral:var(--livck-neutral,#155dfc);
--_bg:var(--livck-bg,#fff);--_fg:var(--livck-fg,#18181b);--_bd:var(--livck-border-color,#e4e4e7);--_mut:var(--livck-muted,#71717a);
--_shadow:0 1px 2px rgb(24 24 27/.06);
--_c:var(--_unknown);
position:relative;display:flex;align-items:center;max-width:100%;
font:inherit;font-size:var(--_fs,1em);color:var(--_fg);-webkit-font-smoothing:antialiased
}
.w.dark{
--_operational:var(--livck-operational-dark,#00e59d);--_degraded:var(--livck-degraded-dark,#ffc31a);
--_partial-outage:var(--livck-partial-outage-dark,#f98f3a);--_major-outage:var(--livck-major-outage-dark,#ed4042);
--_maintenance:var(--livck-maintenance-dark,#6e89e4);--_unknown:var(--livck-unknown-dark,#a1a1aa);
--_neutral:var(--livck-neutral-dark,#3a79ff);
--_bg:var(--livck-bg-dark,#18181b);--_fg:var(--livck-fg-dark,#fafafa);--_bd:var(--livck-border-color-dark,#3f3f46);--_mut:var(--livck-muted-dark,#a1a1aa);
--_shadow:0 1px 2px rgb(0 0 0/.3)
}
.w[data-state=operational]{--_c:var(--_operational)}
.w[data-state=degraded]{--_c:var(--_degraded)}
.w[data-state=partial_outage]{--_c:var(--_partial-outage)}
.w[data-state=major_outage]{--_c:var(--_major-outage)}
.w[data-state=maintenance]{--_c:var(--_maintenance)}
.w.neutral{--_c:var(--_neutral)}
.w.system{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.sm{--_fs:12px;--_lh:16px;--_h:24px;--_hb:30px;--_d:6px;--_dot:8px}
.md{--_fs:14px;--_lh:18px;--_h:28px;--_hb:36px;--_d:8px;--_dot:10px}
.lg{--_fs:16px;--_lh:20px;--_h:34px;--_hb:42px;--_d:10px;--_dot:12px}
a{color:inherit;text-decoration:none}
.main{display:inline-flex;align-items:center;gap:.5em;min-width:0;height:100%;border-radius:inherit;outline:none}
.main::after{content:"";position:absolute;inset:0;border-radius:inherit}
.main:focus-visible::after{outline:2px solid var(--_c);outline-offset:2px}

.ind{position:relative;flex:none;width:var(--_d);height:var(--_d);border-radius:50%;background:var(--_c);
box-shadow:0 0 0 calc(var(--_d) / 3) color-mix(in srgb,var(--_c) 18%,transparent)}
.pulse .ind::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--_c);animation:pulse 2.4s cubic-bezier(0,0,.2,1) infinite}
.pulse[data-state=major_outage] .ind::after,.pulse[data-state=partial_outage] .ind::after{animation-duration:1.5s}
.pending .ind::after,.w[data-state=unknown] .ind::after{animation:none}
@keyframes pulse{0%{transform:scale(1);opacity:.45}70%,100%{transform:scale(2.4);opacity:0}}

.livi{flex:none;width:calc(var(--_lh) + 2px);height:calc(var(--_lh) + 2px);overflow:visible;fill:var(--_c);stroke:var(--_c)}
.livi .lamp,.livi .halo,.livi .eyes{stroke:none}
.livi .eyes{fill:#0f192a}
.livi .halo{fill:color-mix(in srgb,var(--_c) 22%,transparent);transform-box:fill-box;transform-origin:center}
.pulse .livi .halo{animation:halo 2.4s ease-in-out infinite}
.pending .livi .halo,.w[data-state=unknown] .livi .halo{animation:none}
@keyframes halo{0%,100%{transform:scale(.8);opacity:.6}50%{transform:scale(1.15);opacity:1}}

.txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:var(--_lh,inherit)}
.arrow{flex:none;width:1em;height:1em;margin-right:-.15em;color:var(--_mut);transition:transform .15s,color .15s}
.main:hover .arrow{color:var(--_fg);transform:translate(1px,-1px)}
.pw{position:relative;z-index:1;display:inline-flex;align-items:center;color:var(--_mut);font-size:.82em;font-weight:400;white-space:nowrap}
.pw a:hover{color:var(--_fg);text-decoration:underline;text-underline-offset:.2em}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

.v-badge,.v-button{background:var(--_bg);border:var(--livck-border-width,1px) solid var(--_bd);box-shadow:var(--_shadow);font-weight:500;transition:border-color .15s,background-color .15s}
.v-badge{height:var(--_h);padding:0 .85em 0 .75em;border-radius:var(--livck-radius,999px)}
.v-button{height:var(--_hb);padding:0 .9em;border-radius:var(--livck-radius,8px)}
.v-badge:hover,.v-button:hover{border-color:color-mix(in srgb,var(--_c) 40%,var(--_bd))}
.v-button:hover{background:color-mix(in srgb,var(--_fg) 3%,var(--_bg))}
.v-badge .pw,.v-button .pw{gap:.6em;margin-left:.6em}
.v-badge .pw::before,.v-button .pw::before{content:"";width:1px;height:1.1em;background:var(--_bd)}
.v-inline{--_fs:1em;--_lh:inherit;color:var(--livck-fg,inherit)}
.v-inline.dark{color:var(--livck-fg-dark,var(--livck-fg,inherit))}
.v-inline.ink{color:var(--_fg)}
.v-inline .ind{--_d:.55em}
.v-inline .livi{width:1.25em;height:1.25em}
.v-inline .main:hover .txt{text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px}
.v-inline .pw::before{content:"·";margin:0 .45em}
.v-dot .ind{width:var(--_dot);height:var(--_dot);transform:none}
.v-dot .livi{width:calc(var(--_dot) * 2);height:calc(var(--_dot) * 2);transform:none}
@media (prefers-reduced-motion:reduce){.w *,.w *::after{animation:none!important;transition:none!important}}
`
