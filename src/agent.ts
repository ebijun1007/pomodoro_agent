import { TaskManager } from './task';
import { PomodoroManager } from './pomodoro';
import { ContextManager } from './context-manager';
import { AIProcessor } from './ai';

export class AgentManager {
  constructor(
    private taskManager: TaskManager,
    private pomodoroManager: PomodoroManager,
    private contextManager: ContextManager,
    private aiProcessor: AIProcessor
  ) {}

  async handleMessage(message: string): Promise<string> {
    try {
      console.log('AgentManager: Processing message:', message); // デバッグログ

      // コンテキストの初期化/更新
      await this.contextManager.updateConversationContext(message);
      console.log('AgentManager: Context updated'); // デバッグログ

      // メッセージの解析
      const prompt = await this.contextManager.buildPrompt(message);
      console.log('AgentManager: Built prompt:', prompt); // デバッグログ

      const analysis = await this.aiProcessor.analyzeMessage(prompt);
      console.log('AgentManager: AI analysis result:', analysis); // デバッグログ

      // 応答の生成
      const response = await this.handleIntent(analysis.intent, analysis.entities);
      console.log('AgentManager: Generated response:', response); // デバッグログ

      // アシスタントの応答をコンテキストに追加
      await this.contextManager.addAssistantResponse(response);

      return response;
    } catch (error) {
      console.error('Agent message handling error:', error);
      return '申し訳ありません。処理中にエラーが発生しました。もう一度お試しください。';
    }
  }

  private async handleIntent(intent: string, entities: any): Promise<string> {
    console.log('AgentManager: Handling intent:', intent, 'with entities:', entities); // デバッグログ

    switch (intent) {
      case 'create_project':
        return this.handleCreateProject(entities);
      case 'create_task':
        return this.handleCreateTask(entities);
      case 'start_pomodoro':
        return this.handleStartPomodoro(entities);
      case 'check_status':
        return this.handleCheckStatus();
      default:
        return 'ご要望を理解できませんでした。もう少し具体的に教えていただけますか？';
    }
  }

  private async handleCreateProject(entities: any): Promise<string> {
    console.log('AgentManager: Creating project with entities:', entities); // デバッグログ
    const { name, description, deadline } = entities;

    if (!name || !description || !deadline) {
      return 'プロジェクトの作成には、名前、説明、期限が必要です。\n例：プロジェクト名: ウェブアプリ開発\n説明: 新規サービスの開発プロジェクト\n期限: 2024-03-31';
    }

    await this.taskManager.createProject(name, description, deadline);
    return `プロジェクト「${name}」を作成しました。\n説明: ${description}\n期限: ${deadline}`;
  }

  private async handleCreateTask(entities: any): Promise<string> {
    console.log('AgentManager: Creating task with entities:', entities); // デバッグログ
    const { projectId, title, description, deadline, estimatedMinutes } = entities;

    if (!projectId || !title || !description || !deadline || !estimatedMinutes) {
      return 'タスクの作成には、プロジェクト、タイトル、説明、期限、見積時間が必要です。';
    }

    await this.taskManager.createTask(projectId, title, description, deadline, estimatedMinutes);
    return `タスク「${title}」を作成しました。\n説明: ${description}\n期限: ${deadline}\n見積時間: ${estimatedMinutes}分`;
  }

  private async handleStartPomodoro(entities: any): Promise<string> {
    console.log('AgentManager: Starting pomodoro with entities:', entities); // デバッグログ
    const { taskId, workMinutes = 25, breakMinutes = 5 } = entities;

    if (!taskId) {
      return 'ポモドーロを開始するには、タスクを指定してください。';
    }

    await this.pomodoroManager.startSession(taskId, workMinutes, breakMinutes);
    const taskDetails = await this.taskManager.getTaskDetails(taskId);

    return `ポモドーロセッションを開始します。\nタスク: ${taskDetails.title}\n作業時間: ${workMinutes}分\n休憩時間: ${breakMinutes}分`;
  }

  private async handleCheckStatus(): Promise<string> {
    const context = await this.contextManager.initializeDailyContext();
    return `今日の進捗状況:\n完了したポモドーロ: ${context.completedPomodoros} / ${context.dailyGoal}`;
  }
}
