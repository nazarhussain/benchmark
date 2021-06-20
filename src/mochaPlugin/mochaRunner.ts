// eslint-disable-next-line import/no-extraneous-dependencies
import Mocha from "mocha";
import {resultsByRootSuite} from ".";
import {lookupFiles} from "./lookupFiles";
import {benchmarkReporterWithPrev} from "./reporter";
import {Benchmark, BenchmarkResult, Opts} from "../types";

export async function runMochaBenchmark(opts: Opts, prevBench: Benchmark | null): Promise<BenchmarkResult[]> {
  const mocha = new Mocha({
    reporter: benchmarkReporterWithPrev(prevBench, opts.threshold),
    // rootHooks: mochaHooks,
  });

  // Register mocha root suite to append results on it() blocks
  const results: BenchmarkResult[] = [];
  resultsByRootSuite.set(mocha.suite, results);

  const files = lookupFiles(opts.fileGlob, [".js", ".ts"], true);
  for (const file of files) {
    mocha.addFile(file);
  }

  // Run the tests.
  await new Promise<void>((resolve, reject) => {
    mocha.run(function (failures) {
      // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
      if (failures > 0) {
        reject(Error("Some tests failed"));
      } else {
        resolve();
      }
    });
  });

  return results;
}
