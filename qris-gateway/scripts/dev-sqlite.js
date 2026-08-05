const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const node = process.execPath;

const procs = [
  {
    name: "API",
    cwd: path.join(root, "apps", "api"),
    cmd: node,
    args: [
      path.join(root, "apps", "api", "node_modules", "tsx", "dist", "cli.mjs"),
      "src/index.ts",
    ],
    env: { ...process.env, DATABASE_URL: "file:./prisma/dev.db" },
  },
  {
    name: "WEB",
    cwd: path.join(root, "apps", "web"),
    cmd: node,
    args: [
      path.join(root, "apps", "web", "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "-p",
      "3000",
    ],
    env: { ...process.env },
  },
];

for (const p of procs) {
  const child = spawn(p.cmd, p.args, {
    cwd: p.cwd,
    env: p.env,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.log(`[${p.name}] exited with code ${code}`);
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  process.exit(0);
});
