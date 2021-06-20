import fs from "fs";
import path from "path";
import * as cache from "@actions/cache";
import {BenchmarkHistory} from "../types";
import {emptyBenchmarkHistory} from "./schema";
import {readLocalHistory, writeLocalHistory} from "./local";

export async function fetchGaCache(key: string): Promise<BenchmarkHistory> {
  const tmpDir = fs.mkdtempSync("ga-cache-download");
  try {
    const cacheKey = await cache.restoreCache([tmpDir], key);
    if (!cacheKey) {
      // Cache not found
      return emptyBenchmarkHistory;
    }

    const files = fs.readdirSync(tmpDir);
    if (files.length > 1) {
      throw Error(`More than one file downloaded from cache\n${files.join(", ")}`);
    }

    const [file] = files;
    if (!file) {
      // Empty cache
      return emptyBenchmarkHistory;
    }

    const filepath = path.join(tmpDir, file);
    return readLocalHistory(filepath);
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
}

export async function writeGaCache(key: string, history: BenchmarkHistory): Promise<void> {
  const tmpDir = fs.mkdtempSync("ga-cache-upload");
  try {
    const filepath = path.join(tmpDir, "benchmark_history.json");
    writeLocalHistory(filepath, history);
    await cache.saveCache([tmpDir], key);
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
}
