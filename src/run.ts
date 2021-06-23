import * as github from "@actions/github";
import {getHistoryProvider} from "./history";
import {appendBenchmarkToHistoryAndPrune} from "./history/append";
import {resolveShouldPersist} from "./history/shouldPersist";
import {Benchmark, Opts} from "./types";
import {resolveCompare} from "./compare";
import {parseBranchFromRef, getCurrentCommitInfo, shell} from "./utils";
import {runMochaBenchmark} from "./mochaPlugin/mochaRunner";
import {computeBenchComparision} from "./compare/compute";
import {postGaComment} from "./github/comment";
import {isGaRun} from "./github/context";

export async function run(opts: Opts) {
  // Retrieve history
  const historyProvider = getHistoryProvider(opts);

  // Select prev benchmark to compare against
  const prevBench = await resolveCompare(historyProvider, opts);
  if (prevBench) {
    console.log(`Comparing results with commit '${prevBench.commitSha}'`);
  }

  // TODO: Forward all options to mocha
  // Run benchmarks with mocha programatically
  const results = await runMochaBenchmark(opts, prevBench);
  if (results.length === 0) {
    throw Error("No benchmark result was produced");
  }

  const refStr = github.context.ref || (await shell("git symbolic-ref HEAD"));
  const branch = parseBranchFromRef(refStr);

  const currentCommit = await getCurrentCommitInfo();
  const currBench: Benchmark = {
    commitSha: currentCommit.commitSha,
    results,
  };

  // Persist new benchmark data
  const shouldPersist = await resolveShouldPersist(opts, branch);
  if (shouldPersist === true) {
    console.log(`Persisting new benchmark data for branch '${branch}' commit '${currBench.commitSha}'`);
    // TODO: prune and limit total entries
    // appendBenchmarkToHistoryAndPrune(history, currBench, branch, opts);
    await historyProvider.writeCommit(currBench.commitSha, currBench);
  }

  const resultsComp = computeBenchComparision(currBench, prevBench, opts.threshold);

  if (isGaRun()) {
    await postGaComment(resultsComp);
  }

  if (resultsComp.someFailed) {
    throw Error("Performance regression");
  }
}
