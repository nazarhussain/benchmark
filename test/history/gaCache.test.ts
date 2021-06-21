import assert from "assert";
import {BenchmarkHistory} from "../../src/types";
import {fetchGaCache, writeGaCache} from "../../src/history/gaCache";
import {isGaRun} from "../../src/github/context";

// Currently fails with
//
// Error: reserveCache failed: Cache Service Url not found, unable to restore cache
//
// See:
//  - https://github.com/nektos/act/issues/329
//  - https://github.com/nektos/act/issues/285
describe.skip("benchmark history gaCache", function () {
  this.timeout(60 * 1000);

  const cacheKey = "ga-cache-testing";

  const history: BenchmarkHistory = {
    benchmarks: {
      main: [
        {
          branch: "main",
          commitSha: "010101010101010101010101",
          timestamp: 1600000000,
          results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465}],
        },
      ],
      fix1: [],
    },
  };

  it("Should write history to ga-cache", async function () {
    if (!isGaRun()) this.skip();

    await writeGaCache(cacheKey, history);
  });

  it("Should read history from ga-cache", async function () {
    if (!isGaRun()) this.skip();

    const historyRead = fetchGaCache(cacheKey);
    assert.deepStrictEqual(historyRead, history, "Wrong history read from disk");
  });
});
