import fs from "fs";
import {expect} from "chai";
import rimraf from "rimraf";
import {Benchmark} from "../../src/types";
import {LocalHistoryProvider} from "../../src/history/local";

describe("benchmark history local", () => {
  const testDir = fs.mkdtempSync("test_files_");
  const historyProvider = new LocalHistoryProvider(testDir);

  const benchmark: Benchmark = {
    commitSha: "010101010101010101010101",
    results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465}],
  };

  after(() => {
    rimraf.sync(testDir);
  });

  it("Should write and read history file", async () => {
    await historyProvider.writeCommit(benchmark);

    const commits = await historyProvider.listCommits();
    expect(commits).to.deep.equal([benchmark.commitSha], "Wrong commit list");

    const benchRead = await historyProvider.readCommit(benchmark.commitSha);
    expect(benchRead).to.deep.equal(benchmark, "Wrong bench read from disk");
  });
});
