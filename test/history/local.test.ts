import assert from "assert";
import fs from "fs";
import path from "path";
import {BenchmarkHistory} from "../../src/types";
import {readLocalHistory, writeLocalHistory} from "../../src/history/local";

describe("benchmark history local", () => {
  const testDir = fs.mkdtempSync("test_files_");

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

  after(() => {
    fs.rmdirSync(testDir, {recursive: true});
  });

  it("Should write and read history file", () => {
    const filepath = path.join(testDir, "benchmark_history.json");

    writeLocalHistory(filepath, history);
    const historyRead = readLocalHistory(filepath);

    assert.deepStrictEqual(historyRead, history, "Wrong history read from disk");
  });
});
