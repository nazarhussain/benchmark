import fs from "fs";
import csvParse from "csv-parse/lib/sync";
import csvStringify from "csv-stringify/lib/sync";

export function readJson<T>(filepath: string): T {
  const jsonStr = fs.readFileSync(filepath, "utf8");

  let json: T;
  try {
    json = JSON.parse(jsonStr);
  } catch (e) {
    throw Error(`Error parsing JSON ${filepath}: ${e.messge}`);
  }

  // TODO: Validate schema

  return json;
}

export function writeJson<T>(filepath: string, json: T): void {
  const jsonStr = JSON.stringify(json, null, 2);
  fs.writeFileSync(filepath, jsonStr);
}

export function fromCsv<T extends any[]>(str: string): T {
  return csvParse(str, {columns: true, cast: true});
}

export function toCsv<T extends any[]>(data: T): string {
  return csvStringify(data, {header: true});
}

export function readCsv<T extends any[]>(filepath: string): T {
  const str = fs.readFileSync(filepath, "utf8");
  return fromCsv(str);
}

export function writeCsv<T extends any[]>(filepath: string, data: T): void {
  const str = toCsv(data);
  fs.writeFileSync(filepath, str);
}
