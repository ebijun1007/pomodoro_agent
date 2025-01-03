import type { AIProcessor } from './ai';
import type { ContextManager } from './context-manager';
import type { PomodoroManager } from './pomodoro';
import { generateSummaryMessage } from './scheduled-summary';
import type { TaskManager } from './task';

export class AgentManager {
  constructor(
    private taskManager: TaskManager,
    private pomodoroManager: PomodoroManager,
    private contextManager: ContextManager,
    private aiProcessor: AIProcessor
  ) {}

  async handleMessage(message: string, channelId: string): Promise<string> {
    try {
      const analysis = await this.aiProcessor.analyzeMessage(message);
      console.log('Message analysis:', analysis);

      switch (analysis.intent) {
        case 'list_tasks':
          return await this.handleListTasks(analysis.entities);
        case 'show_summary':
          return await this.handleShowSummary();
        case 'list_projects':
          return await this.handleListProjects();
        case 'create_project':
          return await this.handleCreateProject(analysis.entities);
        case 'create_projects':
          return await this.handleCreateMultipleProjects(analysis.entities);
        case 'create_task':
          return await this.handleCreateTask(analysis.entities);
        case 'create_tasks':
          return await this.handleCreateMultipleTasks(analysis.entities);
        case 'delete_project':
          return await this.handleDeleteProject(analysis.entities, channelId);
        case 'start_pomodoro':
          return await this.handleStartPomodoro(analysis.entities, channelId);
        case 'going_out':
          return await this.handleGoingOut(analysis.entities);
        case 'coming_back':
          return await this.handleComingBack();
        case 'help':
          return this.getHelpMessage();
        default:
          return 'すみません、よく理解できませんでした。「ヘルプ」と入力すると、使用可能なコマンドの一覧を表示します。';
      }
    } catch (error) {
      console.error('Message handling error:', error);
      return 'すみません、エラーが発生しました。もう一度お試しください。';
    }
  }

  private async handleListTasks(entities: any): Promise<string> {
    try {
      const tasks = entities.projectId
        ? await this.taskManager.getTasksByProject(entities.projectId)
        : await this.taskManager.getAllTasks();

      if (tasks.length === 0) {
        return entities.projectId
          ? 'このプロジェクトにはまだタスクがありません。'
          : 'タスクはまだ登録されていません。';
      }

      const taskList = tasks
        .map((task) => `• ${task.id}: ${task.title} (${task.status}) - ${task.estimated_minutes}分`)
        .join('\n');

      return `📝 *タスク一覧*\n\n${taskList}`;
    } catch (error) {
      console.error('List tasks error:', error);
      return 'タスク一覧の取得中にエラーが発生しました。';
    }
  }

  private async handleShowSummary(): Promise<string> {
    try {
      const summary = await generateSummaryMessage(this.taskManager, this.pomodoroManager);
      return `📊 *現在の作業状況*\n\n${summary}`;
    } catch (error) {
      console.error('Show summary error:', error);
      return 'サマリーの生成中にエラーが発生しました。';
    }
  }

  private async handleListProjects(): Promise<string> {
    try {
      const projects = await this.taskManager.getAllProjects();
      if (projects.length === 0) {
        return 'プロジェクトはまだ登録されていません。';
      }

      const projectList = projects
        .map(
          (project) => `• ${project.id}: ${project.name} (期限: ${project.deadline || '未設定'})`
        )
        .join('\n');

      return `📋 *プロジェクト一覧*\n\n${projectList}`;
    } catch (error) {
      console.error('List projects error:', error);
      return 'プロジェクト一覧の取得中にエラーが発生しました。';
    }
  }

  private async handleCreateProject(entities: any): Promise<string> {
    try {
      if (!entities.name) {
        return 'プロジェクト名を指定してください。';
      }

      const projectId = await this.taskManager.createProject({
        name: entities.name,
        description: entities.description || '',
        deadline: entities.deadline,
      });

      return `✅ プロジェクト「${entities.name}」を作成しました（ID: ${projectId}）`;
    } catch (error) {
      console.error('Create project error:', error);
      return 'プロジェクトの作成中にエラーが発生しました。';
    }
  }

  private async handleCreateMultipleProjects(entities: any): Promise<string> {
    try {
      if (
        !entities.projects ||
        !Array.isArray(entities.projects) ||
        entities.projects.length === 0
      ) {
        return 'プロジェクトのリストを指定してください。';
      }

      const projectIds = await this.taskManager.createMultipleProjects(
        entities.projects.map((p) => ({
          name: p.name,
          description: p.description || '',
          deadline: p.deadline,
        }))
      );

      interface ProjectEntity {
        name: string;
        description?: string;
        deadline?: string;
      }

      const createdProjects: string = entities.projects
        .map((p: ProjectEntity, i: number): string => `• ${p.name} (ID: ${projectIds[i]})`)
        .join('\n');

      return `✅ ${projectIds.length}個のプロジェクトを作成しました：\n${createdProjects}`;
    } catch (error) {
      console.error('Create multiple projects error:', error);
      return 'プロジェクトの作成中にエラーが発生しました。もう一度お試しください。';
    }
  }

  private async handleCreateTask(entities: any): Promise<string> {
    try {
      let projectId = entities.projectId;

      // プロジェクトIDが実際のUUIDでない場合は、名前でプロジェクトを検索
      if (!projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const project = await this.taskManager.getProjectByName(projectId);
        if (!project) {
          return `プロジェクト「${projectId}」が見つかりません。`;
        }
        projectId = project.id;
      }

      if (!entities.title) {
        return 'タスクのタイトルを指定してください。';
      }

      const taskId = await this.taskManager.createTask({
        projectId: projectId,
        title: entities.title,
        description: entities.description || '',
        deadline: entities.deadline,
        estimatedMinutes: entities.estimatedMinutes || 25,
      });

      return `✅ タスク「${entities.title}」を作成しました（ID: ${taskId}）`;
    } catch (error) {
      console.error('Create task error:', error);
      return 'タスクの作成中にエラーが発生しました。';
    }
  }

  private async handleCreateMultipleTasks(entities: any): Promise<string> {
    try {
      let projectId = entities.projectId;

      // プロジェクトIDが実際のUUIDでない場合は、名前でプロジェクトを検索
      if (!projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const project = await this.taskManager.getProjectByName(projectId);
        if (!project) {
          return `プロジェクト「${projectId}」が見つかりません。`;
        }
        projectId = project.id;
      }

      if (!entities.tasks || !Array.isArray(entities.tasks) || entities.tasks.length === 0) {
        return 'タスクのリストを指定してください。';
      }

      const taskIds = await this.taskManager.createMultipleTasks(
        projectId,
        entities.tasks.map((t) => ({
          title: t.title,
          description: t.description || '',
          deadline: t.deadline,
          estimatedMinutes: t.estimatedMinutes || 25,
        }))
      );

      const createdTasks = entities.tasks
        .map((t: { title: any }, i: string | number) => `• ${t.title} (ID: ${taskIds[i]})`)
        .join('\n');

      return `✅ ${taskIds.length}個のタスクを作成しました：\n${createdTasks}`;
    } catch (error) {
      console.error('Create multiple tasks error:', error);
      return 'タスクの作成中にエラーが発生しました。もう一度お試しください。';
    }
  }

  private async handleDeleteProject(entities: any, channelId: string): Promise<string> {
    try {
      const projectId = entities.projectId;
      if (!projectId) {
        return '削除するプロジェクトのIDを指定してください。';
      }

      // プロジェクトの存在確認
      const project = await this.taskManager.getProject(projectId);
      if (!project) {
        return `プロジェクト（ID: ${projectId}）が見つかりません。`;
      }

      // プロジェクトの削除を実行
      await this.taskManager.deleteProject(projectId);

      return `✅ プロジェクト「${project.name}」を削除しました。`;
    } catch (error) {
      console.error('Delete project error:', error);
      return 'プロジェクトの削除中にエラーが発生しました。操作をやり直してください。';
    }
  }

  private async handleStartPomodoro(entities: any, channelId: string): Promise<string> {
    try {
      if (!entities.taskId) {
        return 'ポモドーロを開始するタスクのIDを指定してください。';
      }

      const task = await this.taskManager.getTask(entities.taskId);
      if (!task) {
        return `タスク（ID: ${entities.taskId}）が見つかりません。`;
      }

      await this.pomodoroManager.startPomodoro({
        taskId: entities.taskId,
        channelId,
        workMinutes: entities.workMinutes || 25,
        breakMinutes: entities.breakMinutes || 5,
      });

      return `⏰ タスク「${task.title}」のポモドーロを開始します（${
        entities.workMinutes || 25
      }分作業 / ${entities.breakMinutes || 5}分休憩）`;
    } catch (error) {
      console.error('Start pomodoro error:', error);
      return 'ポモドーロの開始中にエラーが発生しました。';
    }
  }

  private async handleGoingOut(entities: any): Promise<string> {
    try {
      const reason = entities.reason || '外出';
      const duration = entities.duration;

      let message = `👋 ${reason}のため一時退席します。`;
      if (duration) {
        message += `\n${duration}分後に戻る予定です。`;
      }
      return message;
    } catch (error) {
      console.error('Going out error:', error);
      return 'ステータス更新中にエラーが発生しました。';
    }
  }

  private async handleComingBack(): Promise<string> {
    try {
      return '🏠 おかえりなさい！';
    } catch (error) {
      console.error('Coming back error:', error);
      return 'ステータス更新中にエラーが発生しました。';
    }
  }

  private getHelpMessage(): string {
    return `
🤖 *使用可能なコマンド*

📋 *プロジェクト管理*
• プロジェクト一覧を見せて
• 新しいプロジェクトを作成して
• 複数のプロジェクトを追加して
• プロジェクトを削除して

📝 *タスク管理*
• タスク一覧を見せて
• [プロジェクト名]のタスクを見せて
• 新しいタスクを追加して
• 複数のタスクを追加して

📊 *状況確認*
• 今日のタスクを教えて
• 現在の作業状況を教えて
• サマリーを見せて

⏰ *ポモドーロ管理*
• タスク[ID]の作業を開始
• 作業時間を[分]分に設定
• 休憩時間を[分]分に設定

🚶 *外出・帰宅*
• 行ってきます
• 戻りました

各コマンドは自然な日本語で入力できます。`;
  }
}
