import {FileCollectionOptions} from "./utils/mochaCliExports";

export type Opts = Partial<FileCollectionOptions> & {
  defaultBranch?: string;
  persistBranches?: string[];
  benchmarksPerBranch?: number;
  threshold: number;
  compareBranch?: string;
  compareCommit?: string;
  prune?: boolean;
  persist?: boolean;
  historyLocal?: string | boolean;
  historyGaCache?: string | boolean;
  historyS3?: boolean;
};

export type BenchmarkResults = BenchmarkResult[];

/** Time results for a single benchmark item */
export type BenchmarkResult = {
  id: string;
  averageNs: number;
  runsDone: number;
  totalMs: number;
};

/** Time results for a single benchmark (all items) */
export type Benchmark = {
  commitSha: string;
  results: BenchmarkResults;
};

/** All benchmarks organized by branch */
export type BenchmarkHistory = {
  benchmarks: {
    [branch: string]: Benchmark[];
  };
};

export type BenchmarkComparision = {
  currCommitSha: string;
  prevCommitSha: string | null;
  someFailed: boolean;
  results: ResultComparision[];
};

export type ResultComparision = {
  id: string;
  currAverageNs: number;
  prevAverageNs: number | null;
  ratio: number | null;
  isFailed: boolean;
};

/** Github API type */
type GitHubUser = {
  email?: string;
  name: string;
  username: string;
};

/** Github API type */
type Commit = {
  author: GitHubUser;
  committer: GitHubUser;
  distinct?: unknown; // Unused
  id: string;
  message: string;
  timestamp: string;
  tree_id?: unknown; // Unused
  url: string;
};
