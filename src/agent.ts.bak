export class AgentManager {
  constructor(
    private taskManager: TaskManager,
    private pomodoroManager: PomodoroManager
  ) {}

  async handleMessage(message: string): Promise<string> {
    try {
      // プロジェクト作成コマンドの処理
      if (message.includes('新しいプロジェクト') || message.includes('プロジェクトを作成')) {
        const projectDetails = this.extractProjectDetails(message);
        if (!projectDetails) {
          return (
            'プロジェクトの作成には以下の情報が必要です：\n' +
            '- プロジェクト名\n' +
            '- 説明\n' +
            '- 期限\n\n' +
            '例：\n' +
            'プロジェクト名: ウェブアプリ開発\n' +
            '説明: 新規サービスの開発プロジェクト\n' +
            '期限: 2024-03-31'
          );
        }

        const { name, description, deadline } = projectDetails;
        await this.taskManager.createProject(name, description, deadline);
        return `プロジェクト「${name}」を作成しました。\n説明: ${description}\n期限: ${deadline}`;
      }

      // タスク追加コマンドの処理
      if (message.includes('新しいタスク') || message.includes('タスクを追加')) {
        const taskDetails = this.extractTaskDetails(message);
        if (!taskDetails) {
          return (
            'タスクの追加には以下の情報が必要です：\n' +
            '- プロジェクト名\n' +
            '- タスク名\n' +
            '- 説明\n' +
            '- 期限\n' +
            '- 見積時間（分）\n\n' +
            '例：\n' +
            'プロジェクト: ウェブアプリ開発\n' +
            'タスク: ログイン機能の実装\n' +
            '説明: ユーザー認証システムの実装\n' +
            '期限: 2024-02-15\n' +
            '見積時間: 120'
          );
        }

        const { projectId, title, description, deadline, estimatedMinutes } = taskDetails;
        await this.taskManager.createTask(
          projectId,
          title,
          description,
          deadline,
          estimatedMinutes
        );
        return `タスク「${title}」を作成しました。\n説明: ${description}\n期限: ${deadline}\n見積時間: ${estimatedMinutes}分`;
      }

      // ポモドーロ開始コマンドの処理
      if (message.includes('ポモドーロ開始') || message.includes('作業開始')) {
        const pomodoroSettings = this.extractPomodoroSettings(message);
        if (!pomodoroSettings) {
          return (
            'ポモドーロセッションの開始には以下の情報が必要です：\n' +
            '- タスク名\n' +
            '- 作業時間（分）\n' +
            '- 休憩時間（分）\n\n' +
            '例：\n' +
            'タスク: ログイン機能の実装\n' +
            '作業時間: 25\n' +
            '休憩時間: 5'
          );
        }

        const { taskId, workMinutes, breakMinutes } = pomodoroSettings;
        await this.pomodoroManager.startSession(taskId, workMinutes, breakMinutes);

        const taskDetails = await this.taskManager.getTaskDetails(taskId);
        return `ポモドーロセッションを開始します。\nタスク: ${taskDetails.title}\n作業時間: ${workMinutes}分\n休憩時間: ${breakMinutes}分`;
      }

      // ヘルプメッセージ
      return (
        'どのような作業をお手伝いしましょうか？\n\n' +
        '利用可能なコマンド：\n' +
        '1. 新しいプロジェクトを作成\n' +
        '2. 新しいタスクを追加\n' +
        '3. ポモドーロを開始\n\n' +
        'それぞれのコマンドについて、詳しい使い方を知りたい場合は「使い方」と話しかけてください。'
      );
    } catch (error) {
      console.error('Agent message handling error:', error);
      return (
        '申し訳ありません。処理中にエラーが発生しました。\n' +
        'コマンドの形式を確認して、もう一度お試しください。'
      );
    }
  }

  private extractProjectDetails(message: string): any {
    // メッセージからプロジェクト情報を抽出するロジック
    try {
      const lines = message.split('\n');
      let name, description, deadline;

      for (const line of lines) {
        if (line.includes('プロジェクト名:')) {
          name = line.split(':')[1].trim();
        } else if (line.includes('説明:')) {
          description = line.split(':')[1].trim();
        } else if (line.includes('期限:')) {
          deadline = line.split(':')[1].trim();
        }
      }

      if (name && description && deadline) {
        return { name, description, deadline };
      }
      return null;
    } catch (error) {
      console.error('Error extracting project details:', error);
      return null;
    }
  }

  private extractTaskDetails(message: string): any {
    // メッセージからタスク情報を抽出するロジック
    try {
      const lines = message.split('\n');
      let projectId, title, description, deadline, estimatedMinutes;

      // 実際の実装では、プロジェクト名からIDを取得する処理が必要
      projectId = 'test-project-id'; // 仮の実装

      return null;
    } catch (error) {
      console.error('Error extracting task details:', error);
      return null;
    }
  }

  private extractPomodoroSettings(message: string): any {
    // メッセージからポモドーロ設定を抽出するロジック
    try {
      const lines = message.split('\n');
      let taskId, workMinutes, breakMinutes;

      // 実際の実装では、タスク名からIDを取得する処理が必要
      taskId = 'test-task-id'; // 仮の実装

      return null;
    } catch (error) {
      console.error('Error extracting pomodoro settings:', error);
      return null;
    }
  }
}
