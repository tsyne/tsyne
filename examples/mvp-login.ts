/**
 * MVP (Model-View-Presenter) Pattern Example
 *
 * Demonstrates the MVP pattern where:
 * - Model: Domain data and business logic
 * - View: Passive UI interface (no logic)
 * - Presenter: Mediates between Model and View, contains all presentation logic
 *
 * Key difference from MVC: The View is completely passive and doesn't know about the Model.
 * All updates flow through the Presenter.
 */

import { app, window, vbox, hbox, label, entry, button } from '../core/src';

// ============================================================================
// MODEL - Business logic and data
// ============================================================================

interface User {
  username: string;
  role: string;
}

class AuthModel {
  private users = new Map<string, { password: string; role: string }>([
    ['admin', { password: 'admin123', role: 'Administrator' }],
    ['user', { password: 'user123', role: 'User' }],
    ['guest', { password: 'guest123', role: 'Guest' }]
  ]);

  authenticate(username: string, password: string): User | null {
    const user = this.users.get(username);
    if (user && user.password === password) {
      return { username, role: user.role };
    }
    return null;
  }

  validateUsername(username: string): string | null {
    if (!username || username.trim().length === 0) {
      return 'Username is required';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    return null;
  }

  validatePassword(password: string): string | null {
    if (!password || password.trim().length === 0) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }
}

// ============================================================================
// VIEW - Passive UI interface
// ============================================================================

interface ILoginView {
  setUsernameError(error: string): void;
  setPasswordError(error: string): void;
  setStatusMessage(message: string, isError: boolean): void;
  clearErrors(): void;
  showLoginForm(): void;
  showWelcomeScreen(user: User): void;
  getUsername(): Promise<string>;
  getPassword(): Promise<string>;
}

class LoginView implements ILoginView {
  private usernameEntry: any;
  private passwordEntry: any;
  private usernameErrorLabel: any;
  private passwordErrorLabel: any;
  private statusLabel: any;
  private contentContainer: any;

  constructor(private onLogin: () => void, private onLogout: () => void) {}

  render(): void {
    this.showLoginForm();
  }

  showLoginForm(): void {
    vbox(() => {
      label('MVP Pattern - Login Example');
      label('');

      // Username field
      label('Username:');
      this.usernameEntry = entry('Enter username');
      this.usernameErrorLabel = label('');

      label('');

      // Password field
      label('Password:');
      this.passwordEntry = entry('Enter password');
      this.passwordErrorLabel = label('');

      label('');

      // Status message
      this.statusLabel = label('Hint: admin/admin123, user/user123');

      label('');

      // Login button
      button('Login').onClick(this.onLogin);

      label('');
      label('Validation: min 3 chars username, 6 chars password');
    });
  }

  showWelcomeScreen(user: User): void {
    vbox(() => {
      label('MVP Pattern - Login Example');
      label('');
      label(`Welcome, ${user.username}!`);
      label(`Role: ${user.role}`);
      label('');
      label('You have successfully logged in.');
      label('');
      button('Logout').onClick(this.onLogout);
    });
  }

  async getUsername(): Promise<string> {
    return (await this.usernameEntry?.getText()) || '';
  }

  async getPassword(): Promise<string> {
    return (await this.passwordEntry?.getText()) || '';
  }

  setUsernameError(error: string): void {
    this.usernameErrorLabel?.setText(`⚠ ${error}`);
  }

  setPasswordError(error: string): void {
    this.passwordErrorLabel?.setText(`⚠ ${error}`);
  }

  setStatusMessage(message: string, isError: boolean): void {
    const prefix = isError ? '✗' : '✓';
    this.statusLabel?.setText(`${prefix} ${message}`);
  }

  clearErrors(): void {
    this.usernameErrorLabel?.setText('');
    this.passwordErrorLabel?.setText('');
  }
}

// ============================================================================
// PRESENTER - Presentation logic
// ============================================================================

class LoginPresenter {
  private currentUser: User | null = null;

  constructor(
    private view: ILoginView,
    private model: AuthModel,
    private onViewChange: (renderFn: () => void) => void
  ) {}

  async handleLogin(): Promise<void> {
    this.view.clearErrors();

    // Get values from view
    const username = await this.view.getUsername();
    const password = await this.view.getPassword();

    // Validate using model
    const usernameError = this.model.validateUsername(username);
    const passwordError = this.model.validatePassword(password);

    if (usernameError) {
      this.view.setUsernameError(usernameError);
      return;
    }

    if (passwordError) {
      this.view.setPasswordError(passwordError);
      return;
    }

    // Attempt authentication
    const user = this.model.authenticate(username, password);

    if (user) {
      this.currentUser = user;
      this.view.setStatusMessage('Login successful!', false);

      // Navigate to welcome screen
      setTimeout(() => {
        this.onViewChange(() => this.view.showWelcomeScreen(user));
      }, 500);
    } else {
      this.view.setStatusMessage('Invalid username or password', true);
    }
  }

  handleLogout(): void {
    this.currentUser = null;
    this.onViewChange(() => this.view.showLoginForm());
  }
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

app({ title: 'MVP Pattern Demo' }, () => {
  window({ title: 'MVP Login', width: 400, height: 400 }, (win) => {
    // We'll create the MVP components in a closure to handle view updates
    let presenter: LoginPresenter;

    const createMVP = () => {
      const model = new AuthModel();

      const view = new LoginView(
        () => presenter.handleLogin(),
        () => presenter.handleLogout()
      );

      presenter = new LoginPresenter(model, view, (renderFn) => {
        win.setContent(renderFn);
      });

      return view;
    };

    win.setContent(() => {
      const view = createMVP();
      view.render();
    });

    win.show();
  });
});
