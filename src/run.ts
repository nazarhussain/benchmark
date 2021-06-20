import * as github from "@actions/github";
import {resolveHistoryLocation, getHistory, storeHistory} from "./history";
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
  const historyLocation = resolveHistoryLocation(opts);
  const history = await getHistory(historyLocation);

  // Select prev benchmark to compare against
  const prevBench = await resolveCompare(history, opts);
  if (prevBench) {
    console.log(`Comparing results with branch '${prevBench.branch}' commit '${prevBench.commitSha}'`);
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
    branch,
    commitSha: currentCommit.commitSha,
    timestamp: currentCommit.timestamp,
    results,
  };

  // Persist new benchmark data
  const shouldPersist = await resolveShouldPersist(opts, branch);
  if (shouldPersist === true) {
    console.log(`Persisting new benchmark data for branch '${branch}' commit '${currBench.commitSha}'`);
    // Also prune and limit total entries
    appendBenchmarkToHistoryAndPrune(history, currBench, branch, opts);
    await storeHistory(historyLocation, history);
  }

  const resultsComp = computeBenchComparision(currBench, prevBench, opts.threshold);

  if (isGaRun()) {
    await postGaComment(resultsComp);
  }

  if (resultsComp.someFailed) {
    throw Error("Performance regression");
  }
}
