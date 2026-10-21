import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/build-image.ts", import.meta.url));

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "noticeflow-image-"));
  const repo = join(directory, "repo");
  const bin = join(directory, "bin");
  const output = join(directory, "release with spaces");
  mkdirSync(join(repo, "mcp/noticeflow/src"), { recursive: true });
  mkdirSync(bin);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  git("init", "--quiet");
  for (const name of ["Dockerfile", ".dockerignore", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.build.json", "src/main.ts"])
    writeFileSync(join(repo, "mcp/noticeflow", name), "committed source\n");
  mkdirSync(join(repo, "mcp/noticeflow/prototypes"));
  writeFileSync(join(repo, "mcp/noticeflow/prototypes/demo.html"), "prototype");
  writeFileSync(join(repo, "mcp/noticeflow/config.private.yaml"), "private deployment");
  git("add", ".");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
  const revision = git("rev-parse", "HEAD");
  writeFileSync(join(repo, "mcp/noticeflow/src/main.ts"), "uncommitted source\n");
  writeFileSync(join(repo, "mcp/noticeflow/src/untracked.ts"), "untracked source\n");
  const record = join(directory, "docker.json");
  writeFileSync(join(bin, "docker"), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'buildx' && args[1] === 'build') {
  const context = args.at(-1);
  fs.writeFileSync(process.env.NOTICEFLOW_TEST_RECORD, JSON.stringify({
    args, files: fs.readdirSync(context, {recursive:true}).sort(),
    source: fs.readFileSync(path.join(context, 'src/main.ts'), 'utf8')
  }));
  if (process.env.NOTICEFLOW_TEST_FAIL) process.exit(1);
} else if (args[0] === 'image' && args[1] === 'inspect') {
  process.stdout.write(JSON.stringify({Id:'sha256:test-image', Os:'linux',
    Architecture: process.env.NOTICEFLOW_TEST_ARCH || 'amd64',
    Config:{Labels:{'org.opencontainers.image.revision':process.env.NOTICEFLOW_TEST_REVISION}}
  }));
} else if (args[0] === 'image' && args[1] === 'save') {
  fs.writeFileSync(args[args.indexOf('--output')+1], 'test-image-archive');
} else process.exit(99);
`, { mode: 0o755 });
  return {
    repo, output, record, revision,
    run(ref = revision, platform = "linux/amd64", destination = output, extra: NodeJS.ProcessEnv = {}) {
      return spawnSync(process.execPath, [script, ref, platform, destination], {
        cwd: repo, encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NOTICEFLOW_TEST_RECORD: record, NOTICEFLOW_TEST_REVISION: revision, ...extra },
      });
    },
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}

test("image bundle uses the selected commit and only runtime build inputs, with revision and checksums", (t) => {
  const f = fixture();
  t.after(f.dispose);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const build = JSON.parse(readFileSync(f.record, "utf8"));
  assert.equal(build.source, "committed source\n");
  assert.deepEqual(build.files, [".dockerignore", "Dockerfile", "package-lock.json", "package.json", "src", "src/main.ts", "tsconfig.build.json", "tsconfig.json"]);
  assert.ok(build.args.includes(`org.opencontainers.image.revision=${f.revision}`));
  assert.equal(build.args[build.args.indexOf("--platform") + 1], "linux/amd64");
  const manifest = JSON.parse(readFileSync(join(f.output, "bundle.json"), "utf8"));
  assert.equal(manifest.revision, f.revision);
  assert.equal(manifest.platform, "linux/amd64");
  assert.equal(manifest.image, `noticeflow:git-${f.revision}-amd64`);
  for (const line of readFileSync(join(f.output, "SHA256SUMS"), "utf8").trim().split("\n")) {
    const [digest, file] = line.split("  ");
    assert.equal(digest, createHash("sha256").update(readFileSync(join(f.output, file))).digest("hex"));
  }
  assert.doesNotMatch(readFileSync(join(f.output, "bundle.json"), "utf8"), /private deployment|release with spaces/);
});

test("image packaging rejects missing commits and unsupported platforms before invoking Docker", (t) => {
  const f = fixture();
  t.after(f.dispose);
  assert.match(f.run("missing-commit").stderr, /INVALID_REVISION/);
  assert.match(f.run(f.revision, "linux/ppc64le").stderr, /UNSUPPORTED_PLATFORM/);
  assert.throws(() => readFileSync(f.record));
});

test("image packaging refuses existing output and repository destinations outside tmp", (t) => {
  const f = fixture();
  t.after(f.dispose);
  mkdirSync(f.output);
  writeFileSync(join(f.output, "keep"), "existing release");
  assert.match(f.run().stderr, /OUTPUT_EXISTS/);
  assert.equal(readFileSync(join(f.output, "keep"), "utf8"), "existing release");
  assert.match(f.run(f.revision, "linux/amd64", join(f.repo, "artifacts")).stderr, /OUTPUT_MUST_BE_OUTSIDE_REPOSITORY_OR_IN_TMP/);
  assert.throws(() => readFileSync(f.record));
});

test("failed builds and mismatched images never produce a completed release bundle", (t) => {
  const f = fixture();
  t.after(f.dispose);
  for (const [name, extra] of [
    ["build", { NOTICEFLOW_TEST_FAIL: "1" }],
    ["platform", { NOTICEFLOW_TEST_ARCH: "arm64" }],
    ["revision", { NOTICEFLOW_TEST_REVISION: "wrong-revision" }],
  ] as const) {
    const output = join(f.repo, "tmp", name);
    const result = f.run(f.revision, "linux/amd64", output, extra);
    assert.notEqual(result.status, 0);
    assert.ok(readFileSync(f.record, "utf8"));
    assert.throws(() => readFileSync(join(output, "SHA256SUMS")));
  }
});
