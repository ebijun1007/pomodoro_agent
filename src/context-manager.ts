import type { ConversationContext, DailyContext } from './types';

export class ContextManager {
  private readonly KV_KEY_PREFIX = 'pomodoro_context:';

  constructor(
    private d1: D1Database,
    private kv: KVNamespace
  ) {}

  async initializeDailyContext(): Promise<DailyContext> {
    const today = new Date().toISOString().split('T')[0];
    const kvKey = `${this.KV_KEY_PREFIX}daily:${today}`;

    // すでに今日のコンテキストが存在するかチェック
    const existingContext = await this.kv.get(kvKey);
    if (existingContext) {
      return JSON.parse(existingContext);
    }

    // D1から必要な情報を取得
    const latestProject = await this.d1
      .prepare(
        `SELECT id, name FROM projects 
         WHERE deadline >= ? 
         ORDER BY last_context_at DESC 
         LIMIT 1`
      )
      .bind(today)
      .first();

    const newContext: DailyContext = {
      date: today,
      activeProjectId: latestProject?.id ?? null,
      activeTaskId: null,
      completedPomodoros: 0,
      dailyGoal: 8,
    };

    // KVに保存（24時間の有効期限付き）
    await this.kv.put(kvKey, JSON.stringify(newContext), {
      expirationTtl: 24 * 60 * 60,
    });

    return newContext;
  }

  async updateConversationContext(message: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const kvKey = `${this.KV_KEY_PREFIX}conversation:${today}`;

    const existingContext = await this.kv.get(kvKey);
    const context: ConversationContext = existingContext
      ? JSON.parse(existingContext)
      : { messages: [], pendingInfo: { type: null, collectedData: {} } };

    // 新しいメッセージを追加
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // 最大10件程度の会話履歴を保持
    if (context.messages.length > 10) {
      context.messages = context.messages.slice(-10);
    }

    await this.kv.put(kvKey, JSON.stringify(context), {
      expirationTtl: 24 * 60 * 60,
    });
  }

  async buildPrompt(message: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const [dailyContext, conversationContext] = await Promise.all([
      this.kv.get(`${this.KV_KEY_PREFIX}daily:${today}`),
      this.kv.get(`${this.KV_KEY_PREFIX}conversation:${today}`),
    ]);

    const daily: DailyContext = dailyContext ? JSON.parse(dailyContext) : null;
    const conversation: ConversationContext = conversationContext
      ? JSON.parse(conversationContext)
      : null;

    // アクティブなプロジェクトとタスクの詳細を取得
    const [projectDetails, taskDetails] = await Promise.all([
      daily?.activeProjectId
        ? this.d1
            .prepare('SELECT name, description FROM projects WHERE id = ?')
            .bind(daily.activeProjectId)
            .first()
        : null,
      daily?.activeTaskId
        ? this.d1
            .prepare('SELECT title, description FROM tasks WHERE id = ?')
            .bind(daily.activeTaskId)
            .first()
        : null,
    ]);

    return `
現在の状況:
日付: ${today}
完了したポモドーロ: ${daily?.completedPomodoros ?? 0} / ${daily?.dailyGoal ?? 8}

${
  projectDetails
    ? `
進行中のプロジェクト: ${projectDetails.name}
プロジェクトの説明: ${projectDetails.description}
`
    : '進行中のプロジェクトはありません'
}

${
  taskDetails
    ? `
現在のタスク: ${taskDetails.title}
タスクの説明: ${taskDetails.description}
`
    : '選択中のタスクはありません'
}

${
  conversation?.messages.length
    ? `
直近の会話:
${conversation.messages
  .slice(-3)
  .map((msg) => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`)
  .join('\n')}
`
    : ''
}

ユーザーの新しいメッセージ: ${message}`;
  }

  async addAssistantResponse(response: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const kvKey = `${this.KV_KEY_PREFIX}conversation:${today}`;

    const existingContext = await this.kv.get(kvKey);
    if (!existingContext) return;

    const context: ConversationContext = JSON.parse(existingContext);
    context.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    });

    if (context.messages.length > 10) {
      context.messages = context.messages.slice(-10);
    }

    await this.kv.put(kvKey, JSON.stringify(context), {
      expirationTtl: 24 * 60 * 60,
    });
  }
}
