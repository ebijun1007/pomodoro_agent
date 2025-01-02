export interface DailyContext {
  date: string; // YYYY-MM-DD形式
  activeProjectId: string | null; // その日のメインプロジェクト
  activeTaskId: string | null; // 現在作業中のタスク
  completedPomodoros: number; // その日の完了ポモドーロ数
  dailyGoal: number; // その日の目標ポモドーロ数（デフォルト8）
}

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  pendingInfo: {
    type: 'project' | 'task' | 'pomodoro' | null;
    collectedData: Record<string, any>;
  };
}
