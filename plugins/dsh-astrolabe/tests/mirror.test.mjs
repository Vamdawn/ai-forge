import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots';
import { createMirror } from '../src/mirror.ts';

function setup(kind = 'list') {
  const slots = new SlotCore();
  slots.register({ name: 'root', children: {
    source: { kind, scope: 'root' }, target: { kind, scope: 'root' },
  } }, () => null);
  return { slots, mirror: createMirror({ slots }, 'source', 'target', () => true) };
}

for (const kind of ['list', 'single']) {
  test(`mirror follows replacement of a ${kind} winner with unchanged order`, () => {
    const { slots, mirror } = setup(kind);
    const options = { name: 'source', ...(kind === 'list' ? { id: 'action' } : {}) };
    slots.register(options, 'original');
    mirror.sync();
    const removeOverride = slots.register({ ...options, priority: -1 }, 'replacement');
    mirror.sync();
    assert.equal(slots.entriesOfSlot('target')[0].component, 'replacement');
    removeOverride();
    mirror.sync();
    assert.equal(slots.entriesOfSlot('target')[0].component, 'original');
    mirror.dispose();
    assert.equal(slots.entriesOfSlot('target').length, 0);
  });
}

test('unchanged mirror does not churn registrations; removed source disappears', () => {
  const { slots, mirror } = setup();
  const remove = slots.register({ name: 'source', id: 'action' }, 'original');
  mirror.sync();
  const entry = slots.entriesOfSlot('target')[0];
  mirror.sync();
  assert.equal(slots.entriesOfSlot('target')[0], entry);
  remove();
  mirror.sync();
  assert.equal(slots.entriesOfSlot('target').length, 0);
});

test('losing the target declaration clears mirrored entries and occupancy', () => {
  const { slots } = setup('single');
  let ready = true;
  let count = 0;
  const mirror = createMirror({ slots }, 'source', 'target', () => ready, value => { count = value; });
  slots.register({ name: 'source' }, 'picker');
  mirror.sync();
  assert.equal(count, 1);
  ready = false;
  mirror.sync();
  assert.equal(count, 0);
  assert.equal(slots.entriesOfSlot('target').length, 0);
  ready = true;
  mirror.sync();
  assert.equal(count, 1);
  mirror.dispose();
  assert.equal(count, 0);
});
