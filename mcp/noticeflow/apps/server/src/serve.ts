import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import { flockSync } from "fs-ext";
import type { Config } from "./config.js";
import { createService } from "./service.js";
import { startMaintenance } from "./maintenance.js";
import { log } from "./log.js";
export async function serve(configPath: string, config: Config) {
  mkdirSync(dirname(config.storage.sqlitePath), {
    recursive: true,
    mode: 0o700,
  });
  const lock = openSync(`${config.storage.sqlitePath}.server.lock`, "a", 0o600);
  try {
    flockSync(lock, "exnb");
    const service = await createService(configPath);
    let stopMaintenance: (() => Promise<void>) | undefined;
    try {
      const split = config.server.listen.lastIndexOf(":");
      const host = config.server.listen.slice(0, split).replace(/^\[|\]$/g, "");
      const port = Number(config.server.listen.slice(split + 1));
      const server = service.app.listen(port, host);
      await new Promise<void>((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
      service.worker.start();
      stopMaintenance = startMaintenance(service.store, config, log);
      await new Promise<void>((resolve) => {
        const shutdown = () => {
          process.off("SIGINT", shutdown);
          process.off("SIGTERM", shutdown);
          resolve();
        };
        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });
      const deadline = setTimeout(() => server.closeAllConnections(), 12000);
      try {
        await Promise.all([
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
          service.worker.stop(),
          stopMaintenance(),
        ]);
      } finally {
        clearTimeout(deadline);
      }
    } finally {
      await stopMaintenance?.();
      await service.close();
    }
  } finally {
    closeSync(lock);
  }
}
