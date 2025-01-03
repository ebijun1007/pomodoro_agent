import type { PomodoroSession, Task } from '@core/domain/types';

function isPomodoroSession(obj: unknown): obj is PomodoroSession {
  if (typeof obj !== 'object' || obj === null) return false;

  const session = obj as Record<string, unknown>;
  return (
    typeof session.id === 'string' &&
    typeof session.task_id === 'string' &&
    typeof session.work_minutes === 'number' &&
    typeof session.break_minutes === 'number' &&
    typeof session.status === 'string' &&
    typeof session.start_time === 'string'
  );
}

function toPomodoroSession(obj: unknown): PomodoroSession | null {
  if (!isPomodoroSession(obj)) return null;

  return {
    id: obj.id,
    task_id: obj.task_id,
    work_minutes: obj.work_minutes,
    break_minutes: obj.break_minutes,
    status: obj.status,
    start_time: obj.start_time,
    pause_time: typeof obj.pause_time === 'string' ? obj.pause_time : undefined,
    remaining_work_minutes:
      typeof obj.remaining_work_minutes === 'number' ? obj.remaining_work_minutes : undefined,
    completed_at: typeof obj.completed_at === 'string' ? obj.completed_at : undefined,
  };
}

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

    const result = await this.db
      .prepare(
        `UPDATE pomodoro_sessions
         SET status = 'active',
             start_time = ?,
             pause_time = NULL
         WHERE status = 'paused'`
      )
      .bind(now)
      .run();

    return result.meta.changes || 0;
  }

  async getActiveSessions(): Promise<PomodoroSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pomodoro_sessions
         WHERE status = 'active'
         ORDER BY start_time DESC`
      )
      .all();

    if (!result.results) return [];
    return result.results
      .map(toPomodoroSession)
      .filter((session): session is PomodoroSession => session !== null);
  }

  async getPausedSessions(): Promise<PomodoroSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pomodoro_sessions
         WHERE status = 'paused'
         ORDER BY pause_time DESC`
      )
      .all();

    if (!result.results) return [];
    return result.results
      .map(toPomodoroSession)
      .filter((session): session is PomodoroSession => session !== null);
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

    if (!result.results) return [];
    return result.results
      .map(toPomodoroSession)
      .filter((session): session is PomodoroSession => session !== null);
  }

  async getSession(sessionId: string): Promise<PomodoroSession | null> {
    const result = await this.db
      .prepare('SELECT * FROM pomodoro_sessions WHERE id = ?')
      .bind(sessionId)
      .all();

    if (!result.results || result.results.length === 0) return null;
    return toPomodoroSession(result.results[0]);
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

  async updateSession(sessionId: string, updates: Partial<PomodoroSession>): Promise<void> {
    const validUpdates = Object.entries(updates).filter(
      ([key, value]) =>
        value !== undefined &&
        ['work_minutes', 'break_minutes', 'status', 'remaining_work_minutes'].includes(key)
    );

    if (validUpdates.length === 0) return;

    const setClause = validUpdates.map(([key]) => `${key} = ?`).join(', ');

    const values = validUpdates.map(([_, value]) => value);

    await this.db
      .prepare(
        `UPDATE pomodoro_sessions
         SET ${setClause}
         WHERE id = ?`
      )
      .bind(...values, sessionId)
      .run();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.prepare('DELETE FROM pomodoro_sessions WHERE id = ?').bind(sessionId).run();
  }
}
