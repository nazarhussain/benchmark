import fs from "fs";
import path from "path";
import {IHistoryProvider} from "./provider";
import {Benchmark, BenchmarkHistory, BenchmarkResult, BenchmarkResults} from "../types";
import {readCsv, readJson, writeCsv, writeJson} from "../utils/file";
import {emptyBenchmarkHistory, validateHistory} from "./schema";

/**
 * Persist results in CSV, one benchmark result per file
 *
 * ```
 * /$dirpath/52b8122daa9b7a3d0ea0ecfc1ff9eda79a201eb8.csv
 * ```
 *
 * ```csv
 * id,averageNs,runsDone,totalMs
 * sum array with raw for loop,1348118,371,501
 * sum array with reduce,16896469,128,2163
 * ```
 */
export class LocalHistoryProvider implements IHistoryProvider {
  constructor(private readonly dirpath: string) {}

  async listCommits(): Promise<string[]> {
    try {
      return fs.readdirSync(this.dirpath);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      else throw e;
    }
  }

  async readCommit(commitSha: string): Promise<Benchmark | null> {
    try {
      const results = readCsv<BenchmarkResults>(this.getFilepath(commitSha));
      return {commitSha, results};
    } catch (e) {
      if (e.code === "ENOENT") return null;
      else throw e;
    }
  }

  async writeCommit(commitSha: string, data: Benchmark): Promise<void> {
    if (commitSha !== data.commitSha) throw Error("commitSha doesn't match");
    fs.mkdirSync(this.dirpath, {recursive: true});
    writeCsv<BenchmarkResults>(this.getFilepath(data.commitSha), data.results);
  }

  private getFilepath(commitSha: string): string {
    return path.join(this.dirpath, commitSha) + ".csv";
  }
}

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
