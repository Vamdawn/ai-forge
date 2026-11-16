export const CSS = `
.dwt-root { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
/* All groupings use this toolbar. The native component still owns its list. */
.dwt-native-host { display: flex; flex: 1; min-height: 0; min-width: 0; }
.dwt-native-host > [data-slot='sidebar-plus.nativeWorkspaces'] > div { flex: 1; min-width: 0; }
.dwt-native-host > [data-slot='sidebar-plus.nativeWorkspaces'] > div > [data-sidebar-workspace-header],
.dwt-native-host > [data-slot='sidebar-plus.nativeWorkspaces'] > div:not(:has(> [data-sidebar-workspace-header])) > div:first-child { display: none; }
.dwt-head { flex: none; display: flex; align-items: center; gap: 4px; height: 36px; margin-bottom: 6px; padding-left: 4px; box-sizing: border-box; color: var(--dsw-alias-label-tertiary); }
.dwt-current-group { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
/* Grouping shortcuts use the host's label and selected-state colors. */
.dwt-tabs { min-width: 0; display: flex; gap: clamp(8px, 7%, 24px); align-self: stretch; }
.dwt-tab { min-width: 0; position: relative; display: inline-flex; align-items: center; appearance: none; border: 0; background: none; color: inherit; font: inherit; font-size: 13px; line-height: 16px; font-weight: 500; padding: 0; cursor: pointer; }
.dwt-tab-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-tab::after { content: ''; position: absolute; right: 0; bottom: 0; left: 0; height: 2px; border-radius: 2px; background: transparent; }
.dwt-tab:hover { color: var(--dsw-alias-label-primary); }
.dwt-tab[data-active='true'] { color: var(--dsw-alias-state-business-primary); }
.dwt-tab[data-active='true']::after { background: var(--dsw-alias-state-business-primary); }
.dwt-tab:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.dwt-badge { position: absolute; top: 6px; right: -8px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); }
.dwt-head[data-search='true'] > :is(.dwt-tabs, .dwt-current-group) { display: none; }
/* The search control takes the label's room while it is closed, then grows into
   the shipped header's search pill: a smaller magnifier, the field, and its own
   clear button inside one 30px bordered capsule, which is what keeps the field
   off the tabs' edge. */
.dwt-searchslot { flex: 1; flex-shrink: 0; flex-basis: 28px; max-width: 28px; min-width: 0; display: flex; align-items: center; margin-left: auto; transition: max-width 180ms var(--ds-ease-in-out); }
.dwt-searchslot-open { flex-shrink: 1; flex-basis: auto; max-width: 100%; height: 30px; padding: 0 4px; box-sizing: border-box; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-caption); }
/* The trigger's cell fills the capsule while the field is open, and stops
   behaving like a button: the field beside it is the interaction. */
.dwt-searchslot-open .dwt-iconbutton { height: 30px; border-radius: 0; }
.dwt-searchslot-open .dwt-iconbutton:hover { background: transparent; }
.dwt-searchclear { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 2px; appearance: none; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dwt-searchclear:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-searchclear:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.dwt-iconbutton { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: var(--dsw-radius-sm); padding: 0; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dwt-iconbutton:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-iconbutton:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.dwt-search { flex: 1; width: 0; min-width: 0; border: 0; outline: none; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 18px; }
.dwt-search::placeholder { color: var(--dsw-alias-label-tertiary); }
/* While the search is open its own clear button travels inside the capsule, so
   the add affordance collapses and frees the room the field grows into. */
.dwt-headactions { flex: none; display: flex; align-items: center; gap: 4px; max-width: 64px; opacity: 1; overflow: hidden; transition: max-width 180ms var(--ds-ease-in-out), opacity 120ms var(--ds-ease-in-out); }
.dwt-headactions-hidden { max-width: 0; opacity: 0; visibility: hidden; pointer-events: none; }
.dwt-shortcut-settings { margin: 0; padding: 0; border: 0; color: var(--dsw-alias-label-primary); font: var(--dsw-font-s-14); }
.dwt-shortcut-settings legend { margin-bottom: 12px; font: var(--dsw-font-s-strong-14); }
.dwt-shortcut-settings label { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 420px; margin-bottom: 8px; }
.dwt-shortcut-settings select { min-width: 150px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: inherit; font: inherit; }
.dwt-body { position: relative; overflow-anchor: none; flex: 1; min-height: 0; overflow-y: auto; padding: 4px 6px 12px; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: transparent transparent; }
.dwt-body:has(> .dwt-group[data-status='true']) { padding-top: 0; }
/* The scrollbar is a pointer affordance: drawn on hover, and the reserved
   gutter keeps rows from shifting when the thumb appears. */
.dwt-body:hover { scrollbar-color: var(--dsh-scrollbar-thumb, var(--dsw-alias-border-l2)) transparent; }
.dwt-body::-webkit-scrollbar { width: var(--dsh-scrollbar-width, 5px); }
.dwt-body::-webkit-scrollbar-track { background: transparent; }
.dwt-body::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
.dwt-body:hover::-webkit-scrollbar-thumb { background: var(--dsh-scrollbar-thumb, var(--dsw-alias-border-l2)); }
.dwt-group { margin-top: 4px; }
/* Status headings start at the leading Session icon column. */
.dwt-group[data-status='true'] { margin-top: 20px; }
.dwt-group[data-status='true']:first-child { margin-top: 0; }
.dwt-status-title { box-sizing: border-box; display: flex; align-items: center; min-width: 0; height: 32px; margin: 0; padding: 0 8px; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 20px; font-weight: 600; user-select: none; }
.dwt-group[data-status='true'] > .dwt-group-head:hover { background: none; }
.dwt-group-head { display: flex; align-items: center; gap: 2px; border-radius: 6px; }
/* The hover fill spans the whole header row — leading mark, label, and the
   controls that appear on hover — so it never reads as a fill that stops short
   of its own buttons. It is the shell's own hover token, the same one the
   shipped browser paints its rows with, rather than the brighter layer fill. */
.dwt-group-head:hover, .dwt-group-head[data-menu='open'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-group-head .dwt-group-header { flex: 1; min-width: 0; }
.dwt-group-actions { display: none; align-items: center; gap: 2px; flex: none; opacity: 0; }.dwt-group-head:hover .dwt-group-actions, .dwt-group-head:focus-within .dwt-group-actions, .dwt-group-head[data-menu='open'] .dwt-group-actions { display: flex; opacity: 1; }
.dwt-rename { flex: 1; min-width: 0; margin: 0 4px; appearance: none; height: 32px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; padding: 0 8px; }
.dwt-rename:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }
/* Native row metrics: a 34px Workspace header and a 32px Session row. */
.dwt-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dwt-delete-action:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.dwt-group-header { box-sizing: border-box; display: flex; align-items: center; gap: 6px; width: 100%; height: 34px; min-width: 0; appearance: none; border: 0; background: none; cursor: pointer; padding: 0 8px; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 20px; font-weight: 400; text-align: left; border-radius: var(--dsw-radius-md); }
.dwt-group-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-group-header:hover { color: var(--dsw-alias-label-primary); }
/* Workspace header marks keep the native leading cell. */
.dwt-group-mark { flex: none; width: 16px; height: 20px; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); }
.dwt-folder-mark, .dwt-folder { display: inline-flex; }
.dwt-chevron { display: none; color: var(--dsw-alias-label-caption); }
.dwt-folder-mark[data-open='true'] .dwt-chevron { transform: rotate(90deg); }
.dwt-group-head:hover .dwt-folder, .dwt-group-head:focus-within .dwt-folder { display: none; }
.dwt-group-head:hover .dwt-chevron, .dwt-group-head:focus-within .dwt-chevron { display: inline-flex; }
.dwt-group-head[data-current='true'] .dwt-folder { color: var(--dsw-alias-state-business-primary); }
.dwt-input-mark { color: var(--dsw-alias-state-warn-primary); }
.dwt-unread-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; corner-shape: round; background: var(--dsw-alias-state-success-primary); }
/* The section menu card: display rows first, then the actions. */
.dwt-menu-head { display: flex; align-items: center; gap: 6px; padding: 4px 8px 6px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; }
.dwt-menu-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-menu-stat { padding: 0 8px 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dwt-menu-path { display: flex; align-items: center; gap: 6px; width: 100%; margin: 0 0 2px; appearance: none; border: 0; background: none; cursor: pointer; padding: 4px 8px 6px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; font-family: var(--ds-font-family-code); text-align: left; }
.dwt-menu-path:hover { color: var(--dsw-alias-label-primary); }
.dwt-menu-path > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Session and Workspace titles share the native baseline; row marks reserve 16px. */
.dwt-group > div + div { margin-top: 2px; }
.dwt-row { box-sizing: border-box; display: flex; align-items: center; gap: 0; height: 32px; border-radius: var(--dsw-radius-md); padding: 0 8px; cursor: pointer; color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 20px; }
.dwt-row:hover, .dwt-row[data-menu='open'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-row[data-current='true'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-row-clip { margin: 0 6px 0 4px; flex: 1; min-width: 0; overflow: hidden; }
.dwt-row-title { display: block; width: 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The fallback Workspaces list still clips its translated title at the wrapper. */
.dwt-row:not([data-status-row]) .dwt-row-title { transform: translateX(var(--dwt-shift, 0px)); }
.dwt-row:not([data-status-row]):hover .dwt-row-title { width: max-content; overflow: visible; text-overflow: clip; transition: transform .35s ease; }
.dwt-row[data-status-row]:is(:hover, [data-menu='open']) .dwt-row-title { text-overflow: clip; }
.dwt-row-title[data-title-scrolled] { mask-image: linear-gradient(90deg, transparent, #000 12px); }
.dwt-row-title[data-title-clipped] { mask-image: linear-gradient(270deg, transparent, #000 12px); }
.dwt-row-title[data-title-scrolled][data-title-clipped] { mask-image: linear-gradient(90deg, transparent, #000 12px calc(100% - 12px), transparent); }
/* Each child owns its branch so position animations move line and label
   together. The final vertical segment stops at its elbow, including for a
   single child; these decorative lines never intercept input. */
.dwt-children { margin: 0 0 4px 28px; padding: 0; }
.dwt-child { position: relative; display: flex; align-items: center; gap: 6px; border-radius: 7px; padding: 4px 8px 4px 14px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dwt-child::before, .dwt-child::after { content: ''; position: absolute; left: 0; pointer-events: none; border-color: var(--dsw-alias-border-l2); border-style: solid; border-width: 0; }
.dwt-child::before { top: 0; bottom: 0; border-left-width: 1px; }
.dwt-child:last-child::before { bottom: 50%; }
.dwt-child::after { top: 50%; width: 10px; border-top-width: 1px; }
.dwt-child[data-openable='true'] { cursor: pointer; color: var(--dsw-alias-label-primary); }
.dwt-child:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-child-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-row-mark { flex: none; width: 16px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
.dwt-child-time { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dwt-trailing { flex: none; font-size: 10px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dwt-row-resting { flex: none; display: inline-flex; align-items: center; gap: 6px; }
.dwt-row-pin { width: 16px; height: 20px; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-caption); }
/* Switch the resting information for a compact action strip without changing row height. */
.dwt-rowbar { flex: none; display: none; align-items: center; gap: 10px; height: 16px; }
.dwt-row[data-status-row] { user-select: none; }
.dwt-row[data-status-row] .dwt-rowbar { gap: 13px; }
.dwt-row:not([data-status-row]):is(:hover, :focus-within) .dwt-rowbar, .dwt-row[data-menu='open'] .dwt-rowbar { display: inline-flex; }
.dwt-row:not([data-status-row]):is(:hover, :focus-within) .dwt-row-resting, .dwt-row[data-menu='open'] .dwt-row-resting { display: none; }
@media (hover: hover) {
  .dwt-row[data-status-row]:hover .dwt-rowbar, html[data-input-modality='keyboard'] .dwt-row[data-status-row]:focus-within .dwt-rowbar { display: inline-flex; }
  .dwt-row[data-status-row]:hover .dwt-row-resting, html[data-input-modality='keyboard'] .dwt-row[data-status-row]:focus-within .dwt-row-resting { display: none; }
}
@media (hover: none) {
  .dwt-row[data-status-row] .dwt-rowbar { display: inline-flex; }
  .dwt-row[data-status-row] .dwt-trailing[data-time='true'] { display: none; }
}
.dwt-trigger { flex: none; display: inline-flex; align-items: center; justify-content: center; appearance: none; border: 0; background: none; color: var(--dsw-alias-label-tertiary); font: inherit; width: 16px; height: 16px; padding: 0; border-radius: var(--dsw-radius-xs); cursor: pointer; }
.dwt-row[data-status-row] .dwt-trigger { width: 24px; height: 24px; margin: -4px; }
.dwt-row[data-status-row] .dwt-trigger svg { width: 14px; height: 14px; }
.dwt-trigger:hover { color: var(--dsw-alias-label-primary); }
.dwt-trailing[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
.dwt-session-preview { display: flex; flex-direction: column; gap: 8px; }
.dwt-session-preview-title { color: var(--dsw-alias-hovercard-label-primary, var(--dsw-alias-label-primary)); overflow-wrap: break-word; font-size: 14px; line-height: 20px; }
.dwt-session-preview-path, .dwt-session-preview-time { color: var(--dsw-alias-hovercard-label-secondary, var(--dsw-alias-label-secondary)); font-size: 12px; line-height: 16px; }
.dwt-session-preview-path { word-break: break-all; }
.dwt-session-preview-status { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-hovercard-label-tertiary, var(--dsw-alias-label-tertiary)); font-size: 12px; line-height: 20px; }
/* The section's one fold control, drawn like the shipped workspace browser's own
   overflow button rather than with the host's Button: the shipped control is not
   one of that component's variants, so its whole appearance lives here — a bare
   28px row whose label sits on the title column (6px of body padding + 27px =
   the 33px the section label and every Session title start on), in the quietest
   label tier, stepping one colour up on hover instead of taking a fill. The fill
   it would otherwise take is the interactive-bg-hover token the Session rows
   paint themselves with, which made a fold read as another row. The border-box
   sizing is part of replacing the host Button: that component declared it, and
   without it this rule's 100% width and its 39px of horizontal padding would add
   up instead of overlapping, pushing the control 39px past the column it sits in. */
.dwt-more { box-sizing: border-box; display: flex; align-items: center; width: 100%; height: 28px; margin: 4px 0 0; padding: 0 12px 0 27px; appearance: none; border: 0; border-radius: var(--dsw-radius-sm); background: none; color: var(--dsw-alias-label-tertiary); cursor: pointer; font: inherit; font-size: 12px; line-height: 18px; text-align: left; }
.dwt-more:hover { color: var(--dsw-alias-label-secondary); background: none; }
.dwt-more:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
/* Search results, on the shipped result row's metrics: a 48px two-line row with
   a 16px leading marker cell, the title over the Workspace and snippet line, and
   2px between rows. */
.dwt-hits > .dwt-hit + .dwt-hit { margin-top: 2px; }
.dwt-hit { display: flex; flex-direction: column; align-items: stretch; width: 100%; min-height: 48px; box-sizing: border-box; border: 0; border-radius: var(--dsw-radius-lg); padding: 4px 8px; background: transparent; text-align: left; cursor: pointer; }
.dwt-hit:hover, .dwt-hit[data-current='true'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-hit[data-archived='true'] { cursor: default; }
/* Archived rows stay in place but read as inactive, and the restore control on
   the row is the only way back. */
.dwt-hit[data-archived='true'] .dwt-hit-title,
.dwt-hit[data-archived='true'] .dwt-hit-ws,
.dwt-hit[data-archived='true'] .dwt-hit-snippet { color: var(--dsw-alias-label-caption); }
.dwt-hit:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.dwt-hit-head { display: flex; align-items: center; min-width: 0; }
.dwt-hit-slot { flex: none; width: 16px; display: inline-flex; align-items: center; justify-content: center; }
.dwt-hit-title { flex: 0 1 auto; min-width: 0; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dwt-hit-actions { flex: none; display: flex; align-items: center; margin-left: auto; }
.dwt-hit-meta { display: flex; align-items: center; gap: 6px; min-width: 0; margin-left: 20px; }
.dwt-hit-ws { flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 17px; color: var(--dsw-alias-label-tertiary); }
/* The 40% share only protects a snippet; a snippetless match keeps the row. */
.dwt-hit-ws:only-child { max-width: 100%; }
.dwt-hit-snippet { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 17px; color: var(--dsw-alias-label-secondary); }
.dwt-hits-note { padding: 10px 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
/* Pending content search: placeholder rows on the result row's metrics, pulsing
   through opacity rather than a spinner, so the list does not jump when the
   matches land. */
.dwt-skeleton-row { display: flex; align-items: flex-start; gap: 8px; box-sizing: border-box; min-height: 48px; padding: 6px 8px 7px; }
.dwt-skeleton-dot { flex: none; width: 16px; height: 16px; border-radius: 50%; }
.dwt-skeleton-bars { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.dwt-skeleton-bar { width: 65%; height: 16px; border-radius: var(--dsw-radius-xs, 4px); }
.dwt-skeleton-bar-wide { width: 90%; height: 13px; }
.dwt-skeleton-dot, .dwt-skeleton-bar { background: var(--dsw-alias-bg-skeleton); animation: dwt-skeleton 2s cubic-bezier(.36, 0, .64, 1) infinite; }
@keyframes dwt-skeleton { 0% { opacity: 1 } 40% { opacity: .6 } 80%, 100% { opacity: 1 } }
/* Drop indicators come last so they win over the current-row accent mid-drag. */
.dwt-row[data-dragging='true'] { opacity: .45; }
.dwt-row[data-drop='before'] { box-shadow: inset 0 2px 0 var(--dsw-alias-brand-primary); }
.dwt-row[data-drop='after'] { box-shadow: inset 0 -2px 0 var(--dsw-alias-brand-primary); }
.dwt-group-header[data-drop='group'] { box-shadow: inset 0 2px 0 var(--dsw-alias-brand-primary); }
.dwt-empty { padding: 22px 12px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dwt-card { position: fixed; z-index: 40; max-width: 340px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-2)); box-shadow: 0 6px 20px rgb(0 0 0 / .18); pointer-events: none; }
.dwt-card-title { font-size: 13px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dwt-card-meta { margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
/* The Workspace's directory and creation instant, under the row's own line and
   one step quieter than the title. */
.dwt-card-path { margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dwt-card-created { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dwt-rail { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0; }
.dwt-rail-button { position: relative; appearance: none; border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 15px; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; }
.dwt-rail-button:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dwt-rail-button[data-active='true'] { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dwt-rail-button[data-attention='true'] { color: var(--dsw-alias-state-warn-primary); }
`;
