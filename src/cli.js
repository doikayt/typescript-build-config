#!/usr/bin/env node
// Main CLI entry for this package, registered as the `typescript-build-config`
// bin. Invoked as `npx @doikayt/typescript-build-config <subcommand>` — npx
// resolves the bin whose name matches the package. argv[2] is the subcommand
// (argv[0]=node, argv[1]=this file). Today the only subcommand is `init`; this
// dispatcher is the seam where future ones (e.g. `check-conventions`) plug in.
import { runInit } from "./init.js";

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
} else {
  console.error(
    `Unknown command: ${sub ?? "(none)"}\nUsage: typescript-build-config init`,
  );
  process.exit(1);
}
