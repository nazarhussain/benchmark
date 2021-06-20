import Ajv from "ajv";
import {BenchmarkHistory, BenchmarkResults} from "../types";
import {readJson, writeJson} from "./file";

const ajv = new Ajv({allErrors: true});

/** TS type `BenchmarkResults` */
const benchmarkResultsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: {type: "string"},
      averageNs: {type: "number"},
      runsDone: {type: "integer"},
      totalMs: {type: "number"},
      factor: {type: "number"},
    },
    required: ["id", "averageNs", "runsDone", "totalMs"],
  },
};

/** TS type `Benchmark` */
const benchmarkSchema = {
  type: "object",
  properties: {
    commitSha: {type: "string"},
    timestamp: {type: "integer"},
    results: benchmarkResultsSchema,
  },
  required: ["commitSha", "timestamp", "results"],
};

/** TS type `BenchmarkHistory` */
const benchmarkHistorySchema = {
  type: "object",
  properties: {
    benchmarks: {
      type: "object",
      patternProperties: {
        "^.*$": {
          type: "array",
          items: benchmarkSchema,
        },
      },
    },
  },
  required: ["benchmarks"],
};

export function readBenchmarkResults(filepath: string): BenchmarkResults {
  const data = readJson<BenchmarkResults>(filepath);
  const validate = ajv.compile(benchmarkResultsSchema);
  const valid = validate(data);
  if (!valid) throw Error(`Invalid BenchmarkResults ${JSON.stringify(validate.errors, null, 2)}`);
  return data;
}

export function readBenchmarkHistory(filepath: string): BenchmarkHistory {
  try {
    const data = readJson<BenchmarkHistory>(filepath);
    const validate = ajv.compile(benchmarkHistorySchema);
    const valid = validate(data);
    if (!valid) throw Error(`Invalid BenchmarkHistory ${JSON.stringify(validate.errors, null, 2)}`);
    return data;
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(`No BenchmarkHistory file found at ${filepath}, creating a new one`);
      return {benchmarks: {}};
    } else {
      throw e;
    }
  }
}

export function writeBenchmarkHistory(filepath: string, data: BenchmarkHistory): void {
  writeJson(filepath, data);
}
