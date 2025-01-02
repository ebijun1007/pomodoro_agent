interface HandleParams {
  event: any;
  taskManager: any;
  pomodoroManager: any;
  agentManager: any;
  env: {
    SLACK_BOT_TOKEN: string;
    SLACK_SIGNING_SECRET: string;
  };
}

// Slack API呼び出し用のヘルパー関数
async function callSlackAPI(method: string, body: any, token: string) {
  try {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error(`Slack API error: ${method}`, result.error);
      throw new Error(`Slack API call failed: ${result.error}`);
    }
    return result;
  } catch (error) {
    console.error(`Failed to call Slack API: ${method}`, error);
    throw error;
  }
}

export async function handle({
  event,
  taskManager,
  pomodoroManager,
  agentManager,
  env
}: HandleParams) {
  const channelId = event.channel;

  try {
    // エージェントの応答を取得
    const response = await agentManager.handleMessage(event.text);

    // 応答をSlackに送信（スレッドなし）
    await callSlackAPI('chat.postMessage', {
      channel: channelId,
      text: response
    }, env.SLACK_BOT_TOKEN);

    // ポモドーロセッション中の場合のタイマー通知
    const activeSession = await pomodoroManager.getActiveSession();
    if (activeSession) {
      setTimeout(async () => {
        await callSlackAPI('chat.postMessage', {
          channel: channelId,
          text: "🍅 作業時間が終了しました！休憩を始めましょう。"
        }, env.SLACK_BOT_TOKEN);

        const priorityTasks = await taskManager.getPriorityTasks();
        const taskList = priorityTasks.map((task: any, index: number) => 
          `${index + 1}. ${task.title} (プロジェクト: ${task.project_name}, 期限: ${task.deadline})`
        ).join('\n');

        await callSlackAPI('chat.postMessage', {
          channel: channelId,
          text: "次に取り組むタスクを選択してください：\n" + taskList
        }, env.SLACK_BOT_TOKEN);
      }, activeSession.workMinutes * 60 * 1000);

      // 休憩終了の通知
      setTimeout(async () => {
        await callSlackAPI('chat.postMessage', {
          channel: channelId,
          text: "休憩時間が終了しました！次のセッションを始めましょう。"
        }, env.SLACK_BOT_TOKEN);
      }, (activeSession.workMinutes + activeSession.breakMinutes) * 60 * 1000);
    }
  } catch (error) {
    console.error('Handle error:', error);
    await callSlackAPI('chat.postMessage', {
      channel: channelId,
      text: "申し訳ありません。エラーが発生しました。しばらく待ってから再度お試しください。"
    }, env.SLACK_BOT_TOKEN);
  }
}

// Slackメッセージのブロックを構築するヘルパー関数
function buildTaskBlock(task: any) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${task.title}*\n${task.description}\n*プロジェクト:* ${task.project_name}\n*期限:* ${task.deadline}\n*見積時間:* ${task.estimated_minutes}分`
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "開始",
        emoji: true
      },
      value: task.id,
      action_id: "start_task"
    }
  };
}

function buildPomodoroSettingsBlock(workMinutes: number, breakMinutes: number) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*現在のポモドーロ設定*\n作業時間: ${workMinutes}分\n休憩時間: ${breakMinutes}分`
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "設定変更",
        emoji: true
      },
      action_id: "change_pomodoro_settings"
    }
  };
}