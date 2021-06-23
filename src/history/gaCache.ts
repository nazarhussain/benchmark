import fs from "fs";
import * as cache from "@actions/cache";
import {Benchmark} from "../types";
import {LocalHistoryProvider} from "./local";
import {IHistoryProvider} from "./provider";

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
export function getGaCacheHistoryProvider(cacheKey: string): IHistoryProvider {
  const tmpDir = fs.mkdtempSync("ga-cache-download");
  return new GaCacheHistoryProvider(tmpDir, cacheKey);
}

class GaCacheHistoryProvider extends LocalHistoryProvider implements IHistoryProvider {
  private initializePromise: Promise<any> | null = null;

  constructor(private readonly tmpDir: string, private readonly cacheKey: string) {
    super(tmpDir);
  }

  async listCommits(): Promise<string[]> {
    await this.initialize();
    return super.listCommits();
  }

  async readCommit(commitSha: string): Promise<Benchmark | null> {
    await this.initialize();
    return super.readCommit(commitSha);
  }

  async writeCommit(data: Benchmark): Promise<void> {
    await super.writeCommit(data);
    await cache.saveCache([this.tmpDir], this.cacheKey);
  }

  private async initialize(): Promise<void> {
    if (this.initializePromise === null) {
      this.initializePromise = cache.restoreCache([this.tmpDir], this.cacheKey);
    }
    return this.initializePromise;
  }
}
