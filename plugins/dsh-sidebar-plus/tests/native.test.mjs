import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { act, create } from 'react-test-renderer';
import * as slotsModule from '@deepseek-ai/dsh-client-ui-slots';
import { createNativeBrowser } from '../src/mirror.ts';

const { SlotCore } = slotsModule;
const target = 'sidebar-plus.nativeWorkspaces';
const flow = 'sidebar.workspaces.directoryFlow';

function createSnapshotStore(initial) {
  let snapshot = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    set(next) { snapshot = next; for (const listener of listeners) listener(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

async function mountSidebar(t, { useSectionScroller } = {}) {
  const require = createRequire(import.meta.url);
  const disposers = [];
  const commands = new Map();
  const sidebar = createSnapshotStore(true);
  const ctx = {
    get: key => ctx[key],
    emit() {},
    on: () => () => {},
    effect(setup) {
      const result = setup();
      const cleanups = typeof result === 'function' ? [result] : [...(result ?? [])];
      const dispose = () => cleanups.splice(0).reverse().forEach(stop => stop());
      disposers.push(dispose);
      return dispose;
    },
    reflect: { provide: (key, service) => { ctx[key] = service; } },
    locale: { ...createSnapshotStore({ revision: 0 }), bind: () => key => key, register: () => () => {} },
    remote: { $host: {}, directoryPicker: {} },
    sessions: { list: createSnapshotStore({ ids: [], byId: {}, projectionsBySession: {}, phase: 'loading' }) },
    workspaces: { list: createSnapshotStore({ items: [], archivedSessionIds: [], pinnedSessionIds: [], phase: 'loading' }) },
    shortcuts: {
      catalog: createSnapshotStore([]),
      register(command) { commands.set(command.id, command); return () => commands.delete(command.id); },
    },
    jobs: { state: createSnapshotStore({ rows: {}, observed: {} }), watchRows: () => () => {} },
  };
  const modules = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-dom': {},
    'react-dom/client': {},
    '@deepseek-ai/cordis': { Service: class { constructor(ctx, name) { this.ctx = ctx; ctx[name] = this; } } },
    '@deepseek-ai/dsh-client-store': {
      createSnapshotStore,
      defineStore: spec => ({
        spec,
        create: () => {
          const store = createSnapshotStore(spec.init());
          const actions = Object.fromEntries(Object.entries(spec.actions).map(([name, action]) => [name, (...args) => {
            const draft = structuredClone(store.getSnapshot());
            action(draft, ...args);
            store.set(draft);
          }]));
          return { ...store, actions };
        },
      }),
    },
    '@deepseek-ai/dsh-client-ui-slots': slotsModule,
    '@deepseek-ai/dsh-client-ui-primitives': new Proxy({}, { get: (_, key) => {
      if (key === 'Tooltip') return ({ children }) => children;
      if (key === 'Menu') return ({ anchor }) => anchor;
      return () => null;
    } }),
  };
  const load = file => {
    let module;
    runInNewContext(readFileSync(file, 'utf8'), {
      window: { __ModuleLoader__: { load: entry => { module = entry; } }, setTimeout, clearTimeout },
      document: {
        querySelector: () => null, createElement: () => ({ dataset: {}, remove() {} }),
        head: { append() {}, appendChild() {} }, addEventListener() {}, removeEventListener() {},
      },
      AbortController, Error, setTimeout, clearTimeout, setInterval, clearInterval,
    });
    return module.factory(id => {
      assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`);
      return modules[id];
    });
  };
  load(require.resolve('@deepseek-ai/dsh-client-ui-renderer/client')).apply(ctx);
  ctx.slots.installLocale(ctx.locale);
  ctx.slots.installScope('session', { current: createSnapshotStore({ hooks: {}, keyedHooks: {}, props: {} }) });
  ctx.slots.provideRoot({ hooks: {
    sessions: ctx.sessions.list,
    sessionStatus: createSnapshotStore(new Map()),
    panelInfo: createSnapshotStore({ activePanelId: null }),
  } });
  const section = { kind: 'single', scope: 'root' };
  if (useSectionScroller) {
    section.inject = { hooks: { sectionScroller: (_, context) => context.useSectionScroller } };
  }
  ctx.slots.register({ name: 'root', children: {
    'sidebar.workspaces': section,
    'settings.section': { kind: 'list', scope: 'root' },
  } },
    ({ renderSlot }) => {
      const wide = React.useSyncExternalStore(sidebar.subscribe, sidebar.getSnapshot);
      return React.createElement(React.Fragment, null,
        renderSlot('sidebar.workspaces', { wide, expandSidebar: () => sidebar.set(true) },
          useSectionScroller ? { hookContext: { useSectionScroller } } : undefined),
        renderSlot('settings.section', {}));
    });
  load(require.resolve('@deepseek-ai/dsh-client-ui-workspace/client')).apply(ctx);
  load(new URL('../dist/client.js', import.meta.url)).apply(ctx);
  let renderer;
  t.after(() => { act(() => renderer?.unmount()); disposers.reverse().forEach(stop => stop()); });
  await act(async () => { renderer = create(ctx.slots.renderSlot('root', {})); });
  return { renderer, collapse: () => sidebar.set(false), search: () => commands.get('session.search').resolve().run() };
}

test('the view-options menu and grouping shortcuts control the same sidebar', async t => {
  const { renderer } = await mountSidebar(t);
  const button = label => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === label || node.children.includes(label));
  const mode = () => button('tab.status').props['aria-selected'];
  const menu = () => renderer.root.find(node => node.props.open === true && node.props.items?.some(item => item.id === 'status'));
  await act(async () => button('viewOptions.label').props.onClick());
  assert.deepEqual(Array.from(menu().props.items.slice(1, 5), item => item.id), ['workspace', 'workspace-tree', 'flat', 'status']);
  await act(async () => menu().props.onSelect('status'));
  assert.equal(mode(), true);
  await act(async () => button('viewOptions.label').props.onClick());
  await act(async () => menu().props.onSelect('workspace-tree'));
  assert.equal(mode(), false);
  assert.equal(button('tab.workspaces').props['aria-selected'], false);
  await act(async () => button('viewOptions.label').props.onClick());
  assert.ok(menu().props.selectedIds.includes('workspace-tree'));
});

test('settings can replace, reorder, or hide the two grouping shortcuts', async t => {
  const { renderer } = await mountSidebar(t);
  const selects = renderer.root.findAllByType('select');
  const shortcuts = () => renderer.root.findAllByType('button').filter(node => node.props.role === 'tab')
    .map(node => node.props['aria-label']);
  const pick = (position, value) => act(async () => selects[position].props.onChange({ target: { value } }));
  assert.deepEqual(shortcuts(), ['tab.workspaces', 'tab.status']);
  await pick(0, 'status');
  assert.deepEqual(shortcuts(), ['tab.status', 'tab.workspaces']);
  await pick(1, 'flat');
  assert.deepEqual(shortcuts(), ['tab.status', 'groupBy.flat']);
  await pick(0, '');
  await pick(1, '');
  assert.deepEqual(shortcuts(), []);
  assert.ok(renderer.root.findAllByType('button').some(node => node.props['aria-label'] === 'viewOptions.label'));
});

test('native Workspaces receives the sidebar shell scroll hook when the host provides it', async t => {
  const useSectionScroller = () => ({ bindScrollerRef() {} });
  const { renderer } = await mountSidebar(t, { useSectionScroller });
  const browser = renderer.root.find(node => typeof node.type === 'function' && node.type.name === 'WorkspaceBrowser');
  assert.equal(browser.props.useSectionScroller, useSectionScroller);
});

test('the shared search shortcut works across grouping changes without replaying', async t => {
  const { renderer, search } = await mountSidebar(t);
  const searchInput = () => renderer.root.findAllByType('input').find(node => node.props.className === 'dwt-search');
  const tab = name => renderer.root.findAllByType('button').find(node => node.props.role === 'tab' && node.props['aria-label'] === name);

  assert.equal(searchInput(), undefined);
  await act(async () => search());
  assert.ok(searchInput());
  await act(async () => searchInput().props.onKeyDown({ key: 'Escape' }));
  await act(async () => tab('tab.status').props.onClick());
  await act(async () => search());
  assert.ok(searchInput());
  await act(async () => searchInput().props.onKeyDown({ key: 'Escape' }));
  await act(async () => tab('tab.workspaces').props.onClick());

  assert.equal(searchInput(), undefined, 'the old shortcut must not reopen search');
  await act(async () => search());
  assert.ok(searchInput(), 'a fresh shortcut still opens search');
});

test('a search shortcut from the collapsed sidebar opens the shared field once', async t => {
  const { renderer, collapse, search } = await mountSidebar(t);
  const searchInput = () => renderer.root.findAllByType('input').find(node => node.props.className === 'dwt-search');

  await act(async () => collapse());
  assert.equal(searchInput(), undefined);
  await act(async () => search());
  assert.ok(searchInput());
  await act(async () => searchInput().props.onKeyDown({ key: 'Escape' }));
  await act(async () => collapse());
  const workspacesButton = renderer.root.findAllByType('button').find(node => node.props.title === 'tab.workspaces');
  await act(async () => workspacesButton.props.onClick());
  assert.equal(searchInput(), undefined);
});

function setup() {
  const slots = new SlotCore();
  slots.register({ name: 'root', children: {
    'sidebar.workspaces': { kind: 'single', scope: 'root' },
    [target]: { kind: 'single', scope: 'root' },
  } }, () => null);
  const states = [];
  const bridge = createNativeBrowser({ slots }, () => true, ready => states.push(ready));
  return { slots, bridge, states };
}

test('native browser shares the host store and inject face, remapping child authorization and hook context', async t => {
  const { slots, bridge, states } = setup();
  const store = { create() { throw new Error('the bridge must not create a store itself'); } };
  const inject = actions => ({ actions });
  let nativeProps;
  const Native = props => { nativeProps = props; return null; };
  const menuHooks = { hooks: { menuOpenState: (_, state) => () => state } };
  slots.register({ name: 'sidebar.workspaces', store, inject, locale: 'workspace', children: {
    [flow]: { kind: 'single', scope: 'root' },
    'sidebar.workspaces.session.menu.item': { kind: 'list', scope: 'root', inject: menuHooks },
  } }, Native);
  slots.register({ name: flow }, 'native-picker');
  slots.register({ name: 'sidebar.workspaces.session.menu.item', id: 'pin' }, 'native-pin');
  bridge.sync();
  const entry = slots.entriesOfSlot(target)[0];
  assert.equal(entry.store, store);
  assert.equal(entry.inject, inject);
  assert.equal(entry.locale, 'workspace');
  const calls = [];
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(entry.component, { wide: true, renderSlot: (...args) => calls.push(args) }));
  });
  t.after(() => act(() => renderer.unmount()));
  const state = [true, () => {}];
  nativeProps.renderSlot('sidebar.workspaces.session.menu.item', { sessionId: 'a' }, { hookContext: state });
  const [mapped, owner, opts] = calls[0];
  assert.notEqual(mapped, 'sidebar.workspaces.session.menu.item');
  assert.equal(entry.children[mapped].inject, menuHooks);
  assert.deepEqual(owner, { sessionId: 'a' });
  assert.equal(opts.hookContext, state);
  assert.equal(slots.entriesOfSlot(mapped)[0].component, 'native-pin');
  assert.deepEqual(states, [true]);
  bridge.dispose();
  assert.equal(slots.entriesOfSlot(target).length, 0);
  assert.equal(slots.entriesOfSlot(flow)[0].component, 'native-picker');
});

test('native bridge follows host replacement and child contributions, then clears when the host unloads', async () => {
  const { slots, bridge, states } = setup();
  const options = { name: 'sidebar.workspaces', children: { [flow]: { kind: 'single', scope: 'root' } } };
  const remove = slots.register(options, 'original');
  const removePicker = slots.register({ name: flow }, 'picker');
  bridge.sync();
  const original = slots.entriesOfSlot(target)[0];
  bridge.sync();
  assert.equal(slots.entriesOfSlot(target)[0], original);
  const child = Object.keys(original.children)[0];
  removePicker();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(slots.entriesOfSlot(child).length, 0);
  const removePluginPicker = slots.register({ name: flow, priority: -1 }, 'plugin-picker');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(slots.entriesOfSlot(child)[0].component, 'plugin-picker', 'new third-party entries appear without rebuilding the browser');
  removePluginPicker();
  remove();
  bridge.sync();
  assert.equal(slots.entriesOfSlot(target).length, 0);
  const removeNext = slots.register(options, 'replacement');
  bridge.sync();
  assert.notEqual(slots.entriesOfSlot(target)[0], original);
  removeNext();
  bridge.sync();
  assert.equal(states.at(-1), false);
  bridge.dispose();
});

test('a crashed native browser falls back until the host replaces it', () => {
  const { slots, bridge, states } = setup();
  const options = { name: 'sidebar.workspaces', children: { [flow]: { kind: 'single', scope: 'root' } } };
  const remove = slots.register(options, () => null);
  bridge.sync();
  slots.reportEntryError(target, slots.entriesOfSlot(target)[0], new Error('incompatible browser'), { abdicate: true });
  bridge.sync();
  assert.deepEqual(states, [true, false]);
  remove();
  slots.register(options, () => null);
  bridge.sync();
  assert.deepEqual(states, [true, false, true]);
  bridge.dispose();
});

test('native bridge releases aliases when its outlet disappears and can restore them', () => {
  const slots = new SlotCore();
  slots.register({ name: 'root', children: {
    'sidebar.workspaces': { kind: 'single', scope: 'root' },
    [target]: { kind: 'single', scope: 'root' },
  } }, () => null);
  slots.register({ name: 'sidebar.workspaces', children: { [flow]: { kind: 'single', scope: 'root' } } }, 'browser');
  slots.register({ name: flow }, 'picker');
  let ready = true;
  const bridge = createNativeBrowser({ slots }, () => ready, () => {});
  bridge.sync();
  ready = false;
  bridge.sync();
  assert.equal(slots.entriesOfSlot(target).length, 0);
  assert.equal(slots.entriesOfSlot(flow)[0].component, 'picker');
  ready = true;
  bridge.sync();
  assert.equal(slots.entriesOfSlot(target).length, 1);
  bridge.dispose();
});
