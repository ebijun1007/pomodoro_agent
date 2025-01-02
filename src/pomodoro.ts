import type { PomodoroSession, Task } from './types';

export class PomodoroManager {
  constructor(private db: D1Database) {}

  async startPomodoro({
    taskId,
    workMinutes,
    breakMinutes,
  }: {
    taskId: string;
    channelId: string;
    workMinutes: number;
    breakMinutes: number;
  }): Promise<string> {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO pomodoro_sessions (
          id,
          task_id,
          work_minutes,
          break_minutes,
          status,
          start_time,
          remaining_work_minutes
        ) VALUES (?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(sessionId, taskId, workMinutes, breakMinutes, now, workMinutes)
      .run();

    return sessionId;
  }

  async pauseAllPomodoros(): Promise<number> {
    const now = new Date().toISOString();

    // アクティブなセッションを取得
    const activeSessions = await this.db
      .prepare(
        `SELECT ps.*, t.* FROM pomodoro_sessions ps
         JOIN tasks t ON ps.task_id = t.id
         WHERE ps.status = 'active'`
      )
      .all();

    let pausedCount = 0;
    for (const session of activeSessions.results as any[]) {
      // 経過時間を計算して残り時間を更新
      const startTime = new Date(session.start_time);
      const elapsedMinutes = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60));
      const remainingMinutes = Math.max(0, session.work_minutes - elapsedMinutes);

      await this.db
        .prepare(
          `UPDATE pomodoro_sessions
           SET status = 'paused',
               pause_time = ?,
               remaining_work_minutes = ?
           WHERE id = ?`
        )
        .bind(now, remainingMinutes, session.id)
        .run();

      pausedCount++;
    }

    return pausedCount;
  }

  async resumeAllPomodoros(): Promise<number> {
    const now = new Date().toISOString();

    // 一時停止中のセッションを取得
    const result = await this.db
      .prepare(
        `UPDATE pomodoro_sessions
         SET status = 'active',
             start_time = ?,
             pause_time = NULL
         WHERE status = 'paused'
         RETURNING id`
      )
      .bind(now)
      .run();

    return result.changes || 0;
  }

  async getActiveSessions(): Promise<PomodoroSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pomodoro_sessions
         WHERE status = 'active'
         ORDER BY start_time DESC`
      )
      .all();

    return result.results as PomodoroSession[];
  }

  async getPausedSessions(): Promise<PomodoroSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pomodoro_sessions
         WHERE status = 'paused'
         ORDER BY pause_time DESC`
      )
      .all();

    return result.results as PomodoroSession[];
  }

  async getSessionsByTask(taskId: string): Promise<PomodoroSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pomodoro_sessions
         WHERE task_id = ?
         ORDER BY start_time DESC`
      )
      .bind(taskId)
      .all();

    return result.results as PomodoroSession[];
  }

  async getSession(sessionId: string): Promise<PomodoroSession | null> {
    const result = await this.db
      .prepare('SELECT * FROM pomodoro_sessions WHERE id = ?')
      .bind(sessionId)
      .all();

    const sessions = result.results as PomodoroSession[];
    return sessions[0] || null;
  }

  async completeSession(sessionId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE pomodoro_sessions
         SET status = 'completed',
             completed_at = ?
         WHERE id = ?`
      )
      .bind(now, sessionId)
      .run();
  }

  async updateSession(sessionId: string): Promise<void> {
    // Implementation
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Implementation
  }
}
