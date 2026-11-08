# Specifications {#specifications}

These documents describe the behavior of the code currently in the repository. A reference on a declaration points to the corresponding technical contract; it does not by itself prove that the behavior is covered by a test. The user guides and validation documents remain the references for usage and completed checks. Contract identifiers are defined in the canonical specification documents.

## Functional {#fonctionnel}

- [Interface and user flows](./specs/frontend-functional.md): profiles, journal, habits, scenes and preferences.
- [Data and native operations](./specs/rust-fonctionnelle.md): persistence, exchange and scientific limits.
- [Mobile companion](./specs/companion-functional.md): local entry, pairing and synchronization.

## Technical {#technique}

- [Angular front end and 3D scene](./specs/frontend-technical.md).
- [Rust services and storage](./specs/rust-technique.md).
- [Mobile companion](./specs/companion-technical.md).
- [Tools and tests](./specs/tooling-technical.md).

Contract identifiers are unique. Several functions may participate in the same contract; methods carry their own references. Third-party libraries, generated files and binary assets are outside the maintained scope.

## Limits and maintenance {#limites-et-evolution}

Annotations are documentation links, not proof of execution, security or compliance. Anonymous functions and code produced by generators or macros may fall outside the index. When behavior changes, update the relevant section, annotation if needed and appropriate tests. The [validation guide](./validation.md) describes local checks.
