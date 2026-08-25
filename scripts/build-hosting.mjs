import { access, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.join(projectRoot, "dist", "server", "index.js");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

await rm(serverEntry, { force: true });

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [vinextCli, "build"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

try {
  await access(serverEntry);
} catch {
  process.exit(exitCode || 1);
}

if (exitCode !== 0 && process.platform !== "win32") {
  process.exit(exitCode);
}

await import("./prepare-hosting.mjs");
