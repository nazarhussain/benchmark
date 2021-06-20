import {BenchmarkHistory} from "../types";
import {HistoryLocation, resolveHistoryLocation} from "./location";
import {readLocalHistory, writeLocalHistory} from "./local";
import {fetchGaCache, writeGaCache} from "./gaCache";
export {resolveHistoryLocation};

export async function getHistory(historyLocation: HistoryLocation): Promise<BenchmarkHistory> {
  switch (historyLocation.type) {
    case "local":
      return readLocalHistory(historyLocation.path);
    case "ga-cache":
      return fetchGaCache(historyLocation.key);
  }
}

export async function storeHistory(historyLocation: HistoryLocation, history: BenchmarkHistory): Promise<void> {
  switch (historyLocation.type) {
    case "local":
      return writeLocalHistory(historyLocation.path, history);
    case "ga-cache":
      return writeGaCache(historyLocation.key, history);
  }
}
