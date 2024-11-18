import fs from "fs";
import path from "path";
import process from "process";
import {parse} from "yaml";
import Ajv, {JSONSchemaType, ErrorObject} from "ajv";
import {ReporterOptions, ReporterOptionsWithAliases} from "../types";

export const optionsDefault = {
  threshold: 2,
  historyLocalPath: "./benchmark_data",
  historyCacheKey: "benchmark_data",
};

export const reporterOptionsSchema: JSONSchemaType<ReporterOptionsWithAliases> = {
  type: "object",
  required: ["threshold"],
  properties: {
    defaultBranch: {
      type: "string",
      nullable: true,
      description: "Provide the default branch of this repository to prevent fetching from Github",
    },
    persistBranches: {
      type: "array",
      items: {type: "string"},
      nullable: true,
      description: "Choose what branches to persist benchmark data",
    },
    benchmarksPerBranch: {
      type: "number",
      nullable: true,
      description: "Limit number of benchmarks persisted per branch",
    },
    threshold: {
      type: "number",
      default: 2,
      description:
        "Ratio of new average time per run vs previous time per run to consider a failure. Set to 'Infinity' to disable it.",
    },
    noThreshold: {
      type: "boolean",
      nullable: true,
      description: "Equal to settings threshold=Infinity",
    },
    compareBranch: {
      type: "string",
      nullable: true,
      description: "Compare new benchmark data against the latest available benchmark in this branch",
    },
    compareCommit: {
      description: "Compare new benchmark data against the benchmark data associated with a specific commit",
      type: "string",
      nullable: true,
    },
    prune: {
      description:
        "When persisting history, delete benchmark data associated with commits that are no longer in the current git history",
      type: "boolean",
      nullable: true,
    },
    persist: {
      description: "Force persisting benchmark data in history",
      type: "boolean",
      nullable: true,
    },
    noThrow: {
      description: "Exit cleanly even if a preformance regression was found",
      type: "boolean",
      nullable: true,
    },
    skipPostComment: {
      description: "Skip post Github comment step if run on Github CI",
      type: "boolean",
      nullable: true,
    },
    historyLocal: {
      description:
        "Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path. alias: local",
      type: "string",
      nullable: true,
    },
    local: {
      description:
        "Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path. alias: historyLocal",
      type: "string",
      nullable: true,
    },
    historyGaCache: {
      description:
        "Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key. alias: ga-cache",
      type: "string",
      nullable: true,
    },
    "ga-cache": {
      description:
        "Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key. alias: historyGaCache",
      type: "string",
      nullable: true,
    },
    historyS3: {
      description: "Persist benchmark history in an Amazon S3 bucket. Requires Github authentication. alias: s3",
      type: "string",
      nullable: true,
    },
    s3: {
      description: "Persist benchmark history in an Amazon S3 bucket. Requires Github authentication. alias: historyS3",
      type: "string",
      nullable: true,
    },
    maxRuns: {
      type: "number",
      nullable: true,
      description: "Max number of fn() runs, after which the benchmark stops",
    },
    minRuns: {
      type: "number",
      nullable: true,
      description: "Min number of fn() runs before considering stopping the benchmark after converging",
    },
    maxMs: {
      type: "number",
      nullable: true,
      description: "Max total milliseconds of runs, after which the benchmark stops",
    },
    minMs: {
      type: "number",
      nullable: true,
      description: "Min total milliseconds of runs before considering stopping the benchmark after converging",
    },
    maxWarmUpMs: {
      type: "number",
      nullable: true,
      description:
        "Maximum real benchmark function run time before starting to count towards results. Set to 0 to not warm-up. May warm up for less ms if the `maxWarmUpRuns` condition is met first.",
    },
    maxWarmUpRuns: {
      type: "number",
      nullable: true,
      description:
        "Maximum benchmark function runs before starting to count towards results. Set to 0 to not warm-up. May warm up for less ms if the `maxWarmUpMs` condition is met first.",
    },
    convergeFactor: {
      type: "number",
      nullable: true,
      description: "Convergence factor (0,1) at which the benchmark automatically stops. Set to 1 to disable",
    },
    runsFactor: {
      type: "number",
      nullable: true,
      description:
        "If fn() contains a for loop repeating a task N times, you may set runsFactor = N to scale down the results.",
    },
    yieldEventLoopAfterEach: {
      type: "boolean",
      nullable: true,
      description:
        "Run `sleep(0)` after each fn() call. Use when the event loop needs to tick to free resources created by fn()",
    },
    timeoutBench: {
      type: "number",
      nullable: true,
      description: "Hard timeout, enforced by mocha.",
    },
    only: {
      type: "boolean",
      nullable: true,
    },
    skip: {
      type: "boolean",
      nullable: true,
    },
  },
  dependentSchemas: {
    historyLocal: {not: {required: ["local"]}},
    local: {not: {required: ["historyLocal"]}},
    historyGaCache: {not: {required: ["ga-cache"]}},
    "ga-cache": {not: {required: ["historyGaCache"]}},
    historyS3: {not: {required: ["s3"]}},
    s3: {not: {required: ["historyS3"]}},
    threshold: {not: {required: ["noThreshold"]}},
    noThreshold: {not: {required: ["threshold"]}},
  },
};

const ajv = new Ajv({strictSchema: false, useDefaults: true, allErrors: true});
export const validatorReporterOptions = ajv.compile(reporterOptionsSchema);

export function validateReporterOptions(data: Record<string, unknown>): ReporterOptions {
  if (validatorReporterOptions(data)) {
    return data as ReporterOptions;
  }

  throw new Error(
    `Reporter options could not be validated. \n ${stringifyValidationErrors(validatorReporterOptions.errors ?? [])}`
  );
}

export function stringifyValidationErrors(errors: ErrorObject[]): string {
  const results: string[] = [];
  for (const err of errors) {
    results.push(`\t${err.instancePath.slice(1)}\t\t - ${err.message}`);
  }
  return results.join("\n");
}

export const BENCHMARK_RC_FILE = ".benchrc.yaml";

export function locateRcFile(): string | undefined {
  const rcFilePath = path.join(process.cwd(), BENCHMARK_RC_FILE);
  if (fs.existsSync(rcFilePath)) return rcFilePath;

  return undefined;
}

export function loadAndValidateOptions(opts?: Partial<ReporterOptions>): ReporterOptions {
  const rcFile = locateRcFile();
  let rcOptions = {};

  if (rcFile) {
    rcOptions = parse(fs.readFileSync(rcFile, "utf8")) as Record<string, unknown>;
  }

  const allOptions = {...rcOptions, ...opts} as ReporterOptionsWithAliases;
  if (allOptions.local) {
    allOptions.historyLocal = allOptions.local;
    delete allOptions.local;
  }

  if (allOptions.s3) {
    allOptions.historyS3 = allOptions.s3;
    delete allOptions.s3;
  }

  if (allOptions.noThreshold) {
    allOptions.threshold = Infinity;
    delete allOptions.noThreshold;
  }

  return validateReporterOptions(allOptions);
}
