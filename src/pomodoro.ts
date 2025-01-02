export class PomodoroManager {
  constructor(private db: D1Database) {}

  async startSession(taskId: string, workMinutes: number, breakMinutes: number): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
      INSERT INTO pomodoro_sessions (id, task_id, work_minutes, break_minutes, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(id, taskId, workMinutes, breakMinutes, now)
      .run();

    // Update daily record
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .prepare(`
      INSERT INTO daily_records (id, date, completed_sessions)
      VALUES (?, ?, 1)
      ON CONFLICT (date) DO UPDATE SET
      completed_sessions = completed_sessions + 1
    `)
      .bind(crypto.randomUUID(), today)
      .run();

    return id;
  }

  async getActiveSession(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db
      .prepare(`
      SELECT *
      FROM pomodoro_sessions
      WHERE DATE(completed_at) = ?
      ORDER BY completed_at DESC
      LIMIT 1
    `)
      .bind(today)
      .first();

    return result;
  }

  async getDailySessionCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db
      .prepare(`
      SELECT completed_sessions
      FROM daily_records
      WHERE date = ?
    `)
      .bind(today)
      .first();

    return result?.completed_sessions || 0;
  }

  async getSessionHistory(taskId: string): Promise<any[]> {
    const result = await this.db
      .prepare(`
      SELECT *
      FROM pomodoro_sessions
      WHERE task_id = ?
      ORDER BY completed_at DESC
    `)
      .bind(taskId)
      .all();

    return result.results;
  }
}

export class Timer {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private workMinutes: number,
    private breakMinutes: number,
    private onWorkComplete: () => void,
    private onBreakComplete: () => void
  ) {}

  startWork(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(this.onWorkComplete, this.workMinutes * 60 * 1000);
  }

  startBreak(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(this.onBreakComplete, this.breakMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
