import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ListMotion } from '../src/motion.ts';

const rect = top => ({ top, bottom: top + 30, left: 0, right: 240, width: 240, height: 30 });
function row(id, top, group = 'one') {
  return {
    dataset: { motionId: id }, top, group, style: {}, animations: [], attributes: {},
    getBoundingClientRect() { return rect(this.top); },
    closest() { return { dataset: { motionGroup: this.group } }; },
    animate(frames, options) {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      this.animations.push(animation);
      return animation;
    },
    cloneNode() { return row(this.dataset.motionId, this.top, this.group); },
    removeAttribute(name) { delete this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelectorAll() { return []; },
    remove() { this.removed = true; },
  };
}
function scene(rows) {
  return { rows, ghosts: [], scrollTop: 0, scrollLeft: 0,
    getBoundingClientRect: () => ({ top: 0, bottom: 600, left: 0, height: 600 }),
    querySelectorAll() { return this.rows; },
    append(node) { this.ghosts.push(node); },
  };
}

test('a consecutive reorder starts at the painted position and cancels its predecessor', () => {
  const motion = new ListMotion();
  const a = row('a', 30), root = scene([a]);
  const before = motion.capture(root);
  a.top = 90;
  motion.play(root, before, false);
  assert.equal(a.animations[0].frames[0].transform, 'translate(0px, -60px)');
  a.top = 55; // An intermediate position painted by the first animation.
  const interrupted = motion.capture(root);
  assert.equal(a.animations[0].cancelled, true);
  a.top = 120;
  motion.play(root, interrupted, false);
  assert.equal(a.animations[1].frames[0].transform, 'translate(0px, -65px)');
  motion.dispose();
});

test('a remounted row moves continuously across groups using its session identity', () => {
  const motion = new ListMotion(), root = scene([row('a', 30)]);
  const before = motion.capture(root);
  const replacement = row('a', 150, 'two');
  root.rows = [replacement];
  motion.play(root, before, false);
  assert.equal(replacement.animations[0].options.duration, 240);
  assert.equal(replacement.animations[0].frames[0].transform, 'translate(0px, -120px)');
  assert.equal(root.ghosts.length, 0);
  motion.dispose();
});

test('distant moves and hidden destinations fade without leaving interactive ghosts', () => {
  const motion = new ListMotion(), a = row('a', 30), b = row('b', 70), root = scene([a, b]);
  const before = motion.capture(root);
  root.rows = [row('a', 400, 'two')];
  motion.play(root, before, false);
  assert.equal(root.ghosts.length, 2);
  for (const ghost of root.ghosts) {
    assert.equal(ghost.inert, true);
    assert.equal(ghost.attributes['aria-hidden'], 'true');
    assert.equal(ghost.style.pointerEvents, 'none');
  }
  root.ghosts[0].animations[0].onfinish();
  assert.equal(root.ghosts[0].removed, true);
  motion.cancel();
  assert.equal(root.ghosts[1].removed, true);
});

test('scrolling, reduced motion and drag cancellation leave no position animation', () => {
  const motion = new ListMotion(), a = row('a', 30), root = scene([a]);
  let before = motion.capture(root);
  a.top = 90;
  motion.play(root, before, true);
  assert.equal(a.animations.length, 0);
  motion.play(root, before, false);
  motion.cancel(); // dragstart capture
  assert.equal(a.animations[0].cancelled, true);
  before = motion.capture(root);
  a.top = 120;
  motion.scroll();
  motion.play(root, before, false);
  assert.equal(a.animations.length, 1);
  motion.dispose();
});

test('unchanged and offscreen rows do not animate', () => {
  const motion = new ListMotion(), a = row('a', 30), b = row('b', 900), root = scene([a, b]);
  const before = motion.capture(root);
  b.top = 950;
  motion.play(root, before, false);
  assert.equal(a.animations.length + b.animations.length, 0);
});
