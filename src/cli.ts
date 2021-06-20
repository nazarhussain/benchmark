import {run} from "./index";

run({
  fileGlob: "test/**/*.perf.ts",
  threshold: 2,
  historyLocal: true,
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
