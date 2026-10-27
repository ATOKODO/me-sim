# Dependencies and import limits — 9 October 2026 {#dependency-import-hardening}

This page describes fixes for npm dependencies, the XML parser and import limits identified in the [open source review](./open-source-review-2026-10-09.md). It does not resolve asset rights or the project's license choice.

## Updated dependencies {#updated-dependencies}

- Angular, compiler and build tools: **22.2.2**. Direct versions are exact; transitive dependencies are locked.
- VitePress remains on stable **1.6.4**, with a targeted override to **Vite 6.4.4**. Its former Vite 5 had Windows development-server advisories. Vue plugin 5 supports Vite 6; site compatibility is checked by builds and Playwright tests.
- Storybook remains on stable **10.6.1**. Its Webpack builder uses **webpack-dev-middleware 7.4.6** through a targeted override, replacing vulnerable version 6. Updates must validate both builds and the development server.
- Calamine: **0.36.1**, with `chrono`; **quick-xml 0.41.0**, fixed for [RUSTSEC-2026-0194](https://rustsec.org/advisories/RUSTSEC-2026-0194.html) and RUSTSEC-2026-0195. ZIP 8.6.0 is used for XLSX preflight checks.

On 9 October, npm audit reports no advisories. OSV queries for the new Calamine, quick-xml, ZIP, atoi_simd and csv-core versions return none. This does not replace analysis of all components or compatibility testing.

### Local braces patch {#local-braces-patch}

No published npm fix for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) was available. `vendor/braces` retains the 3.0.3 source and MIT license, with local patch version `3.0.3-me-sim.1`. `PATCH.md` records provenance, archive hash, changes and removal conditions.

This copy is a local development dependency; the `$braces` override enforces the same copy for all consumers. Parsing rejects strings deeper than 64 blocks. Compile, expand and stringify validate ASTs iteratively before recursive walking: depth 128, 131,072 nodes and no cycles. User options cannot increase these ceilings.

**A clean npm audit does not validate a local package.** Tests check the actually resolved package, its micromatch consumer, ordinary patterns, ranges, escaping, deep strings and direct AST inputs. Replace the local patch with a reviewed and tested upstream fixed release; do not remove the override without checking every transitive path.

## Checks before Excel allocation {#preallocation-checks}

The file is read once into a snapshot capped at 25 MiB, using a bounded read as well as a metadata check. Preflight and parsing use the same content; replacing the disk file cannot bypass the limits.

| Resource                                 | Limit                        |
| ---------------------------------------- | ---------------------------- |
| Raw file                                 | 25 MiB                       |
| Table rows                               | 50,000 measurements + header |
| Columns                                  | 256 in every format          |
| Excel sheets                             | 16                           |
| Dense grid extent                        | 500,010 cells per sheet      |
| Workbook grids and cells                 | 1,000,020 cumulative cells   |
| Checked text including shared references | 32 MiB                       |
| Text per cell                            | 256 KiB                      |
| CSV record                               | 1 MiB                        |
| ZIP entries                              | 512                          |
| One decompressed entry / all entries     | 32 MiB / 64 MiB              |
| XML events or BIFF records               | 1,000,000                    |
| XML depth / attributes per element       | 64 / 64                      |

Excel coordinates are checked alongside declared dimensions. Limits apply to the actual extent between the first and last used cells: a compact table far from A1 remains supported. A very sparse file can be rejected with few populated cells when their distance would require a large grid. Split it or export a compact range.

- **XLSX:** the ZIP directory is checked before allocating entry metadata: counts, sizes, duplicates and cumulative budgets. Decompressed reads are also bounded and checked against declared sizes. XML checks dimensions, explicit/implicit coordinates, formulas, depth, attributes and counters that could trigger reservations. Shared text cost is counted for each reference, including XML entities. ZIP64, encrypted archives, DTDs and XML encodings other than UTF-8/ASCII are rejected.
- **XLS:** a validated CFB reader reads the Workbook stream with a bound. BIFF checks dimensions, cells, shared strings and continuations before Calamine allocates ranges. A canonical CFB container is rebuilt only in memory, without macros or FAT chains from the source. The original file is unchanged.
- **CSV:** csv-core scans with fixed buffers before record collection. Quoted fields, embedded delimiters and newlines retain their meaning; columns, fields, rows and cells are bounded.
- **Tabular JSON:** a visitor checks flat objects and quotas without collecting values, before building the value array. Nested structures are rejected. Complete backup restoration remains separate.

These checks bound data and known allocations; they are not a hardware process-memory limit or an interruptible execution deadline. Rejected files do not reach import transactions. Parsers are not claimed safe for every imaginable input.

## Validation and maintenance {#validation-and-maintenance}

```powershell
npm ci
npm run check:dependencies
npm run build
npm run docs:build
npm run build:storybook
npm run test:visual -- --skip-build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

`check:dependencies` runs the online npm audit and local patch tests. Use `npm run test:dependencies` to run only those tests without a network audit. Rust tests cover existing references and resource limits: sparse files, cumulative grids, forged ZIP metadata, duplicates, inconsistent sizes, amplified shared text, XML entities, formulas, oversized CSV fields, nested JSON objects and XLS SST continuations. Fixtures are fictional and bounded; no memory exhaustion is triggered on the machine.

Local validation on 9 October: clean `npm ci` installation, npm audit with no advisories, 5 braces patch tests, 40 Rust tests, 48 functional Playwright tests and 220 visual tests passed, without changing baseline screenshots. Angular, Storybook, VitePress and native Windows (debug) builds passed. Angular, VitePress and Storybook development servers were also checked.

Do not regenerate visual baselines to conceal dependency-induced changes. Review overrides when updating VitePress/Storybook and keep patch tests while the local copy is used.
