import {Benchmark} from "../types";

export interface IHistoryProvider {
  listCommits(): Promise<string[]>;
  readCommit(commitSha: string): Promise<Benchmark | null>;
  writeCommit(data: Benchmark): Promise<void>;
}

/**
 * How to organize data?
 * - Most times you want the latest benchmark in a branch:
 *   - When doing PRs against some branch
 *   - When doing commits against main branch
 *
 * Need to persist two concepts
 * - Long term history for ploting
 * - The latest commit in a branch
 *
 * /history
 *   /9f1f289fad2c8e25afdc2c169c0203c527c9a226 = csv with benchmark
 *   /c0203c527c9a2269f1f289fad2c8e25afdc2c169 = csv
 * /latest
 *   /main = csv with benchmark
 *   /dev = csv with benchmark
 *
 * In latest we can track the latest commits of many branches and would allow
 * to do benchmark comparisions on PR from feat1 -> feat2.
 *
 * In history you can ONLY track a single branch, which should be the main branch.
 *
 */
