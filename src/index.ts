import { Hono } from 'hono';
import { handle } from './slack';
import { PomodoroManager } from './pomodoro';
import { TaskManager } from './task';
import { AgentManager } from './agent';
import { ContextManager } from './context-manager';
import { AIProcessor } from './ai';

const app = new Hono();

interface Env {
  DB: D1Database;
  pomodoro_context: KVNamespace; // KVネームスペースのbinding名を修正
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  ANTHROPIC_API_KEY: string;
}

app.post('/slack/events', async (c) => {
  const env = c.env as Env;
  const payload = await c.req.json();

  if (payload.type === 'url_verification') {
    return c.json({ challenge: payload.challenge });
  }

  if (payload.type === 'event_callback') {
    const event = payload.event;

    // メッセージイベントの場合のみ処理
    if (event.type === 'message' && !event.subtype) {
      // botのメッセージは無視
      if (event.bot_id || event.bot_profile) {
        return c.json({ ok: true });
      }

      const taskManager = new TaskManager(env.DB);
      const pomodoroManager = new PomodoroManager(env.DB);
      const contextManager = new ContextManager(env.DB, env.pomodoro_context);
      const aiProcessor = new AIProcessor(env.ANTHROPIC_API_KEY);
      const agentManager = new AgentManager(
        taskManager,
        pomodoroManager,
        contextManager,
        aiProcessor
      );

      await handle({
        event,
        taskManager,
        pomodoroManager,
        agentManager,
        env,
      });
    }
  }

  return c.json({ ok: true });
});

export default app;
