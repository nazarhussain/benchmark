import fs from "fs";
import path from "path";
import {BenchmarkResult} from "../types";

import {BenchmarkOpts, BenchmarkRunOptsWithFn, runBenchFn} from "./runBenchFn";

/**t
 * Map of results by root suie.
 * Before running mocha, you must register the root suite here
 */
export const resultsByRootSuite = new WeakMap<Mocha.Suite, BenchmarkResult[]>();

/**
 * Map of test instance to results.
 * Required to provide results to the custom reporter
 */
export const testResults = new WeakMap<Mocha.Runnable, BenchmarkResult>();

/**
 * Map to persist options set in describe blocks
 */
const optsMap = new Map<Mocha.Suite, BenchmarkOpts>();

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function itBench<T>(opts: BenchmarkRunOptsWithFn<T>): void;
export function itBench<T>(idOrOpts: string | Omit<BenchmarkRunOptsWithFn<T>, "fn">, fn: (arg: T) => void): void;
export function itBench<T>(
  idOrOpts: string | PartialBy<BenchmarkRunOptsWithFn<T>, "fn">,
  fn?: (arg: T) => void | Promise<void>
): void {
  // TODO:
  // Implement reporter
  // Implement grouping functionality

  // if (this.averageNs === null) this.averageNs = result.averageNs;
  // result.factor = result.averageNs / this.averageNs;

  let opts: BenchmarkRunOptsWithFn<T>;
  if (typeof idOrOpts === "string") {
    if (!fn) throw Error("fn arg must be set");
    opts = {id: idOrOpts, fn};
  } else {
    if (fn) {
      opts = {...idOrOpts, fn};
    } else {
      const optsWithFn = idOrOpts as BenchmarkRunOptsWithFn<T>;
      if (!optsWithFn.fn) throw Error("opts.fn arg must be set");
      opts = optsWithFn;
    }
  }

  it(opts.id, async function () {
    const parent = getParentSuite(this);
    const optsParent = getOptsFromParent(parent);
    opts = Object.assign({}, optsParent, opts);

    // Get results array from root suite
    const rootSuite = getRootSuite(parent);
    const results = resultsByRootSuite.get(rootSuite);
    if (!results) throw Error("root suite not found");

    // Extend timeout if maxMs is set
    const timeout = this.timeout();
    if (opts.maxMs && opts.maxMs > timeout) {
      this.timeout(opts.maxMs * 1.5);
    } else if (opts.minMs && opts.minMs > timeout) {
      this.timeout(opts.minMs * 1.5);
    }

    const {result, runsNs} = await runBenchFn(opts);

    // Store result to persist to file latter
    results.push(result);

    // Store temp results for the custom reporter
    const test = this.currentTest ?? this.test;
    if (!test) throw Error("this context has not 'test' object");
    testResults.set(test, result);

    // Persist full results if requested. dir is created in `beforeAll`
    const benchmarkResultsCsvDir = process.env.BENCHMARK_RESULTS_CSV_DIR;
    if (benchmarkResultsCsvDir) {
      fs.mkdirSync(benchmarkResultsCsvDir, {recursive: true});
      const filename = `${result.id}.csv`;
      const filepath = path.join(benchmarkResultsCsvDir, filename);
      fs.writeFileSync(filepath, runsNs.join("\n"));
    }
  });
}

/**
 * Customize benchmark opts for a describe block. Affects only tests within that Mocha.Suite
 * ```ts
 * describe("suite A1", function () {
 *   setBenchOpts({runs: 100});
 *   // 100 runs
 *   itBench("bench A1.1", function() {});
 *   itBench("bench A1.2", function() {});
 *   // 300 runs
 *   itBench({id: "bench A1.3", runs: 300}, function() {});
 *
 *   // Supports nesting, child has priority over parent.
 *   // Arrow functions can be used, won't break it.
 *   describe("suite A2", () => {
 *     setBenchOpts({runs: 200});
 *     // 200 runs.
 *     itBench("bench A2.1", () => {});
 *   })
 * })
 * ```
 */
export function setBenchOpts(opts: BenchmarkOpts): void {
  before(function () {
    if (this.currentTest?.parent) {
      optsMap.set(this.currentTest?.parent, opts);
    }
  });

  after(function () {
    // Clean-up to allow garbage collection
    if (this.currentTest?.parent) {
      optsMap.delete(this.currentTest?.parent);
    }
  });
}

function getOptsFromParent(parent: Mocha.Suite): BenchmarkOpts {
  const optsArr: BenchmarkOpts[] = [];
  getOptsFromSuite(parent, optsArr);
  // Merge opts, highest parent = lowest priority
  return Object.assign({}, ...optsArr.reverse()) as BenchmarkOpts;
}

/**
 * Recursively append suite opts from child to parent.
 *
 * @returns `[suiteChildOpts, suiteParentOpts, suiteParentParentOpts]`
 */
function getOptsFromSuite(suite: Mocha.Suite, optsArr: BenchmarkOpts[]): void {
  const suiteOpts = optsMap.get(suite);
  if (suiteOpts) {
    optsArr.push(suiteOpts);
  }

  if (suite.parent) {
    getOptsFromSuite(suite.parent, optsArr);
  }
}

function getParentSuite(ctx: Mocha.Context): Mocha.Suite {
  const test = ctx.currentTest ?? ctx.test;
  if (!test) throw Error("this.test not set");
  if (!test.parent) throw Error("this.test.parent not set");
  return test.parent;
}

function getRootSuite(suite: Mocha.Suite): Mocha.Suite {
  if (!suite.parent) return suite;
  return getRootSuite(suite.parent);
}
