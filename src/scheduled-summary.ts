import { PomodoroManager } from './pomodoro';
import { TaskManager } from './task';

async function callSlackAPI(method: string, body: any, token: string) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Slack API call failed: ${result.error}`);
  }
  return result;
}

export async function generateSummaryMessage(
  taskManager: TaskManager,
  pomodoroManager: PomodoroManager
): Promise<string> {
  // 現在進行中のタスクを取得
  const inProgressTasks = await taskManager.getTasksByStatus('in_progress');
  let message = '';

  if (inProgressTasks.length > 0) {
    message += '🔄 *進行中のタスク*\n';
    for (const task of inProgressTasks) {
      const deadline = task.deadline
        ? `期限: ${new Date(task.deadline).toLocaleDateString('ja-JP')}`
        : '期限なし';

      message += `• *${task.title}*\n`;
      message += `  └ ${task.description || '説明なし'}\n`;
      message += `  └ ${deadline}\n`;
      message += `  └ プロジェクト: ${task.project_name}\n`;
    }
  } else {
    message += '📋 *おすすめの次のタスク*\n';
    const priorityTasks = await taskManager.getPriorityTasks(5);

    if (priorityTasks.length > 0) {
      for (const task of priorityTasks) {
        const deadline = task.deadline
          ? `期限: ${new Date(task.deadline).toLocaleDateString('ja-JP')}`
          : '期限なし';

        message += `• *${task.title}*\n`;
        message += `  └ ${task.description || '説明なし'}\n`;
        message += `  └ ${deadline}\n`;
        message += `  └ プロジェクト: ${task.project_name}\n`;
      }
    } else {
      message += 'タスクはありません。\n';
    }
  }

  // 今日の統計
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = await pomodoroManager.getDailyStats(today);

  message += '\n📊 *本日の統計*\n';
  message += `• 完了したポモドーロ: ${dailyStats.completed_sessions}回\n`;
  message += `• 総作業時間: ${dailyStats.total_work_minutes}分\n`;

  return message;
}

export async function handleScheduledSummary(
  env: {
    DB: D1Database;
    SLACK_BOT_TOKEN: string;
    SLACK_CHANNEL_ID: string;
  },
  timeOfDay: 'morning' | 'evening'
): Promise<void> {
  const taskManager = new TaskManager(env.DB);
  const pomodoroManager = new PomodoroManager(env.DB);

  try {
    const message = await generateSummaryMessage(taskManager, pomodoroManager);
    const prefix =
      timeOfDay === 'morning' ? '☀️ おはようございます！\n' : '🌙 本日もお疲れ様でした！\n';

    await callSlackAPI(
      'chat.postMessage',
      {
        channel: env.SLACK_CHANNEL_ID,
        text: prefix + message,
      },
      env.SLACK_BOT_TOKEN
    );
  } catch (error) {
    console.error('Failed to send summary:', error);

    await callSlackAPI(
      'chat.postMessage',
      {
        channel: env.SLACK_CHANNEL_ID,
        text: 'サマリーの送信中にエラーが発生しました。',
      },
      env.SLACK_BOT_TOKEN
    );
  }
}
