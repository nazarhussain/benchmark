import * as github from "@actions/github";
import {getHistoryProvider} from "../history";
import {resolveShouldPersist} from "../history/shouldPersist";
import {validateBenchmark} from "../history/schema";
import {Benchmark, BenchmarkOpts, BenchmarkResult, Opts} from "../types";
import {renderCompareWith, resolveCompareWith, resolvePrevBenchmark} from "../compare";
import {parseBranchFromRef, getCurrentCommitInfo, shell, getCurrentBranch} from "../utils";
import {computeBenchComparision} from "../compare/compute";
import {postGaComment} from "../github/comment";
import {isGaRun} from "../github/context";
import {IHistoryProvider} from "../history/provider";

/* eslint-disable no-console */

export function connectHistoryProvider(opts: Opts & BenchmarkOpts): IHistoryProvider {
  // Retrieve history
  const historyProvider = getHistoryProvider(opts);
  console.log(`Connected to historyProvider: ${historyProvider.providerInfo()}`);

  return historyProvider;
}

export async function getBenchmark(
  opts: Opts & BenchmarkOpts,
  historyProvider: IHistoryProvider
): Promise<Benchmark | null> {
  // Sanitize opts
  if (isNaN(opts.threshold)) throw Error("opts.threshold is not a number");

  // Select prev benchmark to compare against
  const compareWith = await resolveCompareWith(opts);
  const prevBench = await resolvePrevBenchmark(compareWith, historyProvider);
  if (prevBench) {
    console.log(`Found previous benchmark for ${renderCompareWith(compareWith)}, at commit ${prevBench.commitSha}`);
    validateBenchmark(prevBench);
  } else {
    console.log(`No previous bencharmk found for ${renderCompareWith(compareWith)}`);
  }

  return prevBench;
}

export async function processBenchmark(
  opts: Opts & BenchmarkOpts,
  historyProvider: IHistoryProvider,
  prevBench: Benchmark | null,
  results: BenchmarkResult[]
): Promise<void> {
  if (results.length === 0) {
    throw Error("No benchmark result was produced");
  }

  const currentCommit = await getCurrentCommitInfo();
  const currBench: Benchmark = {
    commitSha: currentCommit.commitSha,
    results,
  };

  // Persist new benchmark data
  const currentBranch = await getCurrentBranch();
  const shouldPersist = await resolveShouldPersist(opts, currentBranch);
  if (shouldPersist === true) {
    const refStr = github.context.ref || (await shell("git symbolic-ref HEAD"));
    const branch = parseBranchFromRef(refStr);
    console.log(`Persisting new benchmark data for branch '${branch}' commit '${currBench.commitSha}'`);
    // TODO: prune and limit total entries
    // appendBenchmarkToHistoryAndPrune(history, currBench, branch, opts);
    await historyProvider.writeLatestInBranch(branch, currBench);
    await historyProvider.writeToHistory(currBench);
  }

  const resultsComp = computeBenchComparision(currBench, prevBench, opts.threshold);

  if (!opts.skipPostComment && isGaRun()) {
    await postGaComment(resultsComp);
  }

  if (resultsComp.someFailed && !opts.noThrow) {
    throw Error("Performance regression");
  }
}
