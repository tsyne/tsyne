# Contributing to Tsyne

Thank you for considering contributing to Tsyne!

## Getting Started

See [BUILDING.md](BUILDING.md) for prerequisites and build instructions.

**Quick bootstrap:**
```bash
git clone https://github.com/paul-hammant/tsyne.git
cd tsyne
./ci.sh --skip-tests  # Build everything
./ci.sh               # Build + run all tests
```

## Project Structure

```
tsyne/
├── core/             # Core TypeScript library
│   └── src/          # Widgets, bridge, context
├── bridge/           # Go bridge (IPC with Fyne)
├── designer/         # Visual design tool
├── examples/         # Example applications
├── phone-apps/       # Mobile app examples
├── ported-apps/      # Apps ported to Tsyne
└── docs/             # Documentation
```

## Making Changes

### Adding New Widgets

1. **Go Bridge** (`bridge/`): Add message handler
2. **TypeScript** (`core/src/widgets/`): Add widget class
3. **Export** from `core/src/index.ts`
4. **Test** in `examples/` or `core/src/__tests__/`

### Code Style

- **TypeScript**: Strict mode, JSDoc for public APIs
- **Go**: Standard formatting (`go fmt`)
- AI-assisted development is welcome

## Testing

```bash
# All tests
./ci.sh

# Specific test
npx jest path/to/test.ts --runInBand

# Visual debugging
TSYNE_HEADED=1 npx jest path/to/test.ts
```

**Include tests with your changes.** AI tools are fine for writing tests.

## Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and add tests
3. Run `./ci.sh` to verify
4. Push and create PR

## Design Principles

1. **Pseudo-declarative MVC** - Declarative UI where model changes update the view
2. **Elegant Syntax** - Terse API (e.g., `a` for app instance)
3. **Type Safety** - Full TypeScript support
4. **Cross-Platform** - macOS, Windows, Linux

We're open to "Tsyne could also have..." modes that don't break existing functionality.

## Questions?

- Check [ARCHITECTURE.md](ARCHITECTURE.md)
- Review examples in `examples/`
- Open an issue

**When filing issues:**
- Say what you searched for that didn't help
- Include AI tool responses if consulted
- Provide reproduction steps

## License

Contributions are licensed under the MIT License.
