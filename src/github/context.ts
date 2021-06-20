import * as github from "@actions/github";

export function isGaRun(): boolean {
  return Boolean(github.context.eventName);
}

/** Helper type to pass common arguments at once */
export type Context = {
  octokit: ReturnType<typeof github.getOctokit>;
  repo: Required<typeof github.context>["repo"];
};

let context: Context | null = null;

export function getContext(): Context {
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = github.context.repo;

  if (!githubToken) throw Error("ENV GITHUB_TOKEN not set");
  if (!repo) throw Error("Empty github.context.payload.repository");

  if (context === null) {
    context = {
      repo,
      octokit: github.getOctokit(githubToken),
    };
  }

  return context;
}
