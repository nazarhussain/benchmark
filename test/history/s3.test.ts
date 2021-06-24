import {expect} from "chai";
import S3 from "aws-sdk/clients/s3";
import {Benchmark} from "../../src/types";
import {S3HistoryProvider} from "../../src/history/s3";
import dotenv from "dotenv";
dotenv.config();

// Currently fails with
//
// Error: reserveCache failed: Cache Service Url not found, unable to restore cache
//
// See:
//  - https://github.com/nektos/act/issues/329
//  - https://github.com/nektos/act/issues/285
describe.skip("benchmark history S3", function () {
  this.timeout(60 * 1000);

  const branch = "main";
  const benchmark: Benchmark = {
    commitSha: "010101010101010101010101",
    results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465}],
  };

  let historyProvider: S3HistoryProvider;
  before(() => {
    historyProvider = S3HistoryProvider.fromEnv();
  });

  it("writeLatestInBranch", async function () {
    await historyProvider.writeLatestInBranch(branch, benchmark);
  });

  it("readLatestInBranch", async function () {
    const benchRead = await historyProvider.readLatestInBranch(branch);
    expect(benchRead).to.deep.equal(benchmark, "Wrong bench read from disk");
  });

  it("writeToHistory", async function () {
    await historyProvider.writeToHistory(benchmark);
  });

  it("readHistory", async function () {
    const benchmarks = await historyProvider.readHistory();
    expect(benchmarks).to.deep.equal([benchmark], "Wrong history");
  });

  after("Delete uploaded artifacts", async () => {
    const config = historyProvider["config"];
    const s3 = new S3(config);
    const keys = [
      historyProvider["getLatestInBranchKey"](branch),
      historyProvider["getHistoryCommitKey"](benchmark.commitSha),
    ];
    for (const key of keys) {
      try {
        await s3.deleteObject({Bucket: config.Bucket, Key: key}).promise();
      } catch (e) {
        console.error(`Error deleting key ${key}`, e);
      }
    }
  });
});
