export function extendError(e: Error, prefix: string): Error {
  e.message = `${prefix}: ${e.message}`;
  return e;
}

export interface FsError extends Error {
  code: "ENOENT";
}

export interface AwsError extends Error {
  code: "NoSuchKey";
}
