interface TaskExtraction {
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  estimatedMinutes: number;
}

interface ClaudeResponse {
  content: {
    text: string;
  }[];
}

interface ConversationContext {
  previousIntents: string[];
  lastEntities: Record<string, any>;
  currentProjectId?: string;
  currentTaskId?: string;
}

export class AIProcessor {
  private context: ConversationContext = {
    previousIntents: [],
    lastEntities: {},
  };

  constructor(private anthropicApiKey: string) {}

  async analyzeMessage(prompt: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  }> {
    try {
      console.log('AIProcessor: Analyzing message with context:', this.context);

      const systemPrompt = `
あなたはポモドーロタイマーアプリのアシスタントです。
以下の情報を考慮してユーザーのメッセージを解析してください：

1. 会話のコンテキスト：
${JSON.stringify(this.context, null, 2)}

2. 意図（intent）の種類：
- list_projects: プロジェクト一覧の表示
- list_tasks: タスク一覧の表示
- create_project: 単一プロジェクトの作成
- create_projects: 複数プロジェクトの一括作成
- create_task: タスクの追加
- delete_project: プロジェクトの削除
- delete_project_confirm: プロジェクト削除の確認
- start_pomodoro: ポモドーロの開始
- show_summary: タスクサマリーの表示
- check_status: 状況確認
- going_out: 外出の通知
- coming_back: 帰宅の通知
- help: ヘルプ/使い方
- clarify: 曖昧な指示に対する確認

3. エンティティ抽出のガイドライン：
- 曖昧な表現はユーザーに確認する
- タイポを自動修正する
- コンテキストから不足情報を補完する

4. 出力形式：
{
  "intent": "detected_intent",
  "entities": {
    // 抽出されたエンティティ
  },
  "confidence": 0.9, // 0-1の信頼度
  "clarification": "必要な確認事項" // 必要な場合のみ
}

特に注意すべき点：
- 曖昧な指示はclarify intentとして返す
- 信頼度が0.8未満の場合は確認を求める
- コンテキストを活用して不足情報を補完する`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229', // より高度なモデルを使用
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API returned ${response.status}`);
      }

      const data = (await response.json()) as ClaudeResponse;
      if (data.content?.[0]?.text) {
        const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]) as {
            intent: string;
            entities: Record<string, any>;
            confidence: number;
            clarification?: string;
          };

          // コンテキスト更新
          this.updateContext(parsedResult);

          if (parsedResult.confidence < 0.8 || parsedResult.intent === 'clarify') {
            return {
              intent: 'clarify',
              entities: {},
              confidence: parsedResult.confidence,
            };
          }

          return parsedResult;
        }
      }

      return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
      };
    }
  }

  private updateContext(result: {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  }) {
    // 最新のインテントを記録
    this.context.previousIntents.push(result.intent);
    if (this.context.previousIntents.length > 5) {
      this.context.previousIntents.shift();
    }

    // エンティティを更新
    this.context.lastEntities = result.entities;

    // 現在のプロジェクト/タスクを更新
    if (result.entities.projectId) {
      this.context.currentProjectId = result.entities.projectId;
    }
    if (result.entities.taskId) {
      this.context.currentTaskId = result.entities.taskId;
    }
  }

  async decomposeTask(description: string): Promise<TaskExtraction[]> {
    const systemPrompt = `
タスクをポモドーロテクニックに適したサブタスクに分解してください。
以下のガイドラインに従ってください：

1. 各サブタスクは25分±5分で完了できる大きさ
2. 依存関係を考慮
3. 優先順位を設定
4. リソース要件を明記
5. リスク要因を特定

出力形式：
[
  {
    "title": "サブタスク名",
    "description": "詳細説明",
    "estimatedMinutes": 見積時間,
    "dependencies": ["依存タスクID"], // 任意
    "priority": 1-3, // 1:高 2:中 3:低
    "resources": ["必要なリソース"], // 任意
    "risks": ["リスク要因"] // 任意
  }
]`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: description,
            },
          ],
        }),
      });

      const data = (await response.json()) as ClaudeResponse;
      if (data.content?.[0]?.text) {
        const jsonMatch = data.content[0].text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as TaskExtraction[];
        }
      }
    } catch (error) {
      console.error('Task decomposition error:', error);
    }

    return [
      {
        projectId: '',
        title: description,
        description: description,
        deadline: '',
        estimatedMinutes: 25,
      },
    ];
  }

  async estimateTaskDuration(description: string): Promise<{
    estimatedMinutes: number;
    confidence: number;
    breakdown?: {
      phase: string;
      minutes: number;
    }[];
  }> {
    const systemPrompt = `
タスクの実行時間を見積もってください。
以下のガイドラインに従ってください：

1. タスクをフェーズごとに分解
2. 各フェーズの時間を見積もる
3. バッファ時間を考慮
4. 信頼度を0-1で評価

出力形式：
{
  "estimatedMinutes": 総時間,
  "confidence": 信頼度,
  "breakdown": [
    {
      "phase": "フェーズ名",
      "minutes": 見積時間
    }
  ]
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: description,
            },
          ],
        }),
      });

      const data = (await response.json()) as ClaudeResponse;
      if (data.content?.[0]?.text) {
        const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as {
            estimatedMinutes: number;
            confidence: number;
            breakdown?: {
              phase: string;
              minutes: number;
            }[];
          };
        }
      }
    } catch (error) {
      console.error('Task estimation error:', error);
    }

    return {
      estimatedMinutes: 25,
      confidence: 0.5,
    };
  }

  async requestClarification(prompt: string): Promise<string> {
    const systemPrompt = `
ユーザーの指示が曖昧な場合に、明確化を求めるメッセージを生成してください。
以下のポイントを考慮してください：

1. 曖昧な部分を特定
2. 具体的な質問を提示
3. 選択肢を提供
4. 丁寧な表現を使用`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const data = (await response.json()) as ClaudeResponse;
      if (data.content?.[0]?.text) {
        return data.content[0].text;
      }
    } catch (error) {
      console.error('Clarification request error:', error);
    }

    return 'もう少し具体的に説明していただけますか？';
  }
}
