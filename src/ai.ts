interface TaskExtraction {
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  estimatedMinutes: number;
}

export class AIProcessor {
  constructor(private anthropicApiKey: string) {}

  async analyzeMessage(prompt: string): Promise<{
    intent: string;
    entities: any;
  }> {
    try {
      console.log('AIProcessor: Analyzing message with prompt:', prompt); // デバッグログ

      const systemPrompt = `
あなたはポモドーロタイマーアプリのアシスタントです。
ユーザーのメッセージを解析し、以下の情報を抽出してください：

1. 意図（intent）:
- create_project: プロジェクトの作成
- create_task: タスクの追加
- start_pomodoro: ポモドーロの開始
- check_status: 状況確認
- help: ヘルプ/使い方

2. エンティティ（entities）:
プロジェクト作成の場合:
- name: プロジェクト名
- description: 説明
- deadline: 期限

タスク追加の場合:
- projectId: プロジェクトID
- title: タスク名
- description: 説明
- deadline: 期限
- estimatedMinutes: 見積時間（分）

ポモドーロ開始の場合:
- taskId: タスクID
- workMinutes: 作業時間（デフォルト25分）
- breakMinutes: 休憩時間（デフォルト5分）

JSON形式で結果を返してください。`;

      console.log('AIProcessor: Calling Claude API'); // デバッグログ

      // Claude APIを呼び出してメッセージを解析
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
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
        const errorData = await response.text();
        console.error('Claude API error:', response.status, errorData);
        throw new Error(`Claude API returned ${response.status}: ${errorData}`);
      }

      console.log('AIProcessor: Received response from Claude API'); // デバッグログ

      const data = await response.json();
      console.log('AIProcessor: Parsed response:', data); // デバッグログ

      try {
        if (data.content && data.content[0] && data.content[0].text) {
          const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedResult = JSON.parse(jsonMatch[0]);
            console.log('AIProcessor: Successfully parsed JSON:', parsedResult); // デバッグログ
            return parsedResult;
          }
        }
      } catch (error) {
        console.error('Error parsing AI response:', error);
      }

      // フォールバック: 基本的なインテント検出
      console.log('AIProcessor: Falling back to basic intent detection'); // デバッグログ
      return {
        intent: this.detectBasicIntent(prompt),
        entities: this.extractBasicEntities(prompt),
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        intent: 'unknown',
        entities: {},
      };
    }
  }

  private detectBasicIntent(message: string): string {
    // 基本的なインテント検出のためのキーワードを拡充
    const keywords = {
      create_project: ['新しいプロジェクト', 'プロジェクトを作成', 'プロジェクト作成'],
      create_task: ['新しいタスク', 'タスクを追加', 'タスク作成'],
      start_pomodoro: ['ポモドーロ開始', '作業開始', 'タイマー開始'],
      check_status: ['状況', '進捗', '確認'],
      help: ['使い方', 'ヘルプ', '説明'],
    };

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some((word) => message.includes(word))) {
        console.log(`AIProcessor: Detected intent "${intent}" from keywords`);
        return intent;
      }
    }

    console.log('AIProcessor: No specific intent detected, returning "unknown"');
    return 'unknown';
  }

  private extractBasicEntities(message: string): any {
    const entities: any = {};
    const lines = message.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        switch (key) {
          case 'プロジェクト名':
            entities.name = value;
            break;
          case 'タスク':
            entities.title = value;
            break;
          case '説明':
            entities.description = value;
            break;
          case '期限':
            entities.deadline = value;
            break;
          case '見積時間':
            const minutes = Number.parseInt(value);
            if (!isNaN(minutes)) {
              entities.estimatedMinutes = minutes;
            }
            break;
        }
      }
    }

    console.log('AIProcessor: Extracted entities:', entities);
    return entities;
  }

  async decomposeTask(description: string): Promise<TaskExtraction[]> {
    const systemPrompt = `
ポモドーロテクニックに適した大きさ（25分程度）のサブタスクに分解してください。
各サブタスクには以下の情報が必要です：
- タイトル
- 説明
- 見積時間（分）

JSONの配列形式で結果を返してください。`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: description,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.content && data.content[0] && data.content[0].text) {
        const jsonMatch = data.content[0].text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Task decomposition error:', error);
    }

    // フォールバック: 単一のタスクとして返す
    return [
      {
        projectId: '', // 呼び出し側で設定
        title: description,
        description: description,
        deadline: '', // 呼び出し側で設定
        estimatedMinutes: 25,
      },
    ];
  }

  async estimateTaskDuration(description: string): Promise<number> {
    const systemPrompt = `
以下のタスクの実行に必要な時間を見積もってください。
- ポモドーロテクニックに基づいて（1ポモドーロ = 25分）
- 見積時間を分単位で返してください
- 単一の数値のみを返してください`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: description,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.content && data.content[0] && data.content[0].text) {
        const minutes = Number.parseInt(data.content[0].text.trim());
        if (!isNaN(minutes)) {
          return minutes;
        }
      }
    } catch (error) {
      console.error('Task estimation error:', error);
    }

    return 25; // デフォルト値
  }
}
