# ELIZA - Classic Pattern Matching Chatbot

A Tsyne implementation of Joseph Weizenbaum's 1966 ELIZA chatbot, demonstrating pattern matching and symbolic processing.

![ELIZA Screenshot](screenshots/eliza-chat.png)

## About ELIZA

ELIZA was created at MIT in 1966 and simulates a Rogerian psychotherapist using pattern matching and transformation rules. It's one of the earliest examples of natural language processing and demonstrates how simple pattern matching can create the illusion of understanding.

## Features

- Over 20 keyword patterns with multiple response templates
- Pronoun reflection system (I -> you, my -> your, etc.)
- Wildcard pattern matching with captures
- Debug mode showing pattern matching details
- Clear conversation option
- Works on both mobile and desktop

## Controls

- **Clear**: Reset the conversation
- **Debug**: Toggle debug mode to see pattern matching details
- **Send**: Send your message (or press Enter)

## Classic Inputs to Try

- "I am feeling sad"
- "I remember my childhood"
- "I have a dream"
- "My mother doesn't understand me"
- "I can't do anything right"
- "You don't like me"
- "Are you a computer?"

## How It Works

### Pattern Matching

ELIZA uses a keyword-based system with wildcards:

```
Pattern: "* i am * sad *"
Input:   "well i am feeling sad today"
Matches: ["well", "feeling", "today"]
```

### Reflection

Pronouns are transformed for natural responses:

- "I" -> "you"
- "my" -> "your"
- "am" -> "are"
- "me" -> "you"

### Example

```
User: I am feeling sad
Pattern: "* i am * sad *" (rank 1)
Captures: ["", "feeling", ""]
Reflection: "feeling" -> "feeling"
Response: "I'm sure it's not pleasant to be feeling."
```

## Debug Mode

Enable debug mode to see:
- The pattern that matched your input
- The rank/priority of that pattern
- The wildcard captures from your message

## Historical Significance

ELIZA was groundbreaking in demonstrating:

1. Simple rules can create an illusion of intelligence
2. Pattern matching for language processing
3. Human tendency to anthropomorphize computers
4. Power of reflection and open-ended questions

Many users became emotionally attached to ELIZA, revealing insights about human-computer interaction that remain relevant today.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > scroll(messages) + hbox(input + send button)` nesting. Chat UI layout |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 9 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | Messages appended imperatively, not loop-generated |
| **State architecture** | Observable store | 2/10 | No Observable store. Chat state managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 3 `setText()` calls |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `removeAll()` for clearing chat |
| **Testing** | `.withId()` coverage | 5/10 | IDs on input, send button, message container |
| **Design** | Separation of concerns | 6/10 | ELIZA pattern matching engine separated from chat UI |
| | **Overall** | **4/10** | Simple chat UI with ELIZA engine. No reactive patterns — messages appended imperatively |

## References

- Weizenbaum, Joseph (1966). "ELIZA—A Computer Program For the Study of Natural Language Communication Between Man And Machine". *Communications of the ACM*. 9 (1): 36–45.
