#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const inputs = [
  "Dockerfile", ".dockerignore", "package.json", "package-lock.json",
  "tsconfig.json", "tsconfig.build.json", "src",
];

async function sha256(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function main() {
  const [ref, platform, destination, ...extra] = process.argv.slice(2);
  if (!ref || !platform || !destination || extra.length)
    throw new Error("Usage: node mcp/noticeflow/scripts/build-image.ts COMMIT linux/amd64|linux/arm64 OUTPUT_DIRECTORY");
  if (!["linux/amd64", "linux/arm64"].includes(platform))
    throw new Error("UNSUPPORTED_PLATFORM");
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  let revision: string;
  try {
    revision = execFileSync("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("INVALID_REVISION");
  }
  const missing = [];
  let ancestor = resolve(destination);
  while (!existsSync(ancestor)) {
    missing.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  const output = resolve(realpathSync(ancestor), ...missing);
  const within = relative(root, output);
  const outside = within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within);
  if (!outside && !within.startsWith(`tmp${sep}`))
    throw new Error("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY_OR_IN_TMP");
  if (existsSync(output)) throw new Error("OUTPUT_EXISTS");
  const context = mkdtempSync(join(tmpdir(), "noticeflow-build-"));
  try {
    // Archive the commit, never the working directory or deployment profile.
    const archive = execFileSync("git", ["archive", `${revision}:mcp/noticeflow`, ...inputs], {
      cwd: root, maxBuffer: 16 * 1024 * 1024,
    });
    execFileSync("tar", ["-xf", "-", "-C", context], { input: archive });
    mkdirSync(output, { recursive: true, mode: 0o700 });
    const architecture = platform.split("/")[1];
    const image = `noticeflow:git-${revision}-${architecture}`;
    execFileSync("docker", [
      "buildx", "build", "--platform", platform, "--tag", image,
      "--label", `org.opencontainers.image.revision=${revision}`, "--load", context,
    ], { stdio: "inherit" });
    const built: {
      Id: string; Os: string; Architecture: string;
      Config: { Labels?: Record<string, string> };
    } = JSON.parse(execFileSync("docker", ["image", "inspect", "--format", "{{json .}}", image], { encoding: "utf8" }));
    if (built.Os !== "linux" || built.Architecture !== architecture ||
        built.Config.Labels?.["org.opencontainers.image.revision"] !== revision)
      throw new Error("IMAGE_IDENTITY_MISMATCH");
    execFileSync("docker", ["image", "save", "--output", join(output, "image.tar"), image], { stdio: "inherit" });
    writeFileSync(join(output, "bundle.json"), JSON.stringify({
      revision, platform, image, buildImageId: built.Id,
      archive: "image.tar", sha256: await sha256(join(output, "image.tar")),
    }, null, 2) + "\n", { mode: 0o600 });
    const checksums = [];
    for (const name of ["image.tar", "bundle.json"])
      checksums.push(`${await sha256(join(output, name))}  ${name}`);
    // This file marks a completed bundle. A failed build leaves no marker.
    writeFileSync(join(output, "SHA256SUMS"), checksums.join("\n") + "\n", { mode: 0o600 });
    console.log(`Bundle ready: ${output}\nCommit: ${revision}\nImage: ${image}`);
  } finally {
    rmSync(context, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "IMAGE_BUILD_FAILED");
  process.exitCode = 1;
}
