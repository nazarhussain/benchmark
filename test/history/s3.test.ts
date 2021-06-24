import {expect} from "chai";
import S3 from "aws-sdk/clients/s3";
import {Benchmark} from "../../src/types";
import {S3Config, S3HistoryProvider} from "../../src/history/s3";
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

  const {S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION, S3_BUCKET, S3_ENDPOINT} = process.env;

  if (!S3_ACCESS_KEY) throw Error("No ENV S3_ACCESS_KEY");
  if (!S3_SECRET_KEY) throw Error("No ENV S3_SECRET_KEY");
  if (!S3_REGION) throw Error("No ENV S3_REGION");
  if (!S3_BUCKET) throw Error("No ENV S3_BUCKET");
  if (!S3_ENDPOINT) throw Error("No ENV S3_ENDPOINT");

  const config: S3Config = {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    region: S3_REGION,
    Bucket: S3_BUCKET,
    endpoint: S3_ENDPOINT,
  };
  const historyProvider = new S3HistoryProvider(config);

  const branch = "main";
  const benchmark: Benchmark = {
    commitSha: "010101010101010101010101",
    results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465}],
  };

  it("Should write latest to ga-cache", async function () {
    await historyProvider.writeLatestInBranch(branch, benchmark);
  });

  it("Should read latest from ga-cache", async function () {
    const benchRead = await historyProvider.readLatestInBranch(branch);
    expect(benchRead).to.deep.equal(benchmark, "Wrong bench read from disk");
  });

  it("Write to history", async function () {
    await historyProvider.writeToHistory(benchmark);
  });

  it("Read history", async function () {
    const benchmarks = await historyProvider.readHistory();
    expect(benchmarks).to.deep.equal([benchmark], "Wrong history");
  });

  after("Delete uploaded artifacts", async () => {
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
