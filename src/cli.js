#!/usr/bin/env node
// Main CLI entry for this package, registered as the `typescript-build-config`
// bin. Invoked as `npx @doikayt/typescript-build-config <subcommand>` — npx
// resolves the bin whose name matches the package. argv[2] is the subcommand
// (argv[0]=node, argv[1]=this file). This dispatcher is the seam where future
// subcommands (e.g. `check-conventions`) plug in.
import { runInit } from "./init.js";
import { runNew } from "./new-package.js";

const sub = process.argv[2];

if (sub === "init") {
  // runInit is async (it prompts via readline); translate resolve/reject into
  // process exit codes so the shell sees success/failure.
  runInit().then(
    () => process.exit(0),
    (err) => {
      console.error(err?.message ?? err);
      process.exit(1);
    },
  );
} else if (sub === "new") {
  // `npm init -y` + @doikayt scope. Synchronous (spawnSync).
  try {
    runNew();
    process.exit(0);
  } catch (err) {
    console.error(err?.message ?? err);
    process.exit(1);
  }
} else {
  console.error(
    `Unknown command: ${sub ?? "(none)"}\n` +
      `Usage: typescript-build-config <new|init>`,
  );
  process.exit(1);
}
