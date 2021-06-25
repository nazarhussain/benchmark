# Benchmark

# User guide

## Track performance in CI

Ensure that new works do not introduce performance regressions in CI. Track:

- Do PR against the base branch include a performance regression?
- Do new commits in the main branch include a performance regression?

To achieve that we need benchmark data for recent commits in the base branch.

```
bench --ga-cache test/perf/**/*.perf.ts
```

- Read benchmark history from Github Actions cache
- Figure out the prev benchmark based on GA events
- Run benchmark comparing with previous (if exists)
- Add result to benchmark history and persist to Github Actions cache

### PR

Retrieve latest benchmark in base branch and compare against it

**NOTE:** Must checkout the head commit, not the merge commit

- Prev benchmark = latest commit in base branch
- Do not persist benchmarks run on head branch

### Commit

Retrieve previous commit benchmark and compare against it

- Prev benchmark = previous commit from current sha
- Persist all benchmarks?

## Track performance locally

When working on optimizing a function you may want to know if your code is actually faster than the previous implementation.

To do that you can keep a benchmark history file locally and run the benchmark first against previous code

```
git checkout master
bench --out bench.json test/perf/func.perf.ts
```

- Runs benchmark without comparing with previous
- Writes single benchmark data to `bench.json`

Then measure performance with the new code

```
git checkout fix1
bench --prev bench.json test/perf/func.perf.ts
```

- Reads single benchmark data from `bench.json`
- Run benchmark comparing with prev
- Does not write benchmark data

### Alternative API

```
git checkout master
bench --local test/perf/func.perf.ts

git checkout fix1
bench --local --compare master test/perf/func.perf.ts
```

## Compare performance

```
bench compare --from <branch-name | commit-hash> --to <branch-name | commit-hash>
```

- Retrieves benchmark history
- Don't run benchmark
- Print comparision of from benchmark with to benchmark

# Benchmark data persistance

For CI runs previous benchmark data can be stored:

- Github actions cache
- Cloud bucket storage
- Commited in the repository (gh-pages, or data branch)

# Config

- When to persist benchmark data?

### `persist-branches`

Choose what branches to persist benchmark data.

- type: `string[]`
- default: `default-branch`

### `benchmarks-per-branch`

Limit number of benchmarks persisted per branch

- type: `number`
- default: `Infinity`

### `threshold`

Ratio of new average time per run vs previos time per run to consider a failure. If func previously ran in 10ms and now it runs in 20ms that's a ratio of 2. If the threshold is set to 2 the command will raise a performance regression error.

- type: `number`
- default: `2`

### `compare`

Manually specify how to select the previous benchmark to compare against. May specify:

1. Branch: Will pick the latest commit from that branch
2. Commit hash

---

- type: `string`
- default: `default-branch`

### `prune`

When persisting history, delete benchmark data associated with commits that are no longer in the current git history

- type: `boolean`
- default: `false`

### `no-persist`

Do not persist benchmark data in history

- type: `boolean`
- default: `false`

### `persist`

Force persisting benchmark data in history, ignoring `persist-on`

- type: `boolean`
- default: `false`

### `history-local` | `local`

Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path

- type: `string`
- default: _no set_

```
--local
```

```
--local ./benchmark_data/history.json
```

### `history-ga-cache` | `ga-cache`

Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key

- type: `string`
- default: _no set_

```
--ga-cache
```

```
--ga-cache benchmark_data
```

# Flow overview

- Retrieve benchmark history:
  - local
  - ga-cache
- Figure out what prev benchmark to compare against
  - If run on CI figure out from GA context events
  - Specify manually with `--compare`
- Run benchmarks
  - Run files with mocha and the provided file glob
- Persist new benchmark data maybe
  - Use `persist-branches`, `persist`, `no-persist` to decide
- Fail if some comparision exceeds threshold
- If run in Github Actions post comment in PR or commit
