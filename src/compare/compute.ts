import {ResultComparision, BenchmarkComparision, Benchmark, BenchmarkResult} from "../types";

export function computeBenchComparision(
  currBench: Benchmark,
  prevBench: Benchmark | null,
  threshold: number
): BenchmarkComparision {
  const prevResults = new Map<string, BenchmarkResult>();
  if (prevBench) {
    for (const bench of prevBench.results) {
      prevResults.set(bench.id, bench);
    }
  }

  const results = currBench.results.map((currBench): ResultComparision => {
    const {id} = currBench;
    const prevBench = prevResults.get(id);

    if (prevBench) {
      const ratio = currBench.averageNs / prevBench.averageNs;
      return {
        id,
        currAverageNs: currBench.averageNs,
        prevAverageNs: prevBench.averageNs,
        ratio,
        isFailed: ratio > threshold,
      };
    } else {
      return {
        id,
        currAverageNs: currBench.averageNs,
        prevAverageNs: null,
        ratio: null,
        isFailed: false,
      };
    }
  });

  return {
    currCommitSha: currBench.commitSha,
    prevCommitSha: prevBench?.commitSha ?? null,
    someFailed: results.some((r) => r.isFailed),
    results,
  };
}
