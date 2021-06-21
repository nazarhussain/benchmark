import {BenchmarkResult} from "../types";

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
