export class SlackMessenger {
  private readonly processedMessages = new Set<string>();

  constructor(private readonly token: string) {
    // 1時間ごとにメッセージキャッシュをクリア
    setInterval(
      () => {
        this.processedMessages.clear();
      },
      1000 * 60 * 60
    );
  }

  async sendMessage(channel: string, text: string, threadTs?: string): Promise<boolean> {
    const messageKey = `${channel}-${threadTs || Date.now()}`;

    // 同じメッセージが短時間に重複して送信されることを防ぐ
    if (this.processedMessages.has(messageKey)) {
      return false;
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          channel,
          text,
          thread_ts: threadTs,
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        console.error('Slack API error:', result.error);
        return false;
      }

      // 成功したメッセージを記録
      this.processedMessages.add(messageKey);
      return true;
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      return false;
    }
  }
}
