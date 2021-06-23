import S3 from "aws-sdk/clients/s3";
import {Benchmark, BenchmarkResults} from "../types";
import {fromCsv, toCsv} from "../utils";
import {IHistoryProvider} from "./provider";

export interface S3Config {
  Bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3HistoryProvider implements IHistoryProvider {
  s3: S3;

  constructor(private readonly config: S3Config) {
    this.s3 = new S3(config);
  }

  async listCommits(): Promise<string[]> {
    const objects = await this.s3
      .listObjects({
        Bucket: this.config.Bucket,
      })
      .promise();

    console.log(objects);

    return [];
  }

  async readCommit(commitSha: string): Promise<Benchmark | null> {
    const res = await this.s3
      .getObject({
        Bucket: this.config.Bucket,
        Key: commitSha,
      })
      .promise();

    const body = res.Body;

    const results = fromCsv<BenchmarkResults>(body as string);
    return {commitSha, results};
  }

  async writeCommit(commitSha: string, data: Benchmark): Promise<void> {
    if (commitSha !== data.commitSha) throw Error("commitSha doesn't match");
    const body = toCsv<BenchmarkResults>(data.results);
    await this.s3
      .upload({
        Bucket: this.config.Bucket,
        Body: body,
        Key: commitSha,
      })
      .promise();
  }
}
