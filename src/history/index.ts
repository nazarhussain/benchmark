import {Opts} from "../types";
import {resolveHistoryLocation} from "./location";
import {LocalHistoryProvider} from "./local";
import {getGaCacheHistoryProvider} from "./gaCache";
import {IHistoryProvider} from "./provider";
import {optionsDefault} from "../options";
import {S3HistoryProvider} from "./s3";
export {resolveHistoryLocation};

export function getHistoryProvider(opts: Opts): IHistoryProvider {
  if (opts.historyGaCache) {
    const cacheKey = typeof opts.historyGaCache === "string" ? opts.historyGaCache : optionsDefault.historyCacheKey;
    return getGaCacheHistoryProvider(cacheKey);
  }

  if (opts.historyS3) {
    return S3HistoryProvider.fromEnv();
  }

  // if opts.historyLocal or else
  const dirpath = typeof opts.historyLocal === "string" ? opts.historyLocal : optionsDefault.historyLocalPath;
  return new LocalHistoryProvider(dirpath);
}
