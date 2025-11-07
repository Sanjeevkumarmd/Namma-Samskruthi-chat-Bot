export enum Screen {
  Welcome = 'welcome',
  Chat = 'chat',
  History = 'history',
  Explore = 'explore',
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export enum Language {
  EN = 'en-US',
  HI = 'hi-IN',
  KN = 'kn-IN',
}

export type MessagePart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model' | 'system';
  parts: MessagePart[];
  timestamp: number;
  status?: 'sent' | 'seen';
  feedback?: 'positive' | 'negative';
};

export type Chat = {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
};