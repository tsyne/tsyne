import { describe, test, expect } from '@jest/globals';

class SSHTermHelper {
  private sessions: any[] = [];

  addSession(host: string, port: number, username: string): void {
    const timestamp = new Date().getTime();
    this.sessions.push({
      id: `sess-${timestamp}`,
      host,
      port,
      username,
      connected: false
    });
  }

  getSessions(): any[] {
    return [...this.sessions];
  }

  count() {
    return this.sessions.length;
  }

  removeSession(id: string): void {
    this.sessions = this.sessions.filter((s: any) => s.id !== id);
  }
}

describe('SSH Terminal', () => {
  test('should add session', () => {
    const h = new SSHTermHelper();
    h.addSession('example.com', 22, 'user');
    expect(h.count()).toBe(1);
  });

  test('should handle multiple sessions', () => {
    const h = new SSHTermHelper();
    h.addSession('server1.com', 22, 'admin');
    h.addSession('server2.com', 2222, 'user');
    expect(h.count()).toBe(2);
  });

  test('should store session metadata', () => {
    const h = new SSHTermHelper();
    h.addSession('host.com', 22, 'testuser');
    const sessions = h.getSessions();
    expect(sessions[0].host).toBe('host.com');
    expect(sessions[0].port).toBe(22);
    expect(sessions[0].username).toBe('testuser');
  });

  test('should remove session', () => {
    const h = new SSHTermHelper();
    h.addSession('server.com', 22, 'user');
    const sessions = h.getSessions();
    h.removeSession(sessions[0].id);
    expect(h.count()).toBe(0);
  });

  test('should support custom SSH ports', () => {
    const h = new SSHTermHelper();
    h.addSession('secure.com', 2222, 'admin');
    const sessions = h.getSessions();
    expect(sessions[0].port).toBe(2222);
  });
});
