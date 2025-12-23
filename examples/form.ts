import { app, resolveTransport, window, vbox, hbox, button, label, entry  } from '../core/src';

// Form example showing input handling
let nameEntry: any;
let emailEntry: any;
let resultLabel: any;

app(resolveTransport(), { title: "Form Example" }, () => {
  window({ title: "User Registration" }, () => {
    vbox(() => {
      label("Name:");
      nameEntry = entry("Enter your name");

      label("Email:");
      emailEntry = entry("Enter your email");

      resultLabel = label("");

      hbox(() => {
        button("Submit", async () => {
          const name = await nameEntry.getText();
          const email = await emailEntry.getText();
          await resultLabel.setText(`Hello, ${name}! Email: ${email}`);
// console.log(`Submitted: ${name}, ${email}`);
        });

        button("Clear", async () => {
          await nameEntry.setText("");
          await emailEntry.setText("");
          await resultLabel.setText("");
        });
      });
    });
  });
});
