import * as github from "@actions/github";
import {Benchmark, BenchmarkHistory, Opts} from "../types";
import {
  getGithubEventData,
  GithubActionsEventData,
  parseBranchFromRef,
  getDefaultBranch,
  getBranchLatestCommit,
  getBranchCommitList,
} from "../utils";
import {isGaRun} from "../github/context";
import {IHistoryProvider} from "../history/provider";
import {validateBenchmarkResults} from "../history/schema";

/** Number of commits to consider when finding benchmark data on a branch */
const COMMIT_COUNT_LOOKBACK = 100;

enum CompareWithType {
  latestCommitInBranch = "latestCommitInBranch",
  exactCommit = "exactCommit",
}

export type CompareWith =
  | {type: CompareWithType.latestCommitInBranch; branch: string; before?: string}
  | {type: CompareWithType.exactCommit; commitSha: string};

export async function resolveCompare(provider: IHistoryProvider, opts: Opts): Promise<Benchmark | null> {
  const compareWith = await resolveCompareWith(opts);
  const prevBench = await resolvePrevBenchmark(compareWith, provider);

  if (!prevBench) return null;

  validateBenchmarkResults(prevBench.results);

  return prevBench;
}

export async function resolvePrevBenchmark(
  compareWith: CompareWith,
  provider: IHistoryProvider
): Promise<Benchmark | null> {
  switch (compareWith.type) {
    case CompareWithType.exactCommit:
      return await provider.readCommit(compareWith.commitSha);

    case CompareWithType.latestCommitInBranch: {
      // Try first latest commit in branch
      const latestCommitSha = await getBranchLatestCommit(compareWith.branch);
      const latestCommit = await provider.readCommit(latestCommitSha);
      if (latestCommit) return latestCommit;

      // List some commits in branch and look for matches
      const branchCommits = await getBranchCommitList(compareWith.branch, COMMIT_COUNT_LOOKBACK);
      const commitsWithBenchArr = await provider.listCommits();
      const commitsWithBenchSet = new Set(commitsWithBenchArr);
      for (const commitSha of branchCommits) {
        if (commitsWithBenchSet.has(commitSha)) {
          return await provider.readCommit(commitSha);
        }
      }

      // TODO: Try something else?

      return null;
    }
  }
}

export async function resolveCompareWith(opts: Opts): Promise<CompareWith> {
  // compare may be a branch or commit
  if (opts.compareBranch) {
    return {type: CompareWithType.latestCommitInBranch, branch: opts.compareBranch};
  }

  if (opts.compareCommit) {
    return {type: CompareWithType.exactCommit, commitSha: opts.compareCommit};
  }

  // In GA CI figure out what to compare against with github actions events
  if (isGaRun()) {
    switch (github.context.eventName) {
      case "pull_request": {
        const eventData = getGithubEventData<GithubActionsEventData["pull_request"]>();
        console.log(eventData);

        const baseRef = eventData.pull_request.base.ref;
        const baseBranch = parseBranchFromRef(baseRef);
        return {type: CompareWithType.latestCommitInBranch, branch: baseBranch};
      }

      case "push": {
        const eventData = getGithubEventData<GithubActionsEventData["push"]>();
        console.log(eventData);

        const branch = parseBranchFromRef(github.context.ref);
        return {type: CompareWithType.latestCommitInBranch, branch: branch, before: eventData.before};
      }

      default:
        throw Error(`event not supported ${github.context.eventName}`);
    }
  }

  // Otherwise compare against the default branch
  const defaultBranch = await getDefaultBranch();
  return {type: CompareWithType.latestCommitInBranch, branch: defaultBranch};
}
