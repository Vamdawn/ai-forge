import type { Channel } from "./channel.js";
import type { Store } from "./store.js";
import { log, type Logger } from "./log.js";
export class DeliveryWorker {
  private timer?: ReturnType<typeof setInterval>;
  private active = new Set<Promise<void>>();
  private pausedUntil: number;
  private stopping = false;
  constructor(
    private store: Store,
    private channels: ReadonlyMap<string, Channel>,
    private now: () => number = () => Date.now(),
    private logger: Logger = log,
  ) {
    this.pausedUntil = store.state("restore_pause") ? now() + 60000 : 0;
  }
  get running() {
    return Boolean(this.timer) && !this.stopping;
  }
  start() {
    if (this.timer) return;
    this.stopping = false;
    this.timer = setInterval(() => {
      void this.runOnce().catch(() =>
        this.logger({ errorCode: "WORKER_ERROR" }),
      );
    }, 250);
    void this.runOnce().catch(() => this.logger({ errorCode: "WORKER_ERROR" }));
  }
  async runOnce() {
    if (this.stopping || this.active.size >= 4 || this.now() < this.pausedUntil)
      return;
    if (this.pausedUntil) {
      this.store.setState("restore_pause", undefined);
      this.pausedUntil = 0;
    }
    const leases = this.store.claim(this.now(), 4 - this.active.size);
    const started: Promise<void>[] = [];
    for (const lease of leases) {
      const channel = this.channels.get(lease.plan.channel);
      if (!channel) throw new Error("UNKNOWN_CHANNEL");
      if (!this.store.beginSend(lease, this.now())) continue;
      // No asynchronous gap between the last lease check and starting the HTTP request.
      const request = channel.send(lease.plan).then((outcome) => {
        const result = this.store.finish(lease, outcome, this.now());
        if (result)
          this.logger({
            notificationId: result.notificationId,
            deliveryId: result.id,
            topic: result.topic,
            status: result.status,
            attempts: result.attempts,
            ...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
          });
      });
      const tracked = request.finally(() => this.active.delete(tracked));
      this.active.add(tracked);
      started.push(tracked);
    }
    await Promise.all(started);
  }
  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await Promise.allSettled(this.active);
  }
}
