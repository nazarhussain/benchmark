import {BenchmarkResult} from "../types";

export type BenchmarkOpts = {
  /** Max number of fn() runs, after which the benchmark stops */
  maxRuns?: number;
  /** Min number of fn() runs before considering stopping the benchmark after converging */
  minRuns?: number;
  /** Max total miliseconds of runs, after which the benchmark stops */
  maxMs?: number;
  /** Min total miiliseconds of runs before considering stopping the benchmark after converging */
  minMs?: number;
  /** Minimum real benchmark function run time before starting to count towards results. Set to 0 to not warm-up */
  warmUpMs?: number;
  /** Convergance factor (0,1) at which the benchmark automatically stops. Set to 1 to disable */
  convergeFactor?: number;
  /** If fn() contains a foor loop repeating a task N times, you may set runsFactor = N to scale down the results. */
  runsFactor?: number;
  /** Run `sleep(0)` after each fn() call. Use when the event loop needs to tick to free resources created by fn() */
  yieldEventLoopAfterEach?: boolean;
  // For mocha
  only?: boolean;
  skip?: boolean;
  timeout?: number;
  // For reporter
  /** Customize the threshold for this specific benchmark. Set to Infinity to disable it */
  threshold?: number;
  /** Equivalent to setting threshold = Infinity */
  noThreshold?: boolean;
};

export type BenchmarkRunOpts = BenchmarkOpts & {
  id: string;
};

export type BenchmarkRunOptsWithFn<T, T2> = BenchmarkOpts & {
  id: string;
  fn: (arg: T) => void | Promise<void>;
  before?: () => T2 | Promise<T2>;
  beforeEach?: (arg: T2, i: number) => T | Promise<T>;
};

export async function runBenchFn<T, T2>(
  opts: BenchmarkRunOptsWithFn<T, T2>,
  persistRunsNs?: boolean
): Promise<{result: BenchmarkResult; runsNs: bigint[]}> {
  const minRuns = opts.minRuns || 1;
  const maxRuns = opts.maxRuns || Infinity;
  const maxMs = opts.maxMs || Infinity;
  const minMs = opts.minMs || 100;
  const warmUpMs = opts.warmUpMs !== undefined ? opts.warmUpMs : 500;
  const convergeFactor = opts.convergeFactor || 0.5 / 100; // 0.5%
  const runsFactor = opts.runsFactor || 1;
  const warmUpNs = BigInt(warmUpMs) * BigInt(1e6);
  const sampleEveryMs = 100;

  const runsNs: bigint[] = [];
  const startRunMs = Date.now();

  let runIdx = 0;
  let totalNs = BigInt(0);
  let totalWarmUpNs = BigInt(0);
  let prevAvg0 = 0;
  let prevAvg1 = 0;
  let lastConvergenceSample = startRunMs;

  const inputAll = opts.before ? await opts.before() : (undefined as unknown as T2);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ellapsedMs = Date.now() - startRunMs;
    const mustStop = ellapsedMs >= maxMs || runIdx >= maxRuns;
    const mayStop = ellapsedMs > minMs && runIdx > minRuns;
    // Exceeds limits, must stop now
    if (mustStop) {
      break;
    }

    const input = opts.beforeEach ? await opts.beforeEach(inputAll, runIdx) : (undefined as unknown as T);

    const startNs = process.hrtime.bigint();
    await opts.fn(input);
    const endNs = process.hrtime.bigint();

    const runNs = endNs - startNs;

    // Useful when the event loop needs to tick to free resources created by fn()
    if (opts.yieldEventLoopAfterEach) {
      await new Promise((r) => setTimeout(r, 0));
    }

    if (totalWarmUpNs < warmUpNs) {
      // Warm-up, do not count towards results
      totalWarmUpNs += runNs;
    } else {
      // Persist results
      runIdx += 1;
      totalNs += runNs;
      // If the caller wants the exact times of all runs, persist them
      if (persistRunsNs) runsNs.push(runNs);

      // When is a good time to stop a benchmark? A naive answer is after N miliseconds or M runs.
      // This code aims to stop the benchmark when the average fn run time has converged at a value
      // within a given convergence factor. To prevent doing expensive math to often for fast fn,
      // it only takes samples every `sampleEveryMs`. It stores two past values to be able to compute
      // a very rough linear and quadratic convergence.
      if (Date.now() - lastConvergenceSample > sampleEveryMs) {
        lastConvergenceSample = Date.now();
        const avg = Number(totalNs / BigInt(runIdx));

        // Compute convergence (1st order + 2nd order)
        const a = prevAvg0;
        const b = prevAvg1;
        const c = avg;

        // Only do convergence math if it may stop
        if (mayStop) {
          // Aprox linear convergence
          const convergence1 = Math.abs(c - a);
          // Aprox quadratic convergence
          const convergence2 = Math.abs(b - (a + c) / 2);
          // Take the greater of both to enfore linear and quadratic are below convergeFactor
          const convergence = Math.max(convergence1, convergence2) / a;

          // Okay to stop + has converged, stop now
          if (convergence < convergeFactor) {
            break;
          }
        }

        prevAvg0 = prevAvg1;
        prevAvg1 = avg;
      }
    }
  }

  if (runIdx === 0) {
    throw Error("No run was completed in time");
  }

  const averageNs = Number(totalNs / BigInt(runIdx)) / runsFactor;

  return {
    result: {
      id: opts.id,
      averageNs,
      runsDone: runIdx,
      totalMs: Date.now() - startRunMs,
      threshold: opts.noThreshold === true ? Infinity : opts.threshold,
    },
    runsNs,
  };
}
