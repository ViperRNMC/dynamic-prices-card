# Changelog

Alle belangrijke wijzigingen in dit project worden gedocumenteerd in dit bestand.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/),
en dit project volgt [Semantic Versioning](https://semver.org/lang/nl/).

## [Unreleased]

## [2025.10.1] - 2025-09-30

### Added
- Dual layout system: Bars layout en Timeline layout
- Smart price highlighting met dynamic peak/valley detection
- Multi-language support (EN/NL/DE/FR) met externe translation files
- Rich color themes (6 verschillende thema's)
- Flexible configuration met expandable sections en live preview
- Layout en color theme separation
- Configureerbare highlight count (1-12 perioden)
- Tooltip support met price details
- Comprehensive localization systeem

### Changed
- Renamed ideal_time_mode naar highlight_mode voor meer logische naming
- Renamed ideal_time_count naar max_highlights
- Separated layout style van color themes
- Removed tomorrow functionality (show_tomorrow en tomorrow_entity)
- Updated configuration form met betere labels en sectie-indeling
- Complete herstructurering van de codebase

### Removed
- Tomorrow entity support (vereenvoudiging)
- Separate timeline/compact/dynamic modes (geconsolideerd naar bars/timeline)
- Development files niet nodig voor HACS distributie
