// @tsyne-app:name Quiz App
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder buildQuizApp

// Quiz App - Interactive trivia quiz with scoring
// Demonstrates complex state management, navigation, and conditional UI

import { app, App, Window } from '../src';

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const questions: Question[] = [
  {
    question: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "Hyperlinks and Text Markup Language"
    ],
    correct: 0,
    explanation: "HTML stands for Hyper Text Markup Language, the standard markup language for web pages."
  },
  {
    question: "Which programming language is known as the 'language of the web'?",
    options: ["Python", "JavaScript", "Java", "C++"],
    correct: 1,
    explanation: "JavaScript is known as the 'language of the web' because it runs in all web browsers."
  },
  {
    question: "What year was TypeScript first released?",
    options: ["2010", "2012", "2014", "2016"],
    correct: 1,
    explanation: "TypeScript was first released by Microsoft in 2012."
  },
  {
    question: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Program Utility",
      "Central Processor Utility"
    ],
    correct: 0,
    explanation: "CPU stands for Central Processing Unit, the main processor in a computer."
  },
  {
    question: "Which company created the Go programming language?",
    options: ["Microsoft", "Apple", "Google", "Amazon"],
    correct: 2,
    explanation: "Go was created at Google by Robert Griesemer, Rob Pike, and Ken Thompson."
  },
];

export function buildQuizApp(a: App) {
  a.window({ title: 'Programming Quiz', width: 500, height: 600 }, (win: Window) => {
    let currentQuestion = 0;
    let score = 0;
    let answered = false;
    let selectedAnswer = -1;

    function showQuestion() {
      const q = questions[currentQuestion];

      win.setContent(() => {
        a.vbox(() => {
          a.label('🎯 Programming Quiz 🎯');
          a.separator();

          // Progress
          a.label(`Question ${currentQuestion + 1} of ${questions.length}`);
          a.label(`Score: ${score}/${currentQuestion}`);

          a.separator();

          // Question
          a.label(q.question);

          a.separator();

          // Options
          a.radiogroup(q.options, -1, (selected) => {
            selectedAnswer = selected;
          });

          a.separator();

          // Submit button
          if (!answered) {
            a.button('Submit Answer').onClick(() => {
              if (selectedAnswer === -1) {
                return; // No answer selected
              }
              answered = true;
              if (selectedAnswer === q.correct) {
                score++;
              }
              showResult();
            });
          }
        });
      });
    }

    function showResult() {
      const q = questions[currentQuestion];
      const isCorrect = selectedAnswer === q.correct;

      win.setContent(() => {
        a.vbox(() => {
          a.label('🎯 Programming Quiz 🎯');
          a.separator();

          // Progress
          a.label(`Question ${currentQuestion + 1} of ${questions.length}`);
          a.label(`Score: ${score}/${currentQuestion + 1}`);

          a.separator();

          // Question
          a.label(q.question);

          a.separator();

          // Result
          if (isCorrect) {
            a.label('✅ Correct!');
          } else {
            a.label('❌ Incorrect');
            a.label(`The correct answer was: ${q.options[q.correct]}`);
          }

          a.separator();

          // Explanation
          a.label('Explanation:');
          a.label(q.explanation);

          a.separator();

          // Next button
          if (currentQuestion < questions.length - 1) {
            a.button('Next Question').onClick(() => {
              currentQuestion++;
              answered = false;
              selectedAnswer = -1;
              showQuestion();
            });
          } else {
            a.button('See Final Score').onClick(showFinalScore);
          }
        });
      });
    }

    function showFinalScore() {
      const percentage = Math.round((score / questions.length) * 100);
      let message = '';
      let emoji = '';

      if (percentage === 100) {
        message = 'Perfect score!';
        emoji = '🏆';
      } else if (percentage >= 80) {
        message = 'Excellent work!';
        emoji = '🌟';
      } else if (percentage >= 60) {
        message = 'Good job!';
        emoji = '👍';
      } else if (percentage >= 40) {
        message = 'Not bad, keep practicing!';
        emoji = '📚';
      } else {
        message = 'Keep learning!';
        emoji = '💪';
      }

      win.setContent(() => {
        a.vbox(() => {
          a.label('🎯 Quiz Complete! 🎯');
          a.separator();

          a.label(`${emoji} ${message}`);

          a.separator();

          // Score display
          a.label('═══════════════════');
          a.label(`Final Score: ${score}/${questions.length}`);
          a.label(`Percentage: ${percentage}%`);
          a.label('═══════════════════');

          a.separator();

          // Performance breakdown
          a.label('Performance:');
          a.label(`✓ Correct: ${score}`);
          a.label(`✗ Incorrect: ${questions.length - score}`);

          a.separator();

          // Restart button
          a.button('Play Again').onClick(() => {
            currentQuestion = 0;
            score = 0;
            answered = false;
            selectedAnswer = -1;
            showQuestion();
          });

          a.button('Exit').onClick(() => {
            process.exit(0);
          });
        });
      });
    }

    // Start the quiz
    showQuestion();
    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Quiz App' }, buildQuizApp);
}
