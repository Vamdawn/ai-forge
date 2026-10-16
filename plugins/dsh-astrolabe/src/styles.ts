export const CSS = `
.dwt-root { display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* The region's one header row, shaped like the shipped Workspace section header
   this entry replaces: a 36px band, the label slot on the left, and 28px icon
   buttons on the right that the expanding search pushes out of the way. */
.dwt-head { flex: none; display: flex; align-items: center; gap: 4px; height: 36px; margin-bottom: 4px; padding-left: 4px; box-sizing: border-box; border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-tertiary); }
/* The two grouping modes read as view tabs, not as a segmented control: content
   width, 13px tertiary labels, and the selected one riding the business blue
   with a 2px bar over the rule below (brand-primary resolves to neutral ink in
   this token sheet, so the shipped view tabs deliberately do not use it). */
.dwt-tabs { flex: none; display: flex; gap: 24px; align-self: stretch; }
.dwt-tab { position: relative; display: inline-flex; align-items: center; appearance: none; border: 0; background: none; color: inherit; font: inherit; font-size: 13px; line-height: 16px; font-weight: 500; padding: 0; cursor: pointer; }
.dwt-tab::after { content: ''; position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; border-radius: 2px; background: transparent; }
.dwt-tab:hover { color: var(--dsw-alias-label-primary); }
.dwt-tab[data-active='true'] { color: var(--dsw-alias-state-business-primary); }
.dwt-tab[data-active='true']::after { background: var(--dsw-alias-state-business-primary); }
.dwt-tab:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.dwt-badge { position: absolute; top: 6px; right: -8px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); }
/* The search control takes the label's room while it is closed, then grows into
   the shipped header's search pill: a smaller magnifier, the field, and its own
   clear button inside one 30px bordered capsule, which is what keeps the field
   off the tabs' edge. */
.dwt-searchslot { flex: 1; max-width: 28px; min-width: 0; display: flex; align-items: center; margin-left: auto; transition: max-width 180ms var(--ds-ease-in-out); }
.dwt-searchslot-open { max-width: 100%; height: 30px; padding: 0 4px; box-sizing: border-box; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-caption); }
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
.dwt-headactions { flex: none; display: flex; align-items: center; gap: 4px; max-width: 28px; opacity: 1; overflow: hidden; transition: max-width 180ms var(--ds-ease-in-out), opacity 120ms var(--ds-ease-in-out); }
.dwt-headactions-hidden { max-width: 0; opacity: 0; visibility: hidden; pointer-events: none; }
.dwt-body { position: relative; overflow-anchor: none; flex: 1; min-height: 0; overflow-y: auto; padding: 4px 6px 12px; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: transparent transparent; }
/* The scrollbar is a pointer affordance: drawn on hover, and the reserved
   gutter keeps rows from shifting when the thumb appears. */
.dwt-body:hover { scrollbar-color: var(--dsh-scrollbar-thumb, var(--dsw-alias-border-l2)) transparent; }
.dwt-body::-webkit-scrollbar { width: var(--dsh-scrollbar-width, 5px); }
.dwt-body::-webkit-scrollbar-track { background: transparent; }
.dwt-body::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
.dwt-body:hover::-webkit-scrollbar-thumb { background: var(--dsh-scrollbar-thumb, var(--dsw-alias-border-l2)); }
.dwt-group { margin-top: 4px; }
.dwt-group-head { display: flex; align-items: center; gap: 2px; border-radius: 6px; }
/* The hover fill spans the whole header row — leading mark, label, and the
   controls that appear on hover — so it never reads as a fill that stops short
   of its own buttons. It is the shell's own hover token, the same one the
   shipped browser paints its rows with, rather than the brighter layer fill. */
.dwt-group-head:hover, .dwt-group-head[data-menu='open'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-group-head .dwt-group-header { flex: 1; min-width: 0; }
.dwt-group-actions { display: flex; align-items: center; gap: 2px; flex: none; opacity: 0; }.dwt-group-head:hover .dwt-group-actions, .dwt-group-head:focus-within .dwt-group-actions, .dwt-group-head[data-menu='open'] .dwt-group-actions { opacity: 1; }
.dwt-rename { flex: 1; min-width: 0; margin: 0 4px; appearance: none; height: 32px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; padding: 0 8px; }
.dwt-rename:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dwt-confirm { display: flex; align-items: center; gap: 6px; margin: 0 8px 6px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
/* The section title is the parent level, so it carries the larger size. */
.dwt-group-header { display: flex; align-items: center; gap: 5px; width: 100%; min-height: 30px; appearance: none; border: 0; background: none; cursor: pointer; padding: 5px 8px; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 14px; font-weight: 600; text-align: left; border-radius: 6px; }
.dwt-group-header:hover { color: var(--dsw-alias-label-primary); }
/* The leading cell is the same width whichever mark it holds, so Workspace and
   Status sections keep their labels on one column. Marks are neutral except
   where the section's state has a colour of its own. */
.dwt-group-mark { flex: none; width: 14px; height: 16px; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); }
/* The Working mark is a line icon drawn in currentColor, so the section tint
   reaches the glyph through the cell alone. */
.dwt-group-mark[data-kind='running'] { color: var(--dsw-alias-state-success-primary); }
.dwt-group-mark[data-kind='input'] { color: var(--dsw-alias-state-warn-primary); }
/* The section menu card: display rows first, then the actions. */
.dwt-menu-head { display: flex; align-items: center; gap: 6px; padding: 4px 8px 6px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; }
.dwt-menu-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-menu-stat { padding: 0 8px 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dwt-menu-path { display: flex; align-items: center; gap: 6px; width: 100%; margin: 0 0 2px; appearance: none; border: 0; background: none; cursor: pointer; padding: 4px 8px 6px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; font-family: var(--ds-font-family-code); text-align: left; }
.dwt-menu-path:hover { color: var(--dsw-alias-label-primary); }
.dwt-menu-path > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The count moved into the section menu, so the label carries the row alone. */
/* A group's sessions and their controls are its children, so the whole block is
   inset past the group's own left padding: the two levels never share a left
   edge, and every nested surface — row hover, current accent, drag indicator —
   stays inside the group's column. Set so the session title stays the same few
   pixels right of the group label the row width leaves (8px padding + a 14px
   mark + 5px gap = 27px to the label) after the folder mark replaced the fold
   glyph. */
/* A Session's 16px leading cell matches a section's mark cell, so the title of
   every Session lands on the same left baseline as the section label it belongs
   to — the nesting is carried by the section's fold mark, not by an indent. */
.dwt-row { display: flex; align-items: center; gap: 5px; border-radius: 8px; padding: 5px 8px; cursor: pointer; color: var(--dsw-alias-label-primary); font-size: 13px; }
.dwt-row:hover, .dwt-row[data-menu='open'] { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-row[data-current='true'] { background: var(--dsw-alias-interactive-bg-hover); box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary); }
.dwt-row-clip { flex: 1; min-width: 0; overflow: hidden; }
.dwt-row-title { display: block; width: 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transform: translateX(var(--dwt-shift, 0px)); }
/* The crawl has to lift the title's own clipping, otherwise that clip travels
   with the box and the text paints outside the row; the wrapper above then does
   all the clipping. The animation stays a transform — animating the text layout
   instead (text-indent) relayouts and reshapes the line on every frame, which is
   what makes the crawl stutter. The transition rides the hover rule only, so
   leaving the row snaps back instead of sliding out of a box that no longer
   holds the tail. */
.dwt-row:hover .dwt-row-title { width: max-content; overflow: visible; text-overflow: clip; transition: transform .35s ease; }
.dwt-children { margin: 0 0 2px 15px; border-left: 1px solid var(--dsw-alias-border-l1); padding-left: 4px; }
.dwt-child { display: flex; align-items: center; gap: 6px; border-radius: 7px; padding: 4px 8px 4px 6px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dwt-child[data-openable='true'] { cursor: pointer; color: var(--dsw-alias-label-primary); }
.dwt-child:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dwt-child-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwt-row-mark { flex: none; width: 14px; height: 16px; display: inline-flex; align-items: center; justify-content: center; }
.dwt-child-time { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dwt-trailing { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); }
/* The row keeps two controls. Both live in one strip that is out of flow at
   rest, so the relative time holds the trailing cell on its own; hovering swaps
   the cell in place — the strip takes exactly the slot the time was holding, so
   the row's right edge never moves. The strip is held to the 16px leading cell:
   its own controls may not be taller than that cell, or a hovered row grows by
   the difference and every row below it slides — the title's line box is 16px
   for a Latin title and 18px for a CJK one, so the taller strip only moved the
   Latin rows, which read as the list twitching as the pointer travelled. */
.dwt-rowbar { flex: none; display: none; align-items: center; gap: 6px; height: 16px; }
.dwt-row:hover .dwt-rowbar, .dwt-row:focus-within .dwt-rowbar, .dwt-row[data-menu='open'] .dwt-rowbar { display: inline-flex; }
.dwt-row:hover .dwt-trailing, .dwt-row:focus-within .dwt-trailing, .dwt-row[data-menu='open'] .dwt-trailing { display: none; }
.dwt-trigger { flex: none; display: inline-flex; align-items: center; justify-content: center; appearance: none; border: 0; background: none; color: var(--dsw-alias-label-tertiary); font: inherit; width: 16px; height: 16px; padding: 0; border-radius: var(--dsw-radius-xs); cursor: pointer; }
/* The shipped row's own action button: a bare 16px glyph whose hover is a
   colour step, so the two controls in this strip are one pair. The text "⋯" it
   replaced was a 23px box with 7.5px of air on each side of a 9.5px glyph, so
   the pair read as a wide framed button plus a small icon — its left edge began
   10px left of the timestamp it was supposed to stand in for. */
.dwt-trigger:hover { color: var(--dsw-alias-label-primary); }
.dwt-trailing[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
/* Layout only: the host's Button owns the visuals, so this must not restate
   border, fill, font, or radius. */
.dwt-more { width: calc(100% - 8px); margin: 4px 4px 0; }
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
