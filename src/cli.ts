// Must not use `* as yargs`, see https://github.com/yargs/yargs/issues/1131
import yargs from "yargs";
import {loadOptions} from "./utils/mochaCliExports";
import {options, optionsDefault} from "./options";
import {run} from "./run";
import {Opts} from "./types";

/**
 * Common factory for running the CLI and running integration tests
 * The CLI must actually be executed in a different script
 */
const argv = process.argv.slice(2);

const args = loadOptions(argv);

yargs
  .env("BENCHMARK")
  .scriptName("benchmark")
  .command({
    command: ["$0 [spec..]", "inspect"],
    describe: "Run benchmarks",
    handler: (argv) => run({threshold: optionsDefault.threshold, ...argv} as Opts),
  })

  .parserConfiguration({
    // As of yargs v16.1.0 dot-notation breaks strictOptions()
    // Manually processing options is typesafe tho more verbose
    "dot-notation": false,
    // From mocha
    "combine-arrays": true,
    "short-option-groups": false,
    "strip-aliased": true,
  })
  .options(options)
  .usage(
    `Benchmark runner to track performance.

  benchmark --local 'test/**/*.perf.ts'
`
  )
  .epilogue(`For more information, check the CLI reference _TBD_`)
  .alias("h", "help")
  .alias("v", "version")
  .recommendCommands()
  .fail((msg, err) => {
    if (msg) {
      // Show command help message when no command is provided
      if (msg.includes("Not enough non-option arguments")) {
        yargs.showHelp();
        // eslint-disable-next-line no-console
        console.log("\n");
      }
    }

    const errorMessage = err ? err.stack || err.message : msg || "Unknown error";

    // eslint-disable-next-line no-console
    console.error(` ✖ ${errorMessage}\n`);
    process.exit(1);
  })
  .config(args)
  .parse(args._);
