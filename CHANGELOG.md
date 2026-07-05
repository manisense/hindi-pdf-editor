# Changelog

All notable changes to this project are documented here, grouped by phase (see `hindi-pdf-editor-spec.md` Section 10 for the phase definitions). Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — Pre-Phase 0

### Docs
- Wrote `hindi-pdf-editor-spec.md`: architecture ("Render & Print" via WebView/Chromium print pipeline), data model, module specs, and phased build plan (Phase 0–5).
- Wrote `AGENTS.md`: non-negotiable architecture rules, code quality bar, security/safety checks, performance constraints, testing approach, and this documentation practice itself.
- Finalized and version-pinned the tech stack (spec Section 4): Expo SDK 56, `react-native-pdf` 7.0.4, `expo-print`, `@cantoo/pdf-lib` 2.7.1, `zustand` 5.0.14, plus supporting first-party Expo modules. See `docs/decisions/` for the reasoning behind the non-obvious swaps.

### Chore — initial project scaffold
- Fixed a broken local Homebrew `watchman` install (stale `libfmt` dylib link).
- Scaffolded the Expo project (TypeScript template), pinned down from the default SDK 57 to **SDK 56** per ADR 0002.
- Installed the full pinned dependency set from spec Section 4.1; corrected `app.json`'s Android package identity (was auto-generated as `com.medikle.hpescaffold`, now `com.manisense.hindipdfeditor`).
- Set up ESLint (flat config, `eslint-config-expo`), Prettier, and Jest (`jest-expo`) — had to pin `eslint` to `^9.18.0` (the `eslint-config-expo`-bundled `eslint-plugin-react` isn't compatible with ESLint 10's removal of the deprecated `context.getFilename()` API) and add the `@react-native/jest-preset` peer dependency `jest-expo` now requires separately.
- Ran `expo prebuild -p android` to generate the native Android project; confirmed `newArchEnabled=true` (New Architecture is mandatory on this SDK, matching ADR 0002).
- Downloaded Noto Sans/Serif Devanagari fonts — first attempt from `notofonts/devanagari`'s assumed raw path silently downloaded HTML error pages instead of font binaries (caught by checking `file` output, not by trusting the download succeeded). Switched to the `google/fonts` repo, which ships these two families as **variable fonts** (`wght`/`wdth` axes) rather than separate static Regular/Bold files — spec Section 4.1/6 updated to match.

### Known issue found during scaffolding
- **`react-native-pdf-page-image@0.2.1` fails to build** (`./gradlew assembleDebug`) — its own `android/build.gradle` pins an isolated, ancient Android Gradle Plugin (3.5.4, ~2019/2020) whose bundled HTTP client can't complete a TLS handshake against Maven Central under the current Gradle 9.x/JDK 17 toolchain. Confirmed not a network fluke (`curl` reaches the same URL instantly). This is the exact risk spec Section 4.2 flagged before any code was written — now confirmed rather than theoretical. Resolution (patch the dependency vs. build the in-house `PdfRenderer` fallback) is a pending decision; see spec Section 4.2 and Section 10 Phase 0.

<!--
Template for each future phase, add above this line as phases complete:

## [Phase N] — <short phase name from spec Section 10>

### Added
-

### Changed
-

### Fixed
-
-->
