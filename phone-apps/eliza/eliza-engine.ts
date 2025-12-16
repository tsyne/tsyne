/**
 * ELIZA Pattern Matching Engine
 *
 * Classic 1966 chatbot by Joseph Weizenbaum, ported to TypeScript.
 * Demonstrates pattern matching and symbolic processing.
 */

// Word reflections for transforming user input to responses
const reflections: Record<string, string> = {
  i: 'you',
  me: 'you',
  my: 'your',
  am: 'are',
  "i'm": 'you are',
  "i'd": 'you would',
  "i've": 'you have',
  "i'll": 'you will',
  you: 'i',
  your: 'my',
  "you're": 'i am',
  "you've": 'i have',
  "you'll": 'i will',
  yours: 'mine',
  mine: 'yours',
  myself: 'yourself',
  yourself: 'myself',
  was: 'were',
  were: 'was',
};

// Pattern rules: keyword, rank, patterns with responses
interface PatternRule {
  keyword: string;
  rank: number;
  patterns: Array<{
    pattern: string;
    responses: string[];
  }>;
}

const patterns: PatternRule[] = [
  {
    keyword: 'hello',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          'How do you do. Please state your problem.',
          'Hello. What brings you here today?',
          "Hi there. What's on your mind?",
        ],
      },
    ],
  },
  {
    keyword: 'sorry',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          "Please don't apologize.",
          'Apologies are not necessary.',
          'What feelings do you have when you apologize?',
        ],
      },
    ],
  },
  {
    keyword: 'remember',
    rank: 5,
    patterns: [
      {
        pattern: '* remember *',
        responses: [
          'Do you often think of %1?',
          'Does thinking of %1 bring anything else to mind?',
          'What else do you remember?',
          'Why do you recall %1 right now?',
        ],
      },
    ],
  },
  {
    keyword: 'forget',
    rank: 5,
    patterns: [
      {
        pattern: '* forget *',
        responses: [
          'Can you think of why you might forget %1?',
          "Why can't you remember %1?",
          'How often do you think of %1?',
        ],
      },
    ],
  },
  {
    keyword: 'dream',
    rank: 4,
    patterns: [
      {
        pattern: '*',
        responses: [
          'What does that dream suggest to you?',
          'Do you dream often?',
          'What persons appear in your dreams?',
          'Do you believe that dreams have something to do with your problem?',
        ],
      },
    ],
  },
  {
    keyword: 'perhaps',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          "You don't seem quite certain.",
          'Why the uncertain tone?',
          "Can't you be more positive?",
          "You aren't sure?",
        ],
      },
    ],
  },
  {
    keyword: 'computer',
    rank: 2,
    patterns: [
      {
        pattern: '*',
        responses: [
          'Do computers worry you?',
          'Why do you mention computers?',
          'What do you think machines have to do with your problem?',
          "Don't you think computers can help people?",
        ],
      },
    ],
  },
  {
    keyword: 'am',
    rank: 1,
    patterns: [
      {
        pattern: '* am i *',
        responses: [
          'Do you believe you are %1?',
          'Would you want to be %1?',
          'You wish I would tell you you are %1?',
          'What would it mean if you were %1?',
        ],
      },
    ],
  },
  {
    keyword: 'are',
    rank: 1,
    patterns: [
      {
        pattern: 'are you *',
        responses: [
          'Why are you interested in whether I am %0 or not?',
          "Would you prefer if I weren't %0?",
          'Perhaps I am %0 in your fantasies.',
          'Do you sometimes think I am %0?',
        ],
      },
      {
        pattern: 'are *',
        responses: [
          "Did you think they might not be %0?",
          'Would you like it if they were not %0?',
          'Perhaps they are %0.',
        ],
      },
    ],
  },
  {
    keyword: 'i',
    rank: 1,
    patterns: [
      {
        pattern: '* i want *',
        responses: [
          'What would it mean to you if you got %1?',
          'Why do you want %1?',
          'Suppose you got %1 soon.',
          'What if you never got %1?',
        ],
      },
      {
        pattern: '* i am * sad *',
        responses: [
          'I am sorry to hear you are %1.',
          'Do you think coming here will help you not to be %1?',
          "I'm sure it's not pleasant to be %1.",
          'Can you explain what made you %1?',
        ],
      },
      {
        pattern: '* i am * happy *',
        responses: [
          'How have I helped you to be %1?',
          'Has your treatment made you %1?',
          'What makes you %1 just now?',
          'Can you explain why you are suddenly %1?',
        ],
      },
      {
        pattern: '* i am *',
        responses: [
          'Is it because you are %1 that you came to me?',
          'How long have you been %1?',
          'Do you believe it is normal to be %1?',
          'Do you enjoy being %1?',
        ],
      },
      {
        pattern: "* i can't *",
        responses: [
          "How do you know you can't %1?",
          'Have you tried?',
          'Perhaps you could %1 now.',
          'Do you really want to be able to %1?',
        ],
      },
      {
        pattern: "* i don't *",
        responses: [
          "Don't you really %1?",
          "Why don't you %1?",
          'Do you wish to be able to %1?',
          'Does that trouble you?',
        ],
      },
      {
        pattern: '* i feel *',
        responses: [
          'Tell me more about such feelings.',
          'Do you often feel %1?',
          'Do you enjoy feeling %1?',
          'Of what does feeling %1 remind you?',
        ],
      },
      {
        pattern: '* i * you *',
        responses: [
          'Perhaps in your fantasy we %0 each other.',
          'Do you wish to %0 me?',
          'You seem to need to %0 me.',
          'Do you %0 anyone else?',
        ],
      },
      {
        pattern: '*',
        responses: [
          'You say %0?',
          'Can you elaborate on that?',
          'Do you say %0 for some special reason?',
          "That's quite interesting.",
        ],
      },
    ],
  },
  {
    keyword: 'you',
    rank: 1,
    patterns: [
      {
        pattern: '* you remind me of *',
        responses: [
          'What resemblance do you see?',
          'What does the similarity suggest to you?',
          'What other connections do you see?',
          'Could there really be some connection?',
        ],
      },
      {
        pattern: '* you are *',
        responses: [
          'What makes you think I am %1?',
          'Does it please you to believe I am %1?',
          'Do you sometimes wish you were %1?',
          'Perhaps you would like to be %1.',
        ],
      },
      {
        pattern: '* you * me *',
        responses: [
          'Why do you think I %0 you?',
          "You like to think I %0 you -- don't you?",
          'What makes you think I %0 you?',
          'Really, I %0 you?',
          'Do you wish to believe I %0 you?',
        ],
      },
      {
        pattern: '* you *',
        responses: [
          'We were discussing you -- not me.',
          'Oh, I %0?',
          "You're not really talking about me -- are you?",
          'What are your feelings now?',
        ],
      },
    ],
  },
  {
    keyword: 'yes',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: ['You seem quite positive.', 'You are sure?', 'I see.', 'I understand.'],
      },
    ],
  },
  {
    keyword: 'no',
    rank: 1,
    patterns: [
      {
        pattern: '* no one *',
        responses: [
          'Are you sure, no one %0?',
          'Surely someone %0.',
          'Can you think of anyone at all?',
          'Are you thinking of a very special person?',
        ],
      },
      {
        pattern: '*',
        responses: [
          "Are you saying 'no' just to be negative?",
          'You are being a bit negative.',
          'Why not?',
          "Why 'no'?",
        ],
      },
    ],
  },
  {
    keyword: 'my',
    rank: 2,
    patterns: [
      {
        pattern: '* my *',
        responses: [
          'Your %0?',
          'Why do you say your %0?',
          'Does that suggest anything else which belongs to you?',
          'Is it important to you that your %0?',
        ],
      },
    ],
  },
  {
    keyword: 'can',
    rank: 1,
    patterns: [
      {
        pattern: 'can you *',
        responses: [
          "You believe I can %0 don't you?",
          'You want me to be able to %0.',
          'Perhaps you would like to be able to %0 yourself.',
        ],
      },
      {
        pattern: 'can i *',
        responses: [
          'Whether or not you can %0 depends on you more than on me.',
          'Do you want to be able to %0?',
          "Perhaps you don't want to %0.",
        ],
      },
    ],
  },
  {
    keyword: 'what',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          'Why do you ask?',
          'Does that question interest you?',
          'What is it you really want to know?',
          'Are such questions much on your mind?',
          'What answer would please you most?',
          'What do you think?',
        ],
      },
    ],
  },
  {
    keyword: 'because',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          'Is that the real reason?',
          "Don't any other reasons come to mind?",
          'Does that reason seem to explain anything else?',
          'What other reasons might there be?',
        ],
      },
    ],
  },
  {
    keyword: 'why',
    rank: 1,
    patterns: [
      {
        pattern: "why don't you *",
        responses: [
          "Do you really believe I don't %0?",
          'Perhaps eventually I will %0.',
          'Do you really want me to %0?',
        ],
      },
      {
        pattern: "why can't i *",
        responses: [
          'Do you think you should be able to %0?',
          'If you could %0, what would you do?',
          "I don't know -- why can't you %0?",
          'Have you really tried?',
        ],
      },
      {
        pattern: '*',
        responses: ["Why don't you tell me the reason why %0?", 'Why do you think %0?'],
      },
    ],
  },
  {
    keyword: 'everyone',
    rank: 2,
    patterns: [
      {
        pattern: '* everyone *',
        responses: [
          'Really, everyone?',
          'Surely not everyone.',
          'Can you think of anyone in particular?',
          'Who, for example?',
          'You are thinking of a very special person.',
        ],
      },
    ],
  },
  {
    keyword: 'always',
    rank: 2,
    patterns: [
      {
        pattern: '*',
        responses: [
          'Can you think of a specific example?',
          'When?',
          'What incident are you thinking of?',
          'Really, always?',
        ],
      },
    ],
  },
  {
    keyword: 'like',
    rank: 2,
    patterns: [
      {
        pattern: '* like *',
        responses: [
          'In what way?',
          'What resemblance do you see?',
          'What does that similarity suggest to you?',
          'What other connections do you see?',
        ],
      },
    ],
  },
  {
    keyword: 'different',
    rank: 1,
    patterns: [
      {
        pattern: '*',
        responses: [
          'How is it different?',
          'What differences do you see?',
          'What does that difference suggest to you?',
        ],
      },
    ],
  },
  // Default catch-all
  {
    keyword: 'xnone',
    rank: 0,
    patterns: [
      {
        pattern: '*',
        responses: [
          'Please tell me more.',
          'Please go on.',
          "I'm not sure I understand you fully.",
          'What does that suggest to you?',
          'Do you feel strongly about discussing such things?',
          'That is interesting. Please continue.',
          'Tell me more about that.',
          'Does talking about this bother you?',
        ],
      },
    ],
  },
];

const quitWords = ['quit', 'exit', 'bye', 'goodbye'];
const initialGreeting = 'Hello. I am ELIZA. What is your problem?';

/**
 * Normalize input: lowercase and split into words
 */
function normalize(text: string): string[] {
  const lower = text.toLowerCase();
  // Remove punctuation
  const cleaned = lower.replace(/[!.,?;:]/g, ' ');
  // Split and filter empty
  return cleaned.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Reflect words: transform "i" to "you", "my" to "your" etc.
 */
function reflect(words: string[]): string[] {
  return words.map((word) => reflections[word] || word);
}

/**
 * Match pattern against input words
 * Pattern uses * for wildcards
 * Returns array of matched wildcard contents, or null if no match
 */
function matchPattern(patternStr: string, words: string[]): string[] | null {
  const pattern = normalize(patternStr);
  const matches: string[] = [];
  let pIdx = 0;
  let wIdx = 0;

  while (pIdx <= pattern.length && wIdx <= words.length) {
    if (pIdx === pattern.length) {
      // Pattern exhausted - must be at end of words too
      if (wIdx === words.length) {
        return matches;
      }
      return null;
    }

    if (pattern[pIdx] === '*') {
      // Wildcard
      if (pIdx === pattern.length - 1) {
        // * at end matches everything remaining
        matches.push(words.slice(wIdx).join(' '));
        return matches;
      }

      // Try to find next pattern element
      const nextP = pattern[pIdx + 1];
      const matchedWords: string[] = [];

      while (wIdx < words.length && words[wIdx] !== nextP) {
        matchedWords.push(words[wIdx]);
        wIdx++;
      }

      if (wIdx < words.length && words[wIdx] === nextP) {
        matches.push(matchedWords.join(' '));
        pIdx += 2;
        wIdx++;
      } else {
        return null;
      }
    } else if (pIdx < pattern.length && wIdx < words.length && pattern[pIdx] === words[wIdx]) {
      // Exact match
      pIdx++;
      wIdx++;
    } else {
      return null;
    }
  }

  return matches;
}

/**
 * Find matching pattern and return response info
 */
function findResponse(words: string[]): { matches: string[]; responses: string[]; pattern: string; rank: number } {
  let bestPattern: { matches: string[]; responses: string[]; pattern: string; rank: number } | null = null;
  let bestRank = -1;

  for (const rule of patterns) {
    // Check if keyword appears in input (or is catch-all)
    if (rule.keyword !== 'xnone' && !words.includes(rule.keyword)) {
      continue;
    }

    if (rule.rank > bestRank) {
      // Try each pattern for this keyword
      for (const p of rule.patterns) {
        const matches = matchPattern(p.pattern, words);
        if (matches !== null) {
          bestPattern = {
            matches,
            responses: p.responses,
            pattern: p.pattern,
            rank: rule.rank,
          };
          bestRank = rule.rank;
          break;
        }
      }
    }
  }

  // Return best match or default
  if (bestPattern) {
    return bestPattern;
  }

  // Default catch-all
  const defaultRule = patterns.find((r) => r.keyword === 'xnone')!;
  return {
    matches: [],
    responses: defaultRule.patterns[0].responses,
    pattern: '*',
    rank: 0,
  };
}

/**
 * Generate response from template and matches
 */
function generateResponse(template: string, matches: string[]): string {
  let response = template;

  // Replace %0, %1, %2 etc with reflected matches
  matches.forEach((match, idx) => {
    const placeholder = `%${idx}`;
    const matchWords = normalize(match);
    const reflected = reflect(matchWords).join(' ');
    response = response.replace(new RegExp(placeholder, 'g'), reflected);
  });

  // Clean up and capitalize
  response = response.trim();
  if (response.length > 0) {
    response = response.charAt(0).toUpperCase() + response.slice(1);
  }

  return response;
}

/**
 * ELIZA response interface
 */
export interface ElizaResponse {
  response: string | null; // null means quit
  debug?: {
    pattern: string;
    rank: number;
    matches: string[];
  };
}

/**
 * Main ELIZA response function
 */
export function elizaResponse(input: string): ElizaResponse {
  const words = normalize(input);

  // Check for quit words
  if (quitWords.some((q) => words.includes(q))) {
    return { response: null };
  }

  // Find matching pattern and generate response
  const result = findResponse(words);
  const template = result.responses[Math.floor(Math.random() * result.responses.length)];
  const response = generateResponse(template, result.matches);

  return {
    response,
    debug: {
      pattern: result.pattern,
      rank: result.rank,
      matches: result.matches,
    },
  };
}

/**
 * Get the initial greeting
 */
export function getInitialGreeting(): string {
  return initialGreeting;
}

/**
 * Check if input is a quit command
 */
export function isQuitCommand(input: string): boolean {
  const words = normalize(input);
  return quitWords.some((q) => words.includes(q));
}
