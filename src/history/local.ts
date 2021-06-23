import fs from "fs";
import path from "path";
import {IHistoryProvider} from "./provider";
import {Benchmark, BenchmarkResults} from "../types";
import {readCsv, writeCsv} from "../utils/file";

const extension = ".csv";

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
      return fs.readdirSync(this.dirpath).map((file) => {
        if (file.endsWith(extension)) return file.slice(0, -extension.length);
        else return file;
      });
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

  async writeCommit(data: Benchmark): Promise<void> {
    fs.mkdirSync(this.dirpath, {recursive: true});
    writeCsv<BenchmarkResults>(this.getFilepath(data.commitSha), data.results);
  }

  private getFilepath(commitSha: string): string {
    return path.join(this.dirpath, commitSha) + extension;
  }
}
