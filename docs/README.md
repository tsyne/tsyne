# Tsyne Documentation

Welcome to the Tsyne documentation directory. This README helps you navigate the available documentation.

## Quick Navigation

### 🚀 Getting Started

- **[reference.md](reference.md)** - **START HERE!** Complete technical reference with all core concepts, widgets, and API
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute quick start guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Deep dive into internal architecture

### 🏗️ Development Guides

- **[PATTERNS.md](PATTERNS.md)** - Architectural patterns (MVC, MVVM, MVP)
- **[TESTING.md](TESTING.md)** - TsyneTest framework and testing strategies
- **[PUBLISHING.md](PUBLISHING.md)** - How to publish Tsyne packages to npm

### 📋 Planning & Roadmap

- **[ROADMAP.md](ROADMAP.md)** - Feature roadmap and implementation status (~15% Fyne coverage)
- **[TODO.md](TODO.md)** - Technical debt and infrastructure improvements
- **[PROS_AND_CONS.md](PROS_AND_CONS.md)** - Honest comparison with Electron/Tauri

### 🌐 Browser Mode

- **[Browser_TODO.md](Browser_TODO.md)** - Browser features TODO (inspired by 25+ years of web evolution)
- **[BROWSER_TESTING.md](BROWSER_TESTING.md)** - Browser mode testing guide
- **[WEB_FEATURE_MAPPING.md](WEB_FEATURE_MAPPING.md)** - How web features map to Tsyne equivalents

### 🔧 Specialized Topics

- **[SCREENSHOT_SUPPORT.md](SCREENSHOT_SUPPORT.md)** - Screenshot and image handling
- **[STREAMING_CONTENT.md](STREAMING_CONTENT.md)** - Streaming content patterns
- **[HTTP_IMAGE_FETCHING.md](HTTP_IMAGE_FETCHING.md)** - HTTP image loading
- **[OVERLAYS_AND_LAYERS.md](OVERLAYS_AND_LAYERS.md)** - Overlay and layer management
- **[INSPECTOR_DESIGN.md](INSPECTOR_DESIGN.md)** - Widget inspector design
- **[FYNE_KEYBOARD_SHORTCUTS_REQUEST.md](FYNE_KEYBOARD_SHORTCUTS_REQUEST.md)** - Keyboard shortcuts implementation plan
- **[SCREENSHOTS.md](SCREENSHOTS.md)** - Visual screenshots reference

## Documentation Organization

### Core Documentation (Read First)

1. **[reference.md](reference.md)** - Your one-stop reference
2. **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand how it works

### Development Documentation

4. **[PATTERNS.md](PATTERNS.md)** - Learn architectural patterns
5. **[TESTING.md](TESTING.md)** - Write tests with TsyneTest + Jest
6. **[ROADMAP.md](ROADMAP.md)** - See what's planned

### Specialized Documentation

The remaining docs cover specific features or subsystems:
- Browser mode (Browser_TODO.md, BROWSER_TESTING.md, WEB_FEATURE_MAPPING.md)
- Screenshots and images (SCREENSHOT_SUPPORT.md, HTTP_IMAGE_FETCHING.md, SCREENSHOTS.md)
- Advanced features (OVERLAYS_AND_LAYERS.md, INSPECTOR_DESIGN.md, STREAMING_CONTENT.md)
- Platform features (FYNE_KEYBOARD_SHORTCUTS_REQUEST.md)

## Recently Removed Documentation

The following docs were removed as they're now consolidated into [reference.md](reference.md) or are outdated:

- **LLM.md** - Duplicate of root LLM.md, content now in reference.md
- **TESTING_CHECKLIST.md** - Outdated testing checklist
- **TEST_REMEDIATION.md** - Temporary test remediation notes
- **WEB_FEATURES_IMPLEMENTATION_SUMMARY.md** - Browser-specific, largely outdated

## For LLMs and AI Assistants

If you're an LLM helping with Tsyne development:

1. **Start with**: [reference.md](reference.md) - complete API and concepts
2. **Check**: [ROADMAP.md](ROADMAP.md) - what's implemented vs. planned
3. **Refer to**: [ARCHITECTURE.md](ARCHITECTURE.md) - for internal details
4. **Testing**: [TESTING.md](TESTING.md) - TsyneTest + Jest patterns

The root `/LLM.md` file is the authoritative quick reference optimized for AI assistants.

## Contributing to Documentation

When adding new documentation:

1. Update this README.md with links to the new doc
2. Consider if content should be in reference.md instead
3. Keep specialized docs focused on one topic
4. Cross-reference related docs

## Documentation Philosophy

- **reference.md** is comprehensive - everything in one place
- **Specialized docs** cover specific subsystems in depth
- **Avoid duplication** - link to reference.md or other docs instead of repeating
- **Keep updated** - remove outdated docs, update roadmaps

---

**Last Updated:** 2025-11-15
**Documentation Version:** 0.1.0
