import * as github from "@actions/github";
import {Benchmark, BenchmarkHistory, Opts} from "../types";
import {getGithubEventData, GithubActionsEventData, parseBranchFromRef, getDefaultBranch} from "../utils";
import {isGaRun} from "../github/context";

export async function resolveCompare(history: BenchmarkHistory, opts: Opts): Promise<Benchmark | null> {
  // compare may be a branch or commit
  if (opts.compare) {
    // If compare is a branch
    const branchBenchmarks = history.benchmarks[opts.compare];
    if (branchBenchmarks) {
      // TODO: Return latest based on time, git history or ordering?
      return getLatestBenchmarkInBranch(branchBenchmarks);
    }

    for (const benchmarks of Object.values(history.benchmarks)) {
      const benchmark = benchmarks.find((b) => b.commitSha === opts.compare);
      if (benchmark) {
        return benchmark;
      }
    }

    throw Error(`No benchmark found for branch or commit ${opts.compare}`);
  }

  // In GA CI figure out what to compare against with github actions events
  if (isGaRun()) {
    switch (github.context.eventName) {
      case "pull_request": {
        const eventData = getGithubEventData<GithubActionsEventData["pull_request"]>();
        // TODO: parse ref to be `/refs/heads/$branch`
        const baseBranch = eventData.pull_request.base.ref;
        return getLatestBenchmarkInBranch(history.benchmarks[baseBranch] ?? []);
      }

      case "push": {
        const branch = parseBranchFromRef(github.context.ref);
        const eventData = getGithubEventData<GithubActionsEventData["push"]>();

        // Return commit sha of the previous commit if available
        const branchBenchmarks = history.benchmarks[branch] || [];
        const prevCommitBench = branchBenchmarks.find((b) => b.commitSha === eventData.before);

        return prevCommitBench || getLatestBenchmarkInBranch(branchBenchmarks);
      }

      default:
        throw Error(`event not supported ${github.context.eventName}`);
    }
  }

  // Otherwise compare against the default branch
  const defaultBranch = await getDefaultBranch();
  return getLatestBenchmarkInBranch(history.benchmarks[defaultBranch] || []);
}

function getLatestBenchmarkInBranch(benchmarks: Benchmark[]): Benchmark | null {
  // TODO: Return latest based on time, git history or ordering?
  return benchmarks[benchmarks.length - 1] ?? null;
}
