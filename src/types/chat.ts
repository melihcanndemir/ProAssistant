
import type { Timestamp } from 'firebase/firestore';

export interface Citation {
  url: string;
  citationText: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  userId: string;
  timestamp: Timestamp; 
  imageUrl?: string;
  citations?: Citation[];
  isLoading?: boolean; // Added to indicate AI is typing or message is streaming
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: Timestamp;
  lastMessageTimestamp?: Timestamp;
}
