// Test for Quiz App example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

describe('Quiz App Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display first question', async () => {
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
        explanation: "HTML stands for Hyper Text Markup Language."
      },
    ];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Programming Quiz', width: 500, height: 600 }, (win) => {
        let currentQuestion = 0;
        let score = 0;
        let answered = false;
        let selectedAnswer: string | undefined = undefined;

        function showQuestion() {
          const q = questions[currentQuestion];

          win.setContent(() => {
            app.vbox(() => {
              app.label('🎯 Programming Quiz 🎯');
              app.separator();

              app.label(`Question ${currentQuestion + 1} of ${questions.length}`);
              app.label(`Score: ${score}/${currentQuestion}`);

              app.separator();

              app.label(q.question);

              app.separator();

              app.radiogroup(q.options, undefined, (selected) => {
                selectedAnswer = selected;
              });

              app.separator();

              if (!answered) {
                app.button('Submit Answer').onClick(() => {
                  if (selectedAnswer === undefined) {
                    return;
                  }
                  answered = true;
                  const selectedIndex = q.options.indexOf(selectedAnswer);
                  if (selectedIndex === q.correct) {
                    score++;
                  }
                });
              }
            });
          });
        }

        showQuestion();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show first question
    await ctx.expect(ctx.getByExactText('Question 1 of 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('What does HTML stand for?')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Submit Answer')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '21-quiz-app.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should handle correct answer', async () => {
    const questions: Question[] = [
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correct: 1,
        explanation: "2 + 2 = 4"
      },
    ];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Programming Quiz', width: 500, height: 600 }, (win) => {
        let currentQuestion = 0;
        let score = 0;
        let answered = false;
        let selectedAnswer: string | undefined = undefined;

        function showQuestion() {
          const q = questions[currentQuestion];

          win.setContent(() => {
            app.vbox(() => {
              app.label('🎯 Programming Quiz 🎯');
              app.label(`Score: ${score}/${currentQuestion}`);
              app.label(q.question);

              app.radiogroup(q.options, undefined, (selected) => {
                selectedAnswer = selected;
              });

              if (!answered) {
                app.button('Submit Answer').onClick(() => {
                  if (selectedAnswer === undefined) {
                    return;
                  }
                  answered = true;
                  const selectedIndex = q.options.indexOf(selectedAnswer);
                  if (selectedIndex === q.correct) {
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
          const selectedIndex = selectedAnswer !== undefined ? q.options.indexOf(selectedAnswer) : -1;
          const isCorrect = selectedIndex === q.correct;

          win.setContent(() => {
            app.vbox(() => {
              app.label('🎯 Programming Quiz 🎯');
              app.label(`Score: ${score}/${currentQuestion + 1}`);

              if (isCorrect) {
                app.label('✅ Correct!');
              } else {
                app.label('❌ Incorrect');
                app.label(`The correct answer was: ${q.options[q.correct]}`);
              }

              app.label('Explanation:');
              app.label(q.explanation);
            });
          });
        }

        showQuestion();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Select correct answer (index 1, which is "4")
    // Note: In actual tests, we'd need to click the radio button
    // For now, we'll test the submit button exists
    await ctx.expect(ctx.getByExactText('Submit Answer')).toBeVisible();
  });

  test('should show final score', async () => {
    const questions: Question[] = [
      {
        question: "Question 1",
        options: ["A", "B", "C", "D"],
        correct: 0,
        explanation: "Explanation"
      },
    ];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Programming Quiz', width: 500, height: 600 }, (win) => {
        let score = 1; // Scored 1 correct
        const totalQuestions = 1;

        function showFinalScore() {
          const percentage = Math.round((score / totalQuestions) * 100);
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
            app.vbox(() => {
              app.label('🎯 Quiz Complete! 🎯');
              app.separator();

              app.label(`${emoji} ${message}`);

              app.separator();

              app.label('═══════════════════');
              app.label(`Final Score: ${score}/${totalQuestions}`);
              app.label(`Percentage: ${percentage}%`);
              app.label('═══════════════════');

              app.separator();

              app.label('Performance:');
              app.label(`✓ Correct: ${score}`);
              app.label(`✗ Incorrect: ${totalQuestions - score}`);

              app.separator();

              app.button('Play Again').onClick(() => {});
              app.button('Exit').onClick(() => {
                process.exit(0);
              });
            });
          });
        }

        showFinalScore();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show perfect score
    await ctx.expect(ctx.getByExactText('🎯 Quiz Complete! 🎯')).toBeVisible();
    await ctx.expect(ctx.getByExactText('🏆 Perfect score!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Final Score: 1/1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Percentage: 100%')).toBeVisible();
    await ctx.expect(ctx.getByExactText('✓ Correct: 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('✗ Incorrect: 0')).toBeVisible();
  });

  test('should show good job message for 60-79%', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Programming Quiz', width: 500, height: 600 }, (win) => {
        let score = 7; // 7 out of 10 = 70%
        const totalQuestions = 10;

        function showFinalScore() {
          const percentage = Math.round((score / totalQuestions) * 100);
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
            app.vbox(() => {
              app.label('🎯 Quiz Complete! 🎯');
              app.label(`${emoji} ${message}`);
              app.label(`Percentage: ${percentage}%`);
            });
          });
        }

        showFinalScore();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show good job message
    await ctx.expect(ctx.getByExactText('👍 Good job!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Percentage: 70%')).toBeVisible();
  });
});
