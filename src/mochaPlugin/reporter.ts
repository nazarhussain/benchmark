// eslint-disable-next-line import/no-extraneous-dependencies
import Mocha, {MochaOptions} from "mocha";
import {Benchmark, BenchmarkResult, onlyBenchmarkOpts, ReporterOptions} from "../types";
import {optsByRootSuite, resultsByRootSuite} from "../run/globalState";
import {formatResultRow} from "./format";
import {getRootSuite} from "./utils";
import {connectHistoryProvider, getBenchmark, processBenchmark} from "../run/process";
import {IHistoryProvider} from "../history/provider";
import {loadAndValidateOptions} from "../run/options";

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

// eslint-disable-next-line no-console
const consoleLog = console.log;
const color = Mocha.reporters.Base.color;
const symbols = Mocha.reporters.Base.symbols;

export class BenchmarkReporter extends Mocha.reporters.Base {
  protected indents = 0;
  private historyProvider: IHistoryProvider;
  private opts: ReporterOptions;
  private prevBenchmark: Benchmark | null = null;
  private prevResults = new Map<string, BenchmarkResult>();

  constructor(runner: Mocha.Runner, options?: MochaOptions) {
    super(runner, options);

    this.opts = loadAndValidateOptions(options?.reporterOptions ?? {});
    this.historyProvider = connectHistoryProvider(this.opts);

    let n = 0;

    runner.on(EVENT_RUN_BEGIN, async () => {
      const rootSuite = getRootSuite(runner.suite);
      const results = new Map<string, BenchmarkResult>();
      resultsByRootSuite.set(rootSuite, results);
      // TODO: Fetch, parse and pass the options
      optsByRootSuite.set(rootSuite, onlyBenchmarkOpts({}));

      this.prevBenchmark = await getBenchmark(this.opts, this.historyProvider);

      for (const bench of this.prevBenchmark?.results ?? []) {
        this.prevResults.set(bench.id, bench);
      }
      consoleLog();
    });

    runner.once(EVENT_RUN_END, async () => {
      this.epilogue();
    });

    runner.on(EVENT_SUITE_BEGIN, (suite) => {
      this.increaseIndent();
      consoleLog(color("suite", "%s%s"), this.indent(), suite.title);
    });

    runner.on(EVENT_SUITE_END, () => {
      this.decreaseIndent();
      if (this.indents === 1) {
        consoleLog();
      }
    });

    runner.on(EVENT_TEST_PENDING, (test) => {
      const fmt = this.indent() + color("pending", "  - %s");
      consoleLog(fmt, test.title);
    });

    runner.on(EVENT_TEST_PASS, (test) => {
      try {
        if (!test.parent) throw Error("test has no parent");
        const rootSuite = getRootSuite(test.parent);
        const results = resultsByRootSuite.get(rootSuite);
        if (!results) throw Error("root suite result not found");

        const result = results.get(test.title);
        if (result) {
          // Render benchmark
          const prevResult = this.prevResults.get(result.id) ?? null;

          const resultRow = formatResultRow(result, prevResult, result.threshold ?? this.opts.threshold);
          const fmt = this.indent() + color("checkmark", "  " + symbols.ok) + " " + resultRow;
          consoleLog(fmt);
        } else {
          // Render regular test
          const fmt = this.indent() + color("checkmark", "  " + symbols.ok) + color("pass", " %s");
          consoleLog(fmt, test.title);
        }
      } catch (e) {
        // Log error manually since mocha doesn't log errors thrown here
        consoleLog(e);
        process.exitCode = 1;
        throw e;
      }
    });

    runner.on(EVENT_TEST_FAIL, (test) => {
      consoleLog(this.indent() + color("fail", "  %d) %s"), ++n, test.title);
    });
  }

  indent(): string {
    return Array(this.indents).join("  ");
  }

  increaseIndent(): void {
    this.indents++;
  }

  decreaseIndent(): void {
    this.indents--;
  }

  done(failures: number, fn: (failures: number) => void): void {
    const rootSuite = getRootSuite(this.runner.suite);
    const results = resultsByRootSuite.get(rootSuite);
    // TODO: Fetch, parse and pass the options
    void processBenchmark(
      this.opts,
      this.historyProvider,
      this.prevBenchmark,
      Array.from(results?.values() ?? [])
    ).then(() => {
      fn(failures);
    });
  }
}
