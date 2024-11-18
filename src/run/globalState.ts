import {BenchmarkResult, BenchmarkOpts} from "../types";

// We have to use `object` type as we store results for different test runners each have different type
// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyTestRunnerSuit = object;

/**t
 * Map of results by root suite.
 * Before running mocha, you must register the root suite here
 */
export const resultsByRootSuite = new WeakMap<AnyTestRunnerSuit, Map<string, BenchmarkResult>>();

/**
 * Global opts from CLI
 */
export const optsByRootSuite = new WeakMap<AnyTestRunnerSuit, BenchmarkOpts>();

/**
 * Map to persist options set in describe blocks
 */
export const optsMap = new Map<AnyTestRunnerSuit, BenchmarkOpts>();
