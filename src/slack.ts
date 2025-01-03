import { callSlackAPI } from './slack-messenger';

interface HandleParams {
  event: any;
  agentManager: any;
  env: {
    SLACK_BOT_TOKEN: string;
    pomodoro_context: KVNamespace;
  };
}

async function checkDuplicateEvent(event: any, kv: KVNamespace): Promise<boolean> {
  const eventId = event.event_ts || event.ts;
  const key = `event:${eventId}`;

  try {
    const existing = await kv.get(key);
    if (existing) {
      return true;
    }

    // イベントを保存（10秒後に自動削除）
    await kv.put(key, '1', { expirationTtl: 10 });
    return false;
  } catch (error) {
    console.error('Error checking duplicate event:', error);
    return false;
  }
}

export async function handle({ event, agentManager, env }: HandleParams) {
  // 重複チェック
  if (await checkDuplicateEvent(event, env.pomodoro_context)) {
    console.log('Skipping duplicate event');
    return;
  }

  const channelId = event.channel;

  try {
    console.log('Handling message:', event.text);

    // エージェントの応答を取得（channelIdを渡すように修正）
    const response = await agentManager.handleMessage(event.text, channelId);
    console.log('Agent response:', response);

    // 応答をSlackに送信
    await callSlackAPI(
      'chat.postMessage',
      {
        channel: channelId,
        text: response,
      },
      env.SLACK_BOT_TOKEN
    );
  } catch (error) {
    console.error('Handle error:', error);
    await callSlackAPI(
      'chat.postMessage',
      {
        channel: channelId,
        text: '申し訳ありません。エラーが発生しました。しばらく待ってから再度お試しください。',
      },
      env.SLACK_BOT_TOKEN
    );
  }
}

export class SlackNotifier {
  constructor(
    private token: string,
    private channelId: string
  ) {}
}
