import {isGaRun} from "../github/context";
import {Opts} from "../types";

export type HistoryLocation = {type: "local"; path: string} | {type: "ga-cache"; key: string};

export const defaultLocalPath = "./benchmark_history.json";
export const defaultCacheKey = "benchmark_history";

export function resolveHistoryLocation(opts: Opts): HistoryLocation {
  if (opts.historyLocal && opts.historyGaCache) {
    throw Error("Must not set 'historyLocal' and 'historyGaCache'");
  }

  if (opts.historyLocal) {
    const filepath = typeof opts.historyLocal === "string" ? opts.historyLocal : defaultLocalPath;
    return {type: "local", path: filepath};
  }

  if (opts.historyGaCache) {
    const cacheKey = typeof opts.historyGaCache === "string" ? opts.historyGaCache : defaultCacheKey;
    return {type: "ga-cache", key: cacheKey};
  }

  // Defaults

  if (isGaRun()) {
    return {type: "ga-cache", key: defaultCacheKey};
  } else {
    return {type: "local", path: defaultLocalPath};
  }
}
