// メッセージキャッシュの有効期限を1時間とする
const MESSAGE_CACHE_TTL = 1000 * 60 * 60;

class MessageCache {
  private cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  has(key: string): boolean {
    const timestamp = this.cache.get(key);
    if (!timestamp) return false;

    const now = Date.now();
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): void {
    this.cache.set(key, Date.now());
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > MESSAGE_CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

const messageCache = new MessageCache();

export async function callSlackAPI(
  method: string,
  body: Record<string, any>,
  token: string
): Promise<any> {
  try {
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
      console.error(`Slack API error (${method}):`, result.error);
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error(`Failed to call Slack API (${method}):`, error);
    throw error;
  }
}

export async function sendMessage(
  channel: string,
  text: string,
  token: string,
  threadTs?: string
): Promise<boolean> {
  const messageKey = `${channel}-${threadTs || Date.now()}`;

  // 同じメッセージが短時間に重複して送信されることを防ぐ
  if (messageCache.has(messageKey)) {
    return false;
  }

  try {
    await callSlackAPI(
      'chat.postMessage',
      {
        channel,
        text,
        thread_ts: threadTs,
      },
      token
    );

    // 成功したメッセージを記録
    messageCache.add(messageKey);
    return true;
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    return false;
  }
}
