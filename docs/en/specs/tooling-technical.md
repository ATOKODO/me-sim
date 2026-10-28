---
kind: technical
title: Tools and checks — technical contracts
---
# Development tools

The canonical technical identifiers are defined in the [French specification](../../specs/tooling-technical.md).

## Documentation navigation

`navigation(language)` receives `fr` or `en` and builds the VitePress navigation and sidebar configuration in that language. Its `t(fr, english)` function selects the string, and `path(page)` prefixes English paths with `/en/`. These functions construct values; they do not check whether the pages exist.

## Validation scripts and processes

These scripts run on the development machine and report failure with an error or nonzero exit code; they are not features of the distributed application.

- `pages(folder)` lists and sorts immediate Markdown files; `flatten(nodes)` recursively flattens the heading tree; `sections(file)` renders Markdown and returns heading levels and identifiers. The check compares French and English filenames and anchors and fails on a mismatch or read error.
- `property(object, name)` finds a property of a literal parsed by TypeScript; `visit(node)` walks the tree and extracts event metrics for animation manifest validation. An invalid manifest, GLB file or clip makes validation fail.
- `spawnNode(file, params, options)` starts a Node program and tracks its process until closure. `run` waits for completion and rejects on failure or interruption. `startServer(file, marker, env)` waits for startup text and rejects if the process fails or after 20 seconds. `stopChildren()` terminates tracked processes and waits at most five seconds per process. These operations are used by local visual validation.
- The `capture`, `read` and `state` functions in native smoke scripts retrieve Windows application state for the corresponding scenario assertions; access errors and assertion failures are reported by the calling script.

## Functional and visual test helpers

These functions prepare reproducible scenarios and expose errors to Playwright tests. They do not modify end-user data.

- `sampleAnimatedGlb`, `gate`, `pendingRequest` and the avatar test `capture` functions provide a test model, an asynchronous gate, a request state or a rendering measurement respectively, to check loading and scene behavior.
- `freezeAvatar`, `orbit` and `captureCamera` prepare or inspect the camera on a test page; `draws` and `expectStopped` record and verify that rendering stops. A failed Playwright wait or assertion fails the test.
- `row`, `snapshot`, `native` and `profile` create fictional data or prepare the browser context needed by their journal, ghost and profile scenarios. Data remains specific to the test scenario.
- `snapshotPath(category, width, height, language, theme, ...file)` returns the reference path segments, including the device name when its size matches a reference resolution; otherwise it uses the resolution alone.
- In application visual tests, `prepare(page, theme, language, width, height)` sets the display context and preferences; `navigate(page, route, language)` opens the route and checks the heading and scene controls. `translated(source)` selects the expected label for the language. Canvas pixels are hidden in these captures; 3D interactions are checked separately.
- In documentation tests, `path(language, name)` constructs the page path; `prepare(page, theme)` sets the theme and `ready(page, language, name)` waits for the language, heading and fonts. Read or matching errors fail the test.

## Art asset preparation

These Python functions are used during asset generation and require the script’s environment: Pillow for icons and Blender for avatar preparation. Dependency, geometry and file-access errors are propagated.

- `quadratic(start, control, end, steps)` yields points on a quadratic Bézier curve, including both endpoints, to draw installable icons.
- `add_prop`, `solid`, `bind`, `box` and `sphere` respectively add an accessory bone, a material, an armature binding, and box or sphere geometry. They use the objects and Blender scene prepared by the script.
- `rotate`, `translate` and `visible` set bone transforms or accessory visibility; `sit`, `hands_forward`, `aim_bone`, `reach` and `pose` compose animation poses from the skeleton and targets supplied or prepared by the script.
