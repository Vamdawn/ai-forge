import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("../scripts/check-compose-update.py", import.meta.url));
test("Compose guard permits only the selected image change and never prints sensitive configuration", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "noticeflow-compose-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const before = {
    name: "deployment",
    services: {
      server: {
        image: "noticeflow:old", environment: { HTTPS_PROXY: "private-proxy-secret" },
        ports: ["127.0.0.1:3000:3000"], volumes: ["./data:/data"],
        networks: ["egress"], stop_grace_period: "30s",
      },
      proxy: { image: "proxy:old" },
    },
    networks: { egress: { external: true } },
  };
  writeFileSync(join(directory, "before.json"), JSON.stringify(before));
  const run = (after: unknown, service = "server") => {
    writeFileSync(join(directory, "after.json"), JSON.stringify(after));
    const result = spawnSync("python3", [checker, join(directory, "before.json"), join(directory, "after.json"), service, "noticeflow:new"], { encoding: "utf8" });
    assert.doesNotMatch(result.stdout + result.stderr, /private-proxy-secret|HTTPS_PROXY/);
    return result;
  };
  const allowed = structuredClone(before);
  allowed.services.server.image = "noticeflow:new";
  assert.equal(run(allowed).status, 0);
  assert.notEqual(run(before).status, 0);
  assert.notEqual(run(allowed, "missing").status, 0);
  for (const edit of [
    (value: typeof allowed) => { value.services.server.environment.HTTPS_PROXY = "different-secret"; },
    (value: typeof allowed) => { value.services.server.ports = ["0.0.0.0:3000:3000"]; },
    (value: typeof allowed) => { value.services.server.volumes = ["./empty:/data"]; },
    (value: typeof allowed) => { value.services.server.networks = []; },
    (value: typeof allowed) => { value.services.server.stop_grace_period = "10s"; },
    (value: typeof allowed) => { value.services.proxy.image = "proxy:new"; },
    (value: typeof allowed) => { value.name = "different-project"; },
  ]) {
    const changed = structuredClone(allowed);
    edit(changed);
    assert.notEqual(run(changed).status, 0);
  }
  assert.notEqual(run(null).status, 0);
});
