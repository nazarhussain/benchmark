import {BenchmarkResult} from "../types";

export type BenchmarkOpts = {
  runs?: number;
  maxMs?: number;
  minMs?: number;
};

export type BenchmarkRunOpts = BenchmarkOpts & {
  id: string;
};

export type BenchmarkRunOptsWithFn<T> = BenchmarkOpts & {
  id: string;
  fn: (arg: T) => void | Promise<void>;
  beforeEach?: (i: number) => T | Promise<T>;
};

export type BenchmarkResultDetail = {
  runsNs: bigint[];
};

export async function runBenchFn<T>(
  opts: BenchmarkRunOptsWithFn<T>
): Promise<{result: BenchmarkResult; runsNs: bigint[]}> {
  const runs = opts.runs || 512;
  const maxMs = opts.maxMs || 2000;
  const minMs = opts.minMs || 100;

  const runsNs: bigint[] = [];

  const startRunMs = Date.now();
  let i = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ellapsedMs = Date.now() - startRunMs;
    // Exceeds time limit, stop
    if (ellapsedMs > maxMs) break;
    // Exceeds target runs + min time
    if (i++ >= runs && ellapsedMs > minMs) break;

    const input = opts.beforeEach ? await opts.beforeEach(i) : (undefined as unknown as T);

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
