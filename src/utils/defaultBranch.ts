import {isGaRun} from "../github/context";
import {getGithubDefaultBranch} from "../github/octokit";
import {Opts} from "../types";
import {shell} from "./shell";

let defaultBranch: string | null = null;

/**
 * Return a cached value of a best guess of the repo's default branch
 */
export async function getDefaultBranch(opts?: Pick<Opts, "defaultBranch">): Promise<string> {
  if (opts?.defaultBranch) {
    return opts.defaultBranch;
  }

  if (defaultBranch === null) {
    defaultBranch = isGaRun() ? await getGithubDefaultBranch() : await guessLocalDefaultBranch();
  }

  return defaultBranch;
}

async function guessLocalDefaultBranch(): Promise<string> {
  const branchesRes = await shell("git branch --all --format='%(refname:short)'");
  const branches = branchesRes.split("\n");
  const branchSet = new Set(branches);

  for (const branch of ["main", "master"]) {
    if (branchSet.has(branch) || branchSet.has(`origin/${branch}`)) return branch;
  }

  throw Error("Could not figure out local default branch. Use persistBranches option");
}
