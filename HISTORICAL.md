# Historical Context and Influences

Tsyne draws inspiration from several groundbreaking UI frameworks and design patterns that have shaped how developers build desktop applications. This document explores these influences and how they shaped Tsyne's design.

## Ruby Shoes DSL

[Ruby Shoes](http://shoesrb.com/) pioneered the concept of pseudo-declarative desktop UI programming in Ruby. Created by _why the lucky stiff, Shoes demonstrated that GUI programming didn't need to be verbose and imperative.

**Classic Shoes (Ruby)**:
```ruby
Shoes.app do
  stack do
    para "Welcome to Shoes!"
    button "Click me" do
      alert "Button clicked!"
    end
  end
end
```

**Tsyne (TypeScript)**:
```typescript
app({ title: "Hello" }, (app) => {
  app.window({ title: "Hello" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label("Welcome to Tsyne!");
        app.button("Click me").onClick(() => { console.log("Button clicked!"); });
      });
    });
    win.show();
  });
});
```

### Key Concepts Borrowed from Shoes

1. **Closure-based nesting**: Using functions with closures to define hierarchical UI structures
2. **Terse syntax**: Minimal boilerplate - focus on what you want, not how to build it
3. **Event handlers inline**: Callbacks defined right where widgets are created
4. **Pseudo-declarative feel**: Looks declarative, but retains full imperative power

Shoes proved that desktop UI code could be as elegant and expressive as web markup, without sacrificing the power of a full programming language.

## Ruby/Groovy DSL Patterns

Paul Hammant's [blog post on Ruby and Groovy language features](https://paulhammant.com/2024/02/14/that-ruby-and-groovy-language-feature) explains the pattern that enables pseudo-declarative DSLs using closures and implicit context.

**The Pattern**:
- A builder function accepts a closure/callback
- Inside the callback, methods are available in scope
- These methods build up structure while feeling declarative
- The result is terse, readable code that "reads like a sentence"

**Groovy Example**:
```groovy
html {
  head {
    title "My Page"
  }
  body {
    div(class: "container") {
      p "Hello World"
    }
  }
}
```

**Tsyne Adaptation**:
```typescript
app.vbox(() => {
  app.label("My Page");
  app.hbox(() => {
    app.button("Hello World").onClick(() => {});
  });
});
```

This pattern allows Tsyne to feel declarative while maintaining TypeScript's type safety and IDE autocomplete support.

## QML with Inline JavaScript

[Qt QML](https://doc.qt.io/qt-6/qml-tutorial.html) demonstrated how to seamlessly blend declarative UI markup with imperative JavaScript for event handlers and business logic.

**QML Example**:
```qml
Rectangle {
    width: 200
    height: 200
    color: "blue"

    Text {
        text: "Click me!"
        anchors.centerIn: parent
    }

    MouseArea {
        anchors.fill: parent
        onClicked: {
            console.log("Clicked!");
            color = "red";
        }
    }
}
```

### QML's Influence on Tsyne

1. **Inline event handlers**: JavaScript callbacks defined directly in UI structure
2. **Seamless integration**: No impedance mismatch between declarative and imperative code
3. **Property bindings**: Reactive updates when state changes (adapted in Tsyne's ObservableState)
4. **Component composition**: Reusable UI components with encapsulated logic

Tsyne adapts QML's philosophy of "declarative where possible, imperative when needed" to pure TypeScript.

## Playwright Testing API

[Playwright](https://playwright.dev/) revolutionized browser testing with its elegant, type-safe API that made writing tests feel natural and readable.

**Playwright Example**:
```typescript
await page.getByText('Submit').click();
await expect(page.getByText('Success')).toBeVisible();
await page.getByPlaceholder('Email').fill('test@example.com');
```

**Tsyne's TsyneTest**:
```typescript
await ctx.getByText('Submit').click();
await ctx.expect(ctx.getByText('Success')).toBeVisible();
await ctx.getByType('entry').type('test@example.com');
```

### Playwright's Influence on TsyneTest

1. **Fluent locator API**: `getByText()`, `getByID()`, `getByType()` - readable and chainable
2. **Expect assertions**: Natural language assertions that read like English
3. **Retry logic built-in**: Automatic retries for flaky tests (adapted in `within()`)
4. **Headed/headless modes**: Visual debugging vs CI/CD speed

TsyneTest brings Playwright's developer-friendly testing experience to desktop GUI applications.

## Swing and Desktop UI Patterns

Java Swing established many patterns for desktop UI architecture that remain relevant today, particularly MVC (Model-View-Controller).

**Swing's Contributions to Tsyne**:

1. **Widget-based architecture**: Composable UI components (buttons, labels, containers)
2. **Event-driven programming**: Listeners and callbacks for user interactions
3. **Layout managers**: Flexible layouts (VBox, HBox, Grid) instead of fixed positioning
4. **MVC pattern**: Separation of business logic, UI presentation, and user interaction

**Pseudo-Declarative Swing Testing**:

Paul Hammant's [swing_component_testing](https://github.com/paul-hammant/swing_component_testing) demonstrated that even verbose frameworks like Swing could benefit from declarative testing DSLs. This influenced TsyneTest's design.

## Swiby - Ruby/Swing Integration

Tsyne's styling system is inspired by Swiby's elegant stylesheet approach:

**Swiby (Ruby/Swing)**:
```ruby
styles {
  root(
    :font_family => Styles::VERDANA,
    :font_size => 10
  )
  label(
    :font_style => :italic,
    :color => 0xAA0000
  )
}
```

**Tsyne (TypeScript/Fyne)**:
```typescript
styles({
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_size: 10
  },
  label: {
    font_style: FontStyle.ITALIC,
    color: 0xAA0000
  }
});
```

Both frameworks share the philosophy of separating presentation (stylesheets) from structure (UI code), enabling clean, maintainable applications.

### Swiby's Influence on Tsyne

Swiby demonstrated that desktop UI frameworks could provide:
1. **Declarative styling** separate from UI structure
2. **Elegant DSL patterns** for defining visual properties
3. **Type-safe styling** with constants for fonts and colors
4. **Browser-like page loading** for dynamic UIs

Tsyne adapts these concepts to the TypeScript/Fyne ecosystem while respecting platform constraints.

## Fyne - Modern Go UI Toolkit

[Fyne](https://fyne.io/) provides the underlying native UI rendering for Tsyne. Fyne's design philosophy aligns perfectly with Tsyne's goals:

1. **Cross-platform**: Single codebase for macOS, Windows, Linux
2. **Native performance**: No web view or JavaScript - pure native widgets
3. **Material Design**: Modern, consistent look and feel
4. **Simple API**: Easy to use, hard to misuse

Tsyne bridges Fyne's Go API to TypeScript, bringing Fyne's power to the Node.js ecosystem.

## Synthesis: Why Tsyne?

Tsyne combines the best ideas from these frameworks:

- **Ruby Shoes**: Elegant, terse syntax with closures
- **Ruby/Groovy DSLs**: Pseudo-declarative builder pattern
- **QML**: Seamless declarative/imperative integration
- **Playwright**: Developer-friendly testing API
- **Swing**: Proven desktop UI patterns (MVC, widgets, layouts)
- **Swiby**: CSS-like styling separate from structure
- **Fyne**: Modern, cross-platform native UI rendering

The result is a framework that feels familiar to web developers (closure-based syntax, testing API) while embracing desktop UI best practices (MVC, native widgets, performance).

## Acknowledgments

- **_why the lucky stiff** - Creator of Ruby Shoes, pioneer of elegant DSL design
- **[Fyne Project](https://fyne.io/)** - The fantastic Go UI toolkit that powers Tsyne
- **Paul Hammant** - [Blog posts](https://paulhammant.com) on elegant DSL design, Swing testing patterns
- **The Ruby/Groovy communities** - Inspiring declarative UI patterns and DSL techniques
- **[Playwright Team](https://playwright.dev/)** - Inspiration for TsyneTest's API design
- **[Swiby Project](https://github.com/jeanlazarou/swiby)** - Ruby/Swing integration and stylesheet patterns
- **Qt/QML Team** - Demonstrating seamless declarative/imperative UI programming

## References

- [Ruby Shoes](http://shoesrb.com/) - Original elegant DSL for desktop GUIs
- [Swiby GitHub Repository](https://github.com/jeanlazarou/swiby) - Ruby/Swing integration
- [Ruby and Groovy DSL Language Features](https://paulhammant.com/2024/02/14/that-ruby-and-groovy-language-feature) - Paul Hammant's blog post
- [QML Tutorial](https://doc.qt.io/qt-6/qml-tutorial.html) - Qt's declarative UI language
- [Playwright Documentation](https://playwright.dev/) - Modern testing framework
- [Pseudo-declarative Swing Testing](https://github.com/paul-hammant/swing_component_testing) - Testing DSL for Swing
- [Fyne Documentation](https://docs.fyne.io/) - Modern Go UI toolkit
