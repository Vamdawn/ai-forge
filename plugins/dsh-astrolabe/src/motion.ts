import { Component, createElement, createRef } from 'react';
import type { ReactNode } from 'react';

interface Position {
  node: HTMLElement;
  rect: DOMRect;
  group: string;
}
type Snapshot = Map<string, Position>;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/** Own only list-position animations; never cancel title/status animations. */
export class ListMotion {
  private animations = new Map<Animation, () => void>();
  private scrolling = false;
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;

  cancel(): void {
    for (const [animation, cleanup] of this.animations) {
      animation.cancel();
      cleanup();
    }
    this.animations.clear();
  }

  dispose(): void {
    this.cancel();
    clearTimeout(this.scrollTimer);
  }

  scroll(): void {
    this.cancel();
    this.scrolling = true;
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => { this.scrolling = false; }, 120);
  }

  measure(root: HTMLElement): Snapshot {
    const viewport = root.getBoundingClientRect();
    const result: Snapshot = new Map();
    for (const node of root.querySelectorAll<HTMLElement>('[data-motion-id]')) {
      const rect = node.getBoundingClientRect();
      if (rect.height && rect.bottom > viewport.top && rect.top < viewport.bottom) {
        result.set(node.dataset.motionId!, {
          node, rect, group: node.closest<HTMLElement>('[data-motion-group]')?.dataset.motionGroup ?? '',
        });
      }
    }
    return result;
  }

  capture(root: HTMLElement): Snapshot {
    // Read the currently painted positions before cancelling an interrupted move.
    const snapshot = this.measure(root);
    this.cancel();
    return snapshot;
  }

  private animate(node: HTMLElement, frames: Keyframe[], duration: number, cleanup = (): void => {}): void {
    const animation = node.animate(frames, { duration, easing: EASING });
    this.animations.set(animation, cleanup);
    animation.onfinish = () => {
      this.animations.delete(animation);
      cleanup();
    };
  }

  play(root: HTMLElement, before: Snapshot, reduced: boolean, dropped = false): void {
    if (this.scrolling || reduced) return;
    const after = this.measure(root);
    const viewport = root.getBoundingClientRect();
    // All layout reads precede animation/style writes.
    for (const [id, next] of after) {
      const previous = before.get(id);
      if (!previous) {
        this.animate(next.node, [{ opacity: 0 }, { opacity: 1 }], 120);
        continue;
      }
      const dy = previous.rect.top - next.rect.top;
      const dx = previous.rect.left - next.rect.left;
      if (Math.abs(dy) < 1 && Math.abs(dx) < 1) continue;
      const crossGroup = previous.group !== next.group;
      if (Math.abs(dy) > Math.min(240, viewport.height / 2)) {
        this.fadeOut(root, previous, viewport);
        this.animate(next.node, [{ opacity: 0 }, { opacity: 1 }], 120);
      } else {
        this.animate(next.node, [
          { transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' },
        ], dropped ? 160 : crossGroup ? 240 : 200);
      }
    }
    for (const [id, previous] of before) {
      if (!after.has(id)) this.fadeOut(root, previous, viewport);
    }
  }

  private fadeOut(root: HTMLElement, previous: Position, viewport: DOMRect): void {
    const ghost = previous.node.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-motion-id');
    ghost.removeAttribute('id');
    for (const node of ghost.querySelectorAll('[id]')) node.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, {
      position: 'absolute', pointerEvents: 'none', margin: '0', boxSizing: 'border-box',
      top: `${previous.rect.top - viewport.top + root.scrollTop}px`,
      left: `${previous.rect.left - viewport.left + root.scrollLeft}px`,
      width: `${previous.rect.width}px`, height: `${previous.rect.height}px`,
      transform: 'none', zIndex: '1',
    });
    root.append(ghost);
    this.animate(ghost, [{ opacity: 1 }, { opacity: 0 }], 120, () => ghost.remove());
  }
}

interface MotionProps {
  children?: ReactNode;
  context: string;
  layout: string;
  dragging: boolean;
}

/** Snapshot before React mutates the DOM, including moves between Section parents. */
export class AnimatedList extends Component<MotionProps> {
  private root = createRef<HTMLDivElement>();
  private motion = new ListMotion();
  private preference: MediaQueryList | undefined;
  private onPreference = (): void => { this.motion.cancel(); };

  componentDidMount(): void {
    this.preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.preference?.addEventListener('change', this.onPreference);
  }

  getSnapshotBeforeUpdate(previous: MotionProps): Snapshot | null {
    if (!this.root.current || previous.context !== this.props.context
      || this.props.dragging || this.preference?.matches) {
      this.motion.cancel();
      return null;
    }
    return previous.layout === this.props.layout ? null : this.motion.capture(this.root.current);
  }

  componentDidUpdate(previous: MotionProps, _state: unknown, snapshot: Snapshot | null): void {
    if (snapshot && this.root.current) {
      this.motion.play(this.root.current, snapshot, this.preference?.matches ?? false, previous.dragging);
    }
  }

  componentWillUnmount(): void {
    this.preference?.removeEventListener('change', this.onPreference);
    this.motion.dispose();
  }

  render(): ReactNode {
    return createElement('div', {
      ref: this.root, className: 'dwt-body', role: 'tabpanel',
      onScroll: () => this.motion.scroll(),
      onDragStartCapture: () => this.motion.cancel(),
    }, this.props.children);
  }
}
