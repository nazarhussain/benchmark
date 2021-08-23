import {BenchmarkResult} from "../types";

export type BenchmarkOpts = {
  runs?: number;
  maxMs?: number;
  minMs?: number;
  // For mocha
  only?: boolean;
  skip?: boolean;
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
  opts: BenchmarkRunOptsWithFn<T, T2>
): Promise<{result: BenchmarkResult; runsNs: bigint[]}> {
  const runs = opts.runs || 512;
  const maxMs = opts.maxMs || 2000;
  const minMs = opts.minMs || 100;

  const runsNs: bigint[] = [];

  const startRunMs = Date.now();
  let i = 0;

  const inputAll = opts.before ? await opts.before() : (undefined as unknown as T2);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ellapsedMs = Date.now() - startRunMs;
    // Exceeds time limit, stop
    if (ellapsedMs > maxMs) break;
    // Exceeds target runs + min time
    if (i++ >= runs && ellapsedMs > minMs) break;

    const input = opts.beforeEach ? await opts.beforeEach(inputAll, i) : (undefined as unknown as T);

    const startNs = process.hrtime.bigint();
    await opts.fn(input);
    const endNs = process.hrtime.bigint();

    runsNs.push(endNs - startNs);
  }

  const average = averageBigint(runsNs);
  const averageNs = Number(average);

  return {
    result: {id: opts.id, averageNs, runsDone: i - 1, totalMs: Date.now() - startRunMs},
    runsNs,
  };
}

function averageBigint(arr: bigint[]): bigint {
  const total = arr.reduce((total, value) => total + value);
  return total / BigInt(arr.length);
}
