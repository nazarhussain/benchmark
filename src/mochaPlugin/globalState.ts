import {BenchmarkResult} from "../types";

/**t
 * Map of results by root suie.
 * Before running mocha, you must register the root suite here
 */
export const resultsByRootSuite = new WeakMap<Mocha.Suite, Map<string, BenchmarkResult>>();
