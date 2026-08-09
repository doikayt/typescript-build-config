#!/usr/bin/env node
import { runInit } from "./init.js";

const sub = process.argv[2];

if (sub === "init") {
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
