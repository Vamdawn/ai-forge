import {
  chmodSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  closeSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import { Store, validateDatabase } from "./store.js";
export function syncPath(path: string) {
  const file = openSync(path, "r");
  try {
    fsyncSync(file);
  } finally {
    closeSync(file);
  }
}
export function listBackups(directory: string) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) =>
      /^noticeflow-\d{4}-\d{2}-\d{2}T[\d-]+Z-[\da-f-]+\.sqlite$/.test(file),
    )
    .sort()
    .reverse();
}
export async function createBackup(
  store: Store,
  directory: string,
  now = Date.now(),
) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const name = `noticeflow-${new Date(now).toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.sqlite`;
  const temporary = join(directory, `.${name}.tmp`);
  const destination = join(directory, name);
  try {
    await store.backup(temporary);
    chmodSync(temporary, 0o600);
    validateDatabase(temporary, store.vault);
    syncPath(temporary);
    renameSync(temporary, destination);
    syncPath(directory);
    store.setState("last_backup_day", new Date(now).toISOString().slice(0, 10));
    for (const file of listBackups(directory).slice(7))
      unlinkSync(join(directory, file));
    return { file: name };
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}
export function startMaintenance(
  store: Store,
  config: Config,
  logger: (record: { errorCode: string }) => void,
) {
  let busy: Promise<void> | undefined;
  const run = () => {
    if (busy) return;
    busy = (async () => {
      const today = new Date().toISOString().slice(0, 10);
      if (store.state("last_cleanup_day") !== today) {
        store.cleanup(Date.now());
        store.setState("last_cleanup_day", today);
      }
      if (store.state("last_backup_day") !== today)
        await createBackup(store, config.storage.backupDir);
    })()
      .catch(() => logger({ errorCode: "MAINTENANCE_FAILED" }))
      .finally(() => {
        busy = undefined;
      });
  };
  const timer = setInterval(run, 60000);
  run();
  return async () => {
    clearInterval(timer);
    await busy;
  };
}

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute } from "node:path";
import { flockSync } from "fs-ext";
import {
  prepareRestoredDatabase,
  readCooldowns,
  verifyRestoredDatabase,
} from "./store.js";
import type { Vault } from "./crypto.js";
interface RestoreMarker {
  id: string;
  stage: "prepared" | "preserved" | "ready" | "installed" | "rollback";
  temporary: string;
  preservedDirectory: string;
  files: string[];
  cooldownsRecovered: boolean;
}
function saveMarker(path: string, marker: RestoreMarker) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(marker), { mode: 0o600 });
  syncPath(temporary);
  renameSync(temporary, path);
  syncPath(dirname(path));
}
function removeDatabaseFiles(path: string) {
  for (const suffix of ["-wal", "-shm", ""])
    if (existsSync(path + suffix)) unlinkSync(path + suffix);
  syncPath(dirname(path));
}
export function restoreBackup(config: Config, vault: Vault, backup: string) {
  const path = config.storage.sqlitePath;
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = openSync(`${path}.lock`, "a", 0o600);
  try {
    flockSync(lock, "exnb");
    const markerPath = `${path}.restore.json`;
    let marker: RestoreMarker;
    if (existsSync(markerPath))
      marker = JSON.parse(readFileSync(markerPath, "utf8"));
    else {
      const id = randomUUID();
      const temporary = join(directory, `.restore-${id}.sqlite`);
      const source = isAbsolute(backup)
        ? backup
        : join(config.storage.backupDir, backup);
      copyFileSync(source, temporary);
      chmodSync(temporary, 0o600);
      prepareRestoredDatabase(temporary, vault, id);
      syncPath(temporary);
      marker = {
        id,
        stage: "prepared",
        temporary,
        preservedDirectory: join(directory, `.preserved-${id}`),
        files: ["", "-wal", "-shm"].filter((suffix) =>
          existsSync(path + suffix),
        ),
        cooldownsRecovered: false,
      };
      saveMarker(markerPath, marker);
    }
    if (marker.stage === "prepared") {
      mkdirSync(marker.preservedDirectory, { recursive: true, mode: 0o700 });
      for (const suffix of marker.files) {
        const copy = join(marker.preservedDirectory, basename(path) + suffix);
        copyFileSync(path + suffix, copy);
        chmodSync(copy, 0o600);
        syncPath(copy);
      }
      syncPath(marker.preservedDirectory);
      syncPath(directory);
      marker.stage = "preserved";
      saveMarker(markerPath, marker);
    }
    if (marker.stage === "preserved") {
      let cooldowns: ReturnType<typeof readCooldowns> = [];
      try {
        cooldowns = readCooldowns(path, Date.now());
        marker.cooldownsRecovered = true;
      } catch {
        marker.cooldownsRecovered = false;
      }
      prepareRestoredDatabase(marker.temporary, vault, marker.id, cooldowns);
      syncPath(marker.temporary);
      marker.stage = "ready";
      saveMarker(markerPath, marker);
    }
    if (marker.stage === "ready") {
      if (existsSync(marker.temporary)) {
        verifyRestoredDatabase(marker.temporary, vault, marker.id);
        removeDatabaseFiles(path);
        renameSync(marker.temporary, path);
        syncPath(path);
        syncPath(directory);
      } else {
        try {
          verifyRestoredDatabase(path, vault, marker.id);
        } catch {
          marker.stage = "rollback";
          saveMarker(markerPath, marker);
        }
      }
      if (marker.stage !== "rollback") {
        marker.stage = "installed";
        saveMarker(markerPath, marker);
      }
    }
    if (marker.stage === "rollback") {
      removeDatabaseFiles(path);
      for (const suffix of marker.files) {
        copyFileSync(
          join(marker.preservedDirectory, basename(path) + suffix),
          path + suffix,
        );
        syncPath(path + suffix);
      }
      syncPath(directory);
      prepareRestoredDatabase(path, vault, marker.id);
      syncPath(path);
      syncPath(directory);
    }
    verifyRestoredDatabase(path, vault, marker.id);
    unlinkSync(markerPath);
    syncPath(directory);
    return {
      status: marker.stage === "rollback" ? "rolled_back" : "restored",
      preservedDirectory: marker.preservedDirectory,
      cooldownsRecovered: marker.cooldownsRecovered,
    };
  } finally {
    closeSync(lock);
  }
}
