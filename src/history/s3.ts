import path from "path";
import S3 from "aws-sdk/clients/s3";
import {Benchmark, BenchmarkResults} from "../types";
import {fromCsv, toCsv} from "../utils";
import {LocalHistoryProvider} from "./local";
import {IHistoryProvider} from "./provider";

export interface S3Config {
  Bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const historyDir = "history";
const latestDir = "latest";

interface CsvMeta {
  commit: string;
}

export class S3HistoryProvider implements IHistoryProvider {
  s3: S3;

  constructor(private readonly config: S3Config) {
    this.s3 = new S3(config);
  }

  async readLatestInBranch(branch: string): Promise<Benchmark | null> {
    const key = this.getLatestInBranchKey(branch);
    return this.readBenchFile(key);
  }

  async writeLatestInBranch(branch: string, benchmark: Benchmark): Promise<void> {
    const key = this.getLatestInBranchKey(branch);
    this.writeBenchFile(key, benchmark);
  }

  async readHistory(): Promise<Benchmark[]> {
    // TODO

    const objects = await this.s3
      .listObjects({
        Bucket: this.config.Bucket,
      })
      .promise();

    console.log(objects);

    return [];
  }

  async readHistoryCommit(commitSha: string): Promise<Benchmark | null> {
    const key = this.getHistoryCommitKey(commitSha);
    return this.readBenchFile(key);
  }

  async writeToHistory(benchmark: Benchmark): Promise<void> {
    const key = this.getHistoryCommitKey(benchmark.commitSha);
    this.writeBenchFile(key, benchmark);
  }

  private async readBenchFile(key: string): Promise<Benchmark> {
    const res = await this.s3
      .getObject({
        Bucket: this.config.Bucket,
        Key: key,
      })
      .promise();

    const str = res.Body;

    if (typeof str !== "string") {
      throw Error("Body not of string type");
    }

    const {data, metadata} = fromCsv<BenchmarkResults>(str);
    const csvMeta = metadata as unknown as CsvMeta;
    return {commitSha: csvMeta.commit, results: data};
  }

  /** Write result to CSV + metadata as Embedded Metadata */
  private async writeBenchFile(key: string, benchmark: Benchmark): Promise<void> {
    const csvMeta: CsvMeta = {commit: benchmark.commitSha};
    const str = toCsv(benchmark.results, csvMeta as unknown as Record<string, string>);

    await this.s3
      .upload({
        Bucket: this.config.Bucket,
        Body: str,
        Key: key,
      })
      .promise();
  }

  private getLatestInBranchKey(branch: string): string {
    return path.join(latestDir, branch);
  }

  private getHistoryCommitKey(commitSha: string): string {
    return path.join(historyDir, commitSha);
  }
}
