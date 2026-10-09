# Open source publication readiness — 9 October 2026 {#open-source-publication-2026-10-09}

**9 October follow-up:** npm, XML parser and preallocation checks are addressed in [dependency and import hardening](./dependency-import-hardening.md). Findings below describe the audited commit.

Review of commit `ca8eca2`, clean working tree at the start: 404 tracked files, about 38.7 MB and 14 reachable commits. Scope: licenses, assets, Git history, dependencies, file inputs, CI and documentation. This review changes no business code, asset, license or Git history.

**Defer publication until licenses are clarified and exposed dependencies are addressed.** Local habit tracking can be presented as an alpha; scientific projections remain disabled. Publishing source and distributing a finished installer have different criteria.

## Priority fixes {#priority-fixes}

### P1 — Define the code license and its scope {#code-license}

No tracked `LICENSE`, `COPYING` or `NOTICE` file. `package.json` and `src-tauri/Cargo.toml` specify no license. A publicly visible repository alone does not grant the permissions expected from an open source project. See [GitHub's licensing documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

Explicitly choose a license, add its text, identify the copyright holder and set manifest SPDX identifiers. Explain how code, documentation and third-party assets are treated in the README. Inventory required notices before distributing binaries or built sites; dependency licenses do not replace the project's license. npm's `private: true` can remain: it prevents accidental npm publication, not a public repository.

### P1 — Establish character and texture redistribution rights {#asset-rights}

`art/avatar/README.md:3–9` describes supplied files without an author, source URL, license or evidence of redistribution permission. This covers `male_casual.fbx`, `character-texture.png`, `female_secretary.fbx` and `secretary_tex.png`, their Blender files and GLB exports in `public/avatar/character/`. SHA-256 hashes establish identity, not rights.

Obtain provenance and redistribution terms, then add an asset inventory: author, source, license, modifications and required attribution. If rights remain unknown, replace or remove originals **and derived files**. Because earlier files are in history, deleting only the current version is insufficient when publishing that history. Preparing sanitized history requires a separate decision; no history rewriting was performed here. This finding does not presume the files are unlawful.

### P1 — Address npm alerts before exposing contributor tools {#npm-advisories}

The 9 October `npm audit --json` flags **21 packages**: 3 critical, 14 high and 4 moderate. Counts include transitive parents of the same advisory, not 21 independent vulnerabilities. Most are development dependencies.

| Locked path                                                    | Finding                                                                                                                       | Follow-up                                                                                                                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Angular CLI/build 22.1.x → `piscina 5.2.0`                     | [Prototype-pollution advisory](https://github.com/advisories/GHSA-67c8-pqhq-4rmx), rated critical by the audit                | Update the Angular toolchain compatibly and rerun builds/tests; no exploitation demonstrated in this project                                                                                      |
| VitePress 1.6.4 → Vite 5.4.21                                  | Development-server advisories, including [Windows `server.fs.deny` bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | Find a patched, compatible VitePress/Vite combination; current servers bind loopback and must not be exposed to the network                                                                       |
| Storybook → `webpack-dev-middleware 6.1.3`; another copy 8.0.3 | [Path-traversal advisory](https://github.com/advisories/GHSA-g84c-rxfj-3j2c)                                                  | Resolve a compatible dependency and check `publicPath` conditions, then rebuild the catalogue                                                                                                     |
| `@angular/router 22.1.7`                                       | Only alert from `npm audit --omit=dev`                                                                                        | [SSR advisory](https://github.com/advisories/GHSA-ff3f-86qr-9cv3): this project uses a client Angular application with hash routes and no SSR; the current architecture does not expose this path |

Do not blindly run `npm audit fix --force`: the audit suggests an older Storybook major and offers no compatible automatic VitePress fix. Update coherent dependency groups, inspect results, and document remaining alerts with their applicability. `.npmrc:3` disables automatic audits; CI has no dedicated dependency check.

### P1 — Fix the XML reader used for Excel imports {#rust-xml-advisories}

An OSV check of 475 crates.io versions in the lockfile identifies `quick-xml 0.39.4`, a dependency of `calamine 0.34.0`, in the Windows graph. [RUSTSEC-2026-0194](https://rustsec.org/advisories/RUSTSEC-2026-0194.html) describes quadratic attribute checking, fixed from 0.41.0. Attribute calls with default checking are present in Calamine's XLSX reader; the application calls it in `src-tauri/src/exchange.rs:100`.

Update Calamine and its parser to a patched combination, then test imports with bounded size/cost fixtures. No workload intended to stall the computer was executed.

The same version is flagged by [RUSTSEC-2026-0195](https://rustsec.org/advisories/RUSTSEC-2026-0195.html), which concerns `NsReader`. No `NsReader` use was found in this Calamine path; that second alert is not presented as demonstrated exploitation. Five `unic-*` alerts in the Windows graph identify unmaintained packages, not five newly proven vulnerabilities. The lockfile's GLib and `proc-macro-error` alerts are outside the checked Windows graph.

## Hardening before a public alpha {#public-alpha-hardening}

### P2 — Bound imports before allocation {#import-bounds}

`exchange.rs:60` caps the file at 25 MB, then `worksheet_range` at line 102 materializes the sheet **before** the dimension check at line 103. In Calamine 0.34.0, `Range::from_sparse` allocates a grid from cell bounds. A small compressed XLSX or sparse sheet can therefore demand much more memory than its disk size. This path has no explicit sheet-count or total decompressed-size budget.

Add preflight checks for decompressed bytes, entries and cell bounds, with a cumulative workbook budget. Consider isolated processing with effective interruption for non-cooperative parsers. This finding comes from application and dependency source, not a memory-exhaustion test on this computer. Existing transactional rejections protect written state without preventing earlier allocation.

### P2 — Add contribution and security policies {#community-and-security}

No tracked `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates or Dependabot/Renovate configuration. Document validation commands, Windows scope, fictional fixtures and screenshot update protocol. Define a private reporting channel with a real contact and supported versions; do not invite personal backups in public issues. Add contribution rules and a code of conduct appropriate to project governance.

`.github/workflows/windows.yml` has no explicit token permissions and references actions by tags. Declare necessary permissions, pin actions by SHA and automate updates; GitHub [recommends SHA pinning](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats). Add historical secret checks, npm/Rust audits and `npm run check:avatar`. Remote branch/secret protection settings and GitHub job status could not be verified here.

### P2 — Make repository onboarding accurate for a fresh clone {#new-clone-documentation}

`README.md:9–15` announces packages in `release/`, but that directory is ignored and absent from tracked files. Provide verified GitHub Releases links if packages exist, or describe building from source. Do not present local artifacts as available in a clone.

`docs/native-dashboard.png` still shows the former diamond branding, which current code has removed. Replace it with a current fictional capture and make an English installation/limitations summary directly accessible from the README. VitePress FR/EN guides, Storybook and four-format captures already exist.

## Work that can follow source publication {#after-source-publication}

- Index import lookups: `exchange.rs:452` scans all observations for each input row. Cost grows with existing and incoming rows.
- Replace whole-snapshot writes: `store.rs:29–37` and `store.rs:120` process the full snapshot for ordinary mutations. Transactions/revisions protect conflicts; scaling remains the issue.
- Extract Target and mapping/import editors from large Angular pages, reuse real components in Storybook and verify Rust/TypeScript contract parity. See the [refactoring review](./refactoring-review-2026-10-07.md).
- Revisit absolute paths and metadata in Blender sources for portability. Historical text scanning found no personal user paths; workspace paths found in Blender files are not classified as secrets.

These refactorings do not require a general rewrite before an initial publication.

## Separate installer release criteria {#installer-release}

Before advertising a ready Windows release: rebuild packages from the published commit, provide version, hashes and notices, test installation/update/uninstallation in an offline Windows 11 VM, and decide binary signing. Documented local packages are unsigned and have not been rebuilt for recent changes. CI builds the standard package, without VM testing or offline packaging in this workflow.

The absence of application encryption is documented: protection relies on the Windows session and file access. Keep this visible in communications. It is not a licensing defect or a reason to require cloud storage. Scientific projections can remain disabled in an open source alpha; activation still depends on the [model card's criteria](./model-card.md).

## Checks and limits {#review-validation}

- Clean tree at the start; 404 tracked files. No SQLite database or recognized credential filename among tracked files.
- 289 distinct text blobs in reachable history checked for GitHub/OpenAI/AWS tokens, private keys and credential assignments: no matches. This heuristic check does not replace Gitleaks/TruffleHog, prove absence of secrets in binaries, or cover inaccessible remote history.
- README capture inspected: explicitly fictional demonstration. Blender metadata examined with patterns; no personal data opened.
- Full and production npm audits executed; OSV queried only with public dependency names/versions. Cargo graph resolved for `x86_64-pc-windows-msvc` to distinguish off-target advisories. This is neither exhaustive exploitability analysis nor a full Cargo audit with license policy.
- `cargo test --locked --offline --manifest-path src-tauri/Cargo.toml`: **22 tests passed** in this review. The last visual pipeline at the same application commit had **220 passing tests**, and seven presentation tests passed before this review; the complete native/UI suite and a clean VM were not rerun here.
- Review documentation: formatting, type checks, parity of **12 pages per language** and VitePress build passed; **34 documentation Playwright tests passed**, with no visual baseline updates.
- This review changes only two report pages and their navigation entry. No dependency fix, license choice, asset replacement, Git history rewrite or publication performed.
