import {BenchmarkComparision, ResultComparision} from "../types";

type CommitsSha = Pick<BenchmarkComparision, "currCommitSha" | "prevCommitSha">;

export function renderComment(benchComp: BenchmarkComparision): string {
  const badbenchComp = benchComp.results.filter((r) => r.isFailed);

  const topSection = benchComp.someFailed
    ? // If there was any bad benchmark print a table only with the bad results
      `# :warning: **Performance Alert** :warning:

Possible performance regression was detected for some benchmarks.
Benchmark result of this commit is worse than the previous benchmark result exceeding threshold.
  
${renderBenchmarkTable(badbenchComp, benchComp)}
`
    : // Otherwise, just add a title
      "# Performance Report";

  // For all cases attach the full benchmarks
  return `${topSection}

<details>

${renderBenchmarkTable(benchComp.results, benchComp)}

</details>
`;
}

function renderBenchmarkTable(benchComp: ResultComparision[], {currCommitSha, prevCommitSha}: CommitsSha) {
  function toRow(arr: (number | string)[]): string {
    const row = arr.map((e) => `\`${e}\``).join(" | ");
    return `| ${row} |`;
  }

  const rows = benchComp.map((result) => {
    const {id, prevAverageNs, currAverageNs, ratio} = result;

    if (prevAverageNs != undefined && ratio != undefined) {
      return toRow([id, prettyTimeStr(currAverageNs), prettyTimeStr(prevAverageNs), ratio.toFixed(2)]);
    } else {
      return toRow([id, prettyTimeStr(currAverageNs)]);
    }
  });

  return `| Benchmark suite | Previous: ${prevCommitSha} | Current: ${currCommitSha} | Ratio |
|-|-|-|-|
${rows.join("\n")}
`;
}

function prettyTimeStr(nanoSec: number) {
  const [value, unit] = prettyTime(nanoSec);
  return `${value.toPrecision(5)} ${unit}`;
}

function prettyTime(nanoSec: number): [number, string] {
  if (nanoSec > 1e9) return [nanoSec / 1e9, " s"];
  if (nanoSec > 1e6) return [nanoSec / 1e6, "ms"];
  if (nanoSec > 1e3) return [nanoSec / 1e3, "us"];
  return [nanoSec, "ns"];
}
