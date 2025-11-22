---
layout: post
title: "Pseudo-Declarative UI: Three Calculator Implementations Compared"
date: 2025-01-XX
tags: [ruby, typescript, dsl, ui, declarative]
---

In a [previous post](/2024/02/14/that-ruby-and-groovy-language-feature/), I explored how Ruby and Groovy's block syntax enables elegant domain-specific languages. Today I want to compare three calculator implementations that demonstrate "pseudo-declarative" UI patterns - code that reads like markup but executes as imperative logic.

## What is Pseudo-Declarative?

True declarative UI (HTML, XAML, SwiftUI) separates structure from behavior. You declare *what* you want, not *how* to build it. But many frameworks use imperative language features - blocks, closures, callbacks - to achieve a declarative *feel* while remaining executable code.

The result: UI hierarchies that nest naturally and read top-to-bottom, but with full programming language power inline.

## The Three Implementations

### 1. Ruby with Green Shoes

```ruby
Shoes.app(title: "My calculator", width: 200, height: 240) do
  number_field = nil
  @number = 0
  @op = nil
  @previous = 0

  flow width: 200, height: 240 do
    flow width: 0.7, height: 0.2 do
      background rgb(0, 157, 228)
      number_field = para @number, margin: 10
    end

    flow width: 0.3, height: 0.2 do
      button 'Clr', width: 1.0, height: 1.0 do
        @number = 0
        number_field.replace(@number)
      end
    end

    flow width: 1.0, height: 0.8 do
      background rgb(139, 206, 236)
      %w(7 8 9 + 4 5 6 - 1 2 3 / 0 . = *).each do |btn|
        button btn, width: 50, height: 50 do
          case btn
            when /[0-9]/
              @number = @number.to_i * 10 + btn.to_i
            when '='
              @number = @previous.send(@op, @number)
            else
              @previous, @number = @number, nil
              @op = btn
          end
          number_field.replace(@number)
        end
      end
    end
  end
end
```

<!-- screenshot: ruby-calculator.png -->

Ruby's `do...end` blocks and optional parentheses make this feel almost like configuration rather than code. The `%w()` array literal and `.each` loop generate 16 buttons in a few lines. Note how `@previous.send(@op, @number)` uses Ruby's dynamic dispatch - the operator *is* the method name.

### 2. TypeScript with Tsyne (Functional Style)

```typescript
app.window({ title: "Calculator" }, () => {
  app.vbox(() => {
    display = app.label("0");

    app.grid(4, () => {
      [..."789"].forEach(n => app.button(n, () => handleNumber(n)));
      app.button("÷", () => handleOperator("/"));
      [..."456"].forEach(n => app.button(n, () => handleNumber(n)));
      app.button("×", () => handleOperator("*"));
      [..."123"].forEach(n => app.button(n, () => handleNumber(n)));
      app.button("-", () => handleOperator("-"));
      app.button("0", () => handleNumber("0"));
      app.button("Clr", () => clear());
      app.button("=", () => calculate());
      app.button("+", () => handleOperator("+"));
    });
  });
});
```

<!-- screenshot: tsyne-calculator.png -->

TypeScript's arrow functions serve as blocks: `() => { ... }`. The spread operator `[..."789"]` creates a character array for iteration. A `grid(4, ...)` helper abstracts the layout. The structure is clear, but `() =>` and curly braces add visual noise compared to Ruby.

### 3. TypeScript with Tsyne (Class-based, Testable)

```typescript
export class Calculator {
  constructor(private tsyneApp: App) {}

  build(): void {
    this.tsyneApp.window({ title: "Calculator" }, () => {
      this.tsyneApp.vbox(() => {
        this.display = this.tsyneApp.label("0");

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("7", () => this.handleNumber("7"));
          this.tsyneApp.button("8", () => this.handleNumber("8"));
          this.tsyneApp.button("9", () => this.handleNumber("9"));
          this.tsyneApp.button("÷", () => this.handleOperator("÷"));
        });

        this.tsyneApp.hbox(() => {
          this.tsyneApp.button("4", () => this.handleNumber("4"));
          // ... more rows
        });
      });
    });
  }
}
```

<!-- screenshot: tsyne-calculator-advanced.png -->

This version injects the `App` instance, making it testable. Each button is declared explicitly - more verbose but maximally readable. The `this.tsyneApp.` prefix on every call is the cost of dependency injection in TypeScript.

## Side-by-Side Comparison

| Aspect | Ruby Shoes | TS Functional | TS Class-based |
|--------|-----------|---------------|----------------|
| Block syntax | `do...end` | `() => {}` | `() => {}` |
| Nesting clarity | Excellent | Good | Fair (`this.` noise) |
| Button generation | `%w().each` | `[...].forEach` | Explicit |
| State management | Instance vars | Module globals | Class members |
| Testability | Poor | Poor | Good (DI) |
| Lines of code | ~35 | ~96 | ~168 |

## The Tradeoffs

**Ruby wins on syntax.** Matz designed Ruby for DSLs. Blocks feel native. Named parameters read like attributes. The calculator is 35 lines of code that genuinely looks like a UI specification.

**TypeScript wins on tooling.** Type checking, IDE autocomplete, refactoring support. The arrow function ceremony is the price of admission to a statically-typed ecosystem.

**The class-based version wins on architecture.** Dependency injection enables testing without a real GUI. You can mock the `App` and verify button creation, handler wiring, display updates. The functional versions couple UI building to global state.

## What Makes It "Pseudo"?

These aren't declarative in the React/SwiftUI sense. There's no virtual DOM, no diffing, no reactive updates. The code executes top-to-bottom, imperatively building a widget tree.

But the *shape* is declarative:
- Nesting reflects containment
- Reading top-to-bottom reveals structure
- Handlers are co-located with their widgets

It's the difference between *describing* a UI and *instructing* a framework to build one. The pseudo-declarative style blurs that line - you're writing instructions that read like descriptions.

## Conclusion

The pseudo-declarative pattern works in any language with closures, but some languages wear it better than others. Ruby's syntax disappears; TypeScript's syntax is always visible.

For quick scripts and prototypes, Ruby's elegance is hard to beat. For production applications where you need type safety, testing, and tooling, TypeScript's verbosity is a reasonable trade.

The interesting question: could a TypeScript DSL get closer to Ruby's elegance? Template literals, builder patterns, or even a compile-time transform might close the gap. That's a topic for another post.

---

*The Tsyne framework used in the TypeScript examples is available at [github link]. The Ruby example uses Green Shoes.*
