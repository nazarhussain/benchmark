import {Options} from "yargs";
import {Opts} from "./types";
import {FileCollectionOptions} from "./utils/mochaCliExports";

export const optionsDefault = {
  threshold: 2,
  historyLocalPath: "./benchmark_history",
  historyCacheKey: "benchmark_history",
};

type ICliCommandOptions<OwnArgs> = Required<{[key in keyof OwnArgs]: Options}>;
type CliOpts = Omit<Opts, "fileGlob" | keyof FileCollectionOptions>;

export const options: ICliCommandOptions<CliOpts> = {
  persistBranches: {
    description: "Choose what branches to persist benchmark data",
    type: "array",
    defaultDescription: "default-branch",
  },
  benchmarksPerBranch: {
    description: "Limit number of benchmarks persisted per branch",
    type: "number",
    defaultDescription: "Infinity",
  },
  threshold: {
    description: "Ratio of new average time per run vs previos time per run to consider a failure",
    type: "number",
    default: optionsDefault.threshold,
  },
  compareBranch: {
    description: "Compare new benchmark data against the latest available benchmark in this branch",
    type: "string",
    defaultDescription: "default-branch",
  },
  compareCommit: {
    description: "Compare new benchmark data against the benchmark data associated with a specific commit",
    type: "string",
  },
  prune: {
    description:
      "When persisting history, delete benchmark data associated with commits that are no longer in the current git history",
    type: "boolean",
  },
  persist: {
    description: "Force persisting benchmark data in history",
    type: "boolean",
  },
  historyLocal: {
    alias: ["local"],
    description:
      "Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path",
    type: "string",
    defaultDescription: optionsDefault.historyLocalPath,
  },
  historyGaCache: {
    alias: ["ga-cache"],
    description:
      "Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key",
    type: "string",
    defaultDescription: optionsDefault.historyCacheKey,
  },
  historyS3: {
    alias: ["s3"],
    description: "Persist benchmark history in an Amazon S3 bucket. Requires Github authentication",
    type: "string",
  },
};
