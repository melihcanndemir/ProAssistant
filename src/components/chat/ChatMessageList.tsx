
"use client";
import React from 'react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export function ChatMessageList({ messages, messagesEndRef }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle-heart mb-4 opacity-50">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
          <path d="M15.81 11.12a2.57 2.57 0 0 0-2.25-1.12c-1.43.02-2.58 1.18-2.58 2.63 0 .4.1.77.28 1.12L12 17l.72-3.23c.17-.35.28-.72.28-1.12Z"/>
        </svg>
        <p className="text-lg">Start a conversation with ProAssistant!</p>
        <p className="text-sm">Type your message below to begin.</p>
      </div>
    );
  }

  return (
    <div className="w-full"> {/* Added w-full to ensure it takes up horizontal space for items-center to work as expected */}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {messagesEndRef && <div ref={messagesEndRef} />}
    </div>
  );
}
