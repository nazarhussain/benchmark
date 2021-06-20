import Ajv from "ajv";

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
