import {BenchmarkHistory} from "../types";
import {readJson, writeJson} from "../utils/file";
import {emptyBenchmarkHistory, validateHistory} from "./schema";

export function readLocalHistory(filepath: string): BenchmarkHistory {
  try {
    const data = readJson<BenchmarkHistory>(filepath);
    validateHistory(data);
    return data;
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(`No BenchmarkHistory file found at ${filepath}, creating a new one`);
      return emptyBenchmarkHistory;
    } else {
      throw e;
    }
  }
}

export function writeLocalHistory(filepath: string, data: BenchmarkHistory): void {
  writeJson(filepath, data);
}
