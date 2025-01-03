import { Hono } from 'hono';
import { AgentManager } from './agent';
import { AIProcessor } from './ai';
import { ContextManager } from './context-manager';
import { PomodoroManager } from './pomodoro';
import { handleScheduledSummary } from './scheduled-summary';
import { handle } from './slack';
import { TaskManager } from './task';

const app = new Hono();

interface Env {
  DB: D1Database;
  pomodoro_context: KVNamespace;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  ANTHROPIC_API_KEY: string;
  SLACK_CHANNEL_ID: string;
}

app.post('/slack/events', async (c) => {
  const env = c.env as unknown as Env;
  const payload = await c.req.json();

  if (payload.type === 'url_verification') {
    return c.json({ challenge: payload.challenge });
  }

  if (payload.type === 'event_callback') {
    const event = payload.event;

    if (event.type === 'message' && !event.subtype) {
      if (event.bot_id || event.bot_profile) {
        return c.json({ ok: true });
      }

      if (event.channel_type === 'channel' || event.channel_type === 'group') {
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
          agentManager,
          env,
        });
      }
    }
  }

  return c.json({ ok: true });
});

// Workerのエクスポート
export default {
  fetch: app.fetch,

  // 定期実行のハンドラー
  scheduled: async (env: Env) => {
    // cron式で以下のように設定することを推奨:
    // "0 5,22 * * *"  // 毎日5時と22時に実行

    try {
      await handleScheduledSummary(env);
    } catch (error) {
      console.error('Scheduled summary error:', error);
    }
  },
};
