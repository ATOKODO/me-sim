# Licenses and credits {#licences}

## Project and contributions {#projet}

Me-Sim's original code and documentation are under **AGPL-3.0-only**. See root `LICENSE` and `CREDITS.md`. Dependencies and third-party assets retain their own terms. This license does not apply to users' personal data.

External contributions and pull requests are currently not accepted. Cloning, forking, modifying and redistributing the code remain permitted under its license. See root `CONTRIBUTING.md`.

## Vinrax characters {#modeles}

[PSX Female Secretary Character](https://vinrax.itch.io/psx-secretary-character) and [PSX Casual Male Character](https://vinrax.itch.io/psx-casual-male-character), checked on 30 October 2026, permit use in projects with credit. `CREDITS.md` records the published wording and identifies FBX files, textures, Blender/GLB derivatives and renders. Me-Sim adds animations, accessories and conversions. The models are not relicensed under AGPL. Builds bundle the license, credits and inventory in `legal/`.

The published permission does not explicitly address redistribution of editable originals in a public source repository or sublicensing. Provenance and use with credit are established; obtain clarification from Vinrax before treating those additional rights as confirmed. No contact or Git history changes were made.

## Dependency compatibility {#dependances}

Review dated 30 October 2026 covered 1,187 npm lock entries and 318 Windows x64 Cargo packages. The current inventory contains **1,180 npm lock entries** (including development and optional platforms) and **318 Windows x64 Cargo packages**, including build dependencies. No missing license declarations were found. npm license declarations come from the lockfile, and installed package versions and declared licenses are checked when available. This scope is not exact binary composition. The versioned inventory is `licenses/dependencies.json`, without personal workstation paths.

| Group | Conclusion and conditions |
| --- | --- |
| MIT, ISC, BSD, Apache-2.0, 0BSD, Zlib, BSL-1.0, BlueOak-1.0.0 | No incompatibility with AGPLv3 identified in reviewed declarations. Preserve applicable licenses, copyrights, attributions and NOTICE files. OR allows a compatible alternative; AND requires every condition. |
| MPL-2.0 | 14 npm entries, notably axe-core and Lightning CSS tools, and 5 crates: cssparser 0.36.0, cssparser-macros 0.6.1, dtoa-short 0.3.5, option-ext 0.2.0, selectors 0.36.1. Inspected Rust sources do not carry the secondary-license exclusion marker. Section 3.3 allows combination with AGPLv3 under its conditions: preserve notices and provide sources with MPL rights, and secondary-license rights where applicable. Do not strip MPL from third-party components. |
| CC-BY-4.0 | caniuse-lite toolchain data: retain attribution and change indications when redistributing these data. |
| Python-2.0 | argparse 2.0.1 development tool: its supplied PSF text distinguishes historical incompatible Python versions. Do not confuse the SPDX identifier with a Python version. |
| Unicode-3.0, CC0-1.0, Unlicense | Preserve notices and permissions according to their texts; no incompatibility identified in this scope. |

Primary sources: [MPL sections 1.12 and 3.3](https://www.mozilla.org/en-US/MPL/2.0/), [Mozilla FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/), [GNU license list](https://www.gnu.org/licenses/license-list.html), [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html).

**No license incompatibility identified for reviewed dependencies, provided their obligations are met.** This declaration and special-case review is not a legal certification or an audit of every upstream source file. Some Cargo packages lack a root license file: retrieve upstream notices before binary distribution. This inventory is not a complete installer notice bundle. Other Cargo platforms still need review.

## Local checks and distribution {#controle}

After installing locked dependencies and caching crates:

```powershell
npm run licenses:inventory
npm run licenses:check
```

Generation uses lockfile declarations and Windows `cargo metadata --locked --offline`; it does not upload the graph. The check rejects missing declarations, installed versions or declared licenses differing from the lockfile, or a stale inventory. Both lockfile hashes are recorded. Optional packages installed on different platforms do not change the inventory. Review changes after every update: the script does not automatically prove compatibility.

Before publishing an installer, provide applicable texts and notices and access to the exact build's corresponding sources. For the companion and modified versions accessed over a network, provide an AGPL-compliant source offer; it can be served locally. See [GNU's instructions](https://www.gnu.org/licenses/gpl-howto.en.html).
