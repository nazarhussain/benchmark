import {shell} from "./shell";

export async function getCurrentCommitInfo(): Promise<{
  /** commit hash `71f08b12d45d44255c31f7b7d135bd15a93fdaac` */
  commitSha: string;
  /** committer date, UNIX timestamp in seconds */
  timestamp: number;
}> {
  const commitSha = await shell("git show -s --format=%H");
  const timestampStr = await shell("git show -s --format=%ct");
  const timestamp = parseInt(timestampStr, 10);

  if (!timestamp || isNaN(timestamp)) {
    throw Error(`Invalid timestampStr ${timestampStr}`);
  }

  return {
    commitSha,
    timestamp,
  };
}

/**
 * Returns a chornological list of commits from `$branch`.
 *
 * - `--format=format:%H`: Print the full commit hash only
 * - `-n`: Display up to n commits
 * - `--no-pager` suppress interactive mode
 *
 * (from git-log docs):
 * List commits that are reachable by following the parent links from the given commit(s),
 * but exclude commits that are reachable from the one(s) given with a ^ in front of them.
 * The output is given in reverse chronological order by default.
 */
export async function getBranchCommitList(branch: string, n = 50): Promise<string[]> {
  const commitsStr = await shell(`git --no-pager log --format=format:%H -n ${n} ${branch}`);
  return commitsStr.trim().split("\n");
}

/**
 * Resolve a heads ref
 */
export async function getBranchLatestCommit(branch: string): Promise<string> {
  const res = await shell(`git rev-parse ${branch}`);
  return res.trim();
}
