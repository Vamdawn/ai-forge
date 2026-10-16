// Temporary mount in WorkspaceTabs for native Desktop verification; never shipped.
import { createElement as h, useEffect, useRef, useState } from 'react';
import { AnimatedList } from '../src/motion.js';

export function DesktopMotionFixture() {
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState('Ready — synthetic sessions, no Host writes');
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const run = (rapid: boolean) => {
    timers.current.forEach(clearTimeout);
    setReport('Sampling real Desktop frames…');
    const frames: { y: number; active: number }[] = [];
    const sample = () => {
      const node = root.current?.querySelector<HTMLElement>('[data-motion-id="demo-a"]');
      frames.push({ y: Math.round((node?.getBoundingClientRect().top ?? 0) * 10) / 10,
        active: node?.getAnimations().length ?? 0 });
    };
    for (let i = 0; i < 50; i++) timers.current.push(setTimeout(sample, i * 16));
    setStep(value => value + 1);
    if (rapid) {
      timers.current.push(setTimeout(() => setStep(value => value + 1), 80));
      timers.current.push(setTimeout(() => setStep(value => value + 1), 160));
    }
    timers.current.push(setTimeout(() => {
      setReport(JSON.stringify({ samples: frames.length, movingFrames: frames.filter(f => f.active).length,
        maxActivePerRow: Math.max(...frames.map(f => f.active)),
        distinctY: new Set(frames.map(f => f.y)).size,
        finalActive: frames.at(-1)?.active, ghosts: root.current?.querySelectorAll('[aria-hidden="true"]').length,
        path: frames.filter((_, i) => i % 5 === 0).map(f => f.y) }));
    }, 850));
  };
  const location = step % 3;
  const children = ['Needs input', 'Working', 'Completed'].map((name, index) => h('section', {
    key: name, 'data-motion-group': name,
  }, h('div', { className: 'dwt-group-head', style: { height: 30 } }, name),
  h('div', { className: 'dwt-row', 'data-motion-id': `fixed-${index}` }, `Stable session ${index + 1}`),
  location === index ? h('div', { className: 'dwt-row', 'data-motion-id': 'demo-a', draggable: true,
    onDragStart: () => { setDragging(true); setReport('Native drag started'); },
    onDragEnd: () => { setDragging(false); setReport('Native drag ended'); },
    style: { background: '#e5edff' },
  }, 'Moving session') : null));
  return h('div', { ref: root, style: { position: 'fixed', right: 20, top: 90, width: 420,
    padding: 16, background: '#fff', color: '#222', border: '1px solid #999', zIndex: 99999 } },
    h('strong', null, 'Astrolabe motion verification (synthetic)'),
    h('div', null, h('button', { onClick: () => run(false) }, 'Move across groups'),
      h('button', { onClick: () => run(true) }, 'Three updates 80ms apart')),
    h(AnimatedList, { context: 'fixture', layout: String(step), dragging }, children),
    h('output', { style: { display: 'block', overflowWrap: 'anywhere' } }, report));
}
