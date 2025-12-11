# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-11

### Added
- Native screenshot capture functionality within the extension ([#76](https://github.com/rtCamp/godam-chrome-extension/pull/76))
- PostHog analytics integration for deeper user interaction and behavior tracking ([#78](https://github.com/rtCamp/godam-chrome-extension/pull/78))

### Changed
- Automatic recording quality selection based on available device resources ([#80](https://github.com/rtCamp/godam-chrome-extension/pull/80))
- General refactors and maintainability upgrades to the codebase ([#84](https://github.com/rtCamp/godam-chrome-extension/pull/84))

### Fixed
- Audio loss issues across tab, window, and full-screen recording scenario ([#89](https://github.com/rtCamp/godam-chrome-extension/pull/89))

## [1.1.4] - 2025-10-24

### Fixed
- Environment variables for production in final build ([#73](https://github.com/rtCamp/godam-chrome-extension/pull/73))

## [1.1.2] - 2024-10-01

### Fixed
- Device permission handling for cases with no video devices ([#65](https://github.com/rtCamp/godam-chrome-extension/pull/65))

## [1.1.1] - 2024-09-16

### Changed
- Renamed backup directory structure ([#55](https://github.com/rtCamp/godam-chrome-extension/pull/55))

### Fixed
- Playground page logout issue for logged out users ([#56](https://github.com/rtCamp/godam-chrome-extension/pull/56))
- Empty organization dropdown handling ([#57](https://github.com/rtCamp/godam-chrome-extension/pull/57))
- Users with no organization can now use the extension ([#57](https://github.com/rtCamp/godam-chrome-extension/pull/57))

### Security
- Updated form-data dependency from 4.0.0 to 4.0.4 ([#54](https://github.com/rtCamp/godam-chrome-extension/pull/54))

## [1.0.3] - 2024-08-01

### Fixed
- Recording hitches during screen capture ([#31](https://github.com/rtCamp/godam-chrome-extension/pull/31))
- Video playback issues on iOS devices ([#31](https://github.com/rtCamp/godam-chrome-extension/pull/31))

## [1.0.2] - 2024-07-11

### Changed
- Updated icon assets ([#29](https://github.com/rtCamp/godam-chrome-extension/pull/29))

### Fixed
- Login and logout flow for users who are already logged in ([#23](https://github.com/rtCamp/godam-chrome-extension/pull/23))
- Build routine and webpack configuration ([#26](https://github.com/rtCamp/godam-chrome-extension/pull/26))
