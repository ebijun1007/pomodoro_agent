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

export class AIProcessor {
  constructor(private anthropicApiKey: string) {}

  async analyzeMessage(prompt: string): Promise<{
    intent: string;
    entities: Record<string, any>;
  }> {
    try {
      console.log('AIProcessor: Analyzing message with prompt:', prompt);

      // 確認メッセージへの応答を最初にチェック
      if (/^(はい|yes|ok|了解|承知|確認|削除して)$/i.test(prompt.trim())) {
        console.log('AIProcessor: Detected confirmation response');
        return {
          intent: 'delete_project_confirm',
          entities: {},
        };
      }

      const systemPrompt = `
あなたはポモドーロタイマーアプリのアシスタントです。
ユーザーのメッセージを解析し、以下の情報を抽出してください：

1. 意図（intent）:
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

2. エンティティ（entities）:
タスク一覧表示の場合:
- projectId: プロジェクトID（特定のプロジェクトのタスクのみを表示する場合）
- status: タスクのステータス（指定された場合のみ）

単一プロジェクト作成の場合:
- name: プロジェクト名
- description: 説明
- deadline: 期限

複数プロジェクト作成の場合:
- projects: プロジェクトの配列
  [
    {
      "name": "プロジェクト名",
      "description": "説明（省略可）",
      "deadline": "期限（省略可）"
    },
    ...
  ]

プロジェクト削除の場合:
- projectId: プロジェクトID
- confirmed: 確認状態（true/false）

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

外出の場合:
- reason: 外出理由（指定された場合）
- duration: 予定時間（指定された場合）

特に、以下のような形式のメッセージの場合は、複数プロジェクト作成（create_projects）として解析してください：

"以下のプロジェクトを追加してください。
・プロジェクトA
・プロジェクトB
・プロジェクトC"

このような場合、以下のようなJSONを返してください：

{
  "intent": "create_projects",
  "entities": {
    "projects": [
      {"name": "プロジェクトA"},
      {"name": "プロジェクトB"},
      {"name": "プロジェクトC"}
    ]
  }
}

JSONの形式で結果を返してください。`;

      console.log('AIProcessor: Calling Claude API');

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
        throw new Error(`Claude API returned ${response.status}`);
      }

      console.log('AIProcessor: Received response from Claude API');

      const data = (await response.json()) as ClaudeResponse;
      console.log('AIProcessor: Parsed response:', data);

      if (data.content?.[0]?.text) {
        const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]) as {
            intent: string;
            entities: Record<string, any>;
          };
          console.log('AIProcessor: Successfully parsed JSON:', parsedResult);
          return parsedResult;
        }
      }

      // フォールバック: 基本的なインテント検出
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
    const keywords = {
      list_projects: [
        'プロジェクト一覧',
        'プロジェクトリスト',
        'プロジェクトを見せて',
        'プロジェクトの状況',
      ],
      list_tasks: ['タスク一覧', 'タスクリスト', 'タスクを見せて', 'タスクの状況'],
      create_project: ['新しいプロジェクト', 'プロジェクトを作成', 'プロジェクト作成'],
      create_task: ['新しいタスク', 'タスクを追加', 'タスク作成'],
      delete_project: ['プロジェクトを削除', '削除'],
      delete_project_confirm: ['はい', '承認', '了解', 'OK', '確認'],
      start_pomodoro: ['ポモドーロ開始', '作業開始', 'タイマー開始'],
      show_summary: ['今日のタスク', '作業状況', 'サマリー', 'まとめ'],
      check_status: ['状況', '進捗', '確認'],
      going_out: ['行ってきます', '外出', '出かけ', '買い物', '会議'],
      coming_back: ['戻りました', '帰りました', '戻ってきました', '帰宅'],
      help: ['使い方', 'ヘルプ', '説明'],
    };

    // 複数プロジェクト作成の特別なケースをチェック
      return 'create_projects';
    }

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some((word) => message.includes(word))) {
        console.log(`AIProcessor: Detected intent "${intent}" from keywords`);
        return intent;
      }
    }

    console.log('AIProcessor: No specific intent detected, returning "unknown"');
    return 'unknown';
  }

  private extractBasicEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    const lines = message.split('\n');

    // 複数プロジェクト作成の特別なケースをチェック
      const projects = lines
        .filter((line) => line.trim().startsWith('・'))
        .map((line) => ({
          name: line.trim().replace('・', '').trim(),
        }));

      if (projects.length > 0) {
        return { projects };
      }
    }

    // UUIDパターンの検出
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = message.match(uuidPattern);
    if (uuidMatch) {
      // メッセージにプロジェクト削除のキーワードが含まれている場合
      if (message.includes('削除')) {
        entities.projectId = uuidMatch[0];
      }
    }

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        switch (key) {
          case 'プロジェクト名':
          case 'プロジェクト':
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
          case '見積時間': {
            const minutes = Number.parseInt(value, 10);
            if (!isNaN(minutes)) {
              entities.estimatedMinutes = minutes;
            }
            break;
          }
          case 'id':
          case 'プロジェクトid':
            entities.projectId = value;
            break;
          case '理由':
            entities.reason = value;
            break;
          case '予定時間': {
            const duration = Number.parseInt(value, 10);
            if (!isNaN(duration)) {
              entities.duration = duration;
            }
            break;
          }
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

      const data = (await response.json()) as ClaudeResponse;
      if (data.content?.[0]?.text) {
        const minutes = Number.parseInt(data.content[0].text.trim(), 10);
        if (!Number.isNaN(minutes)) {
          return minutes;
        }
      }
    } catch (error) {
      console.error('Task estimation error:', error);
    }

    return 25;
  }
}
