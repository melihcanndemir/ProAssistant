
"use client";
import React from 'react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const
 
timestamp = message.timestamp ? (message.timestamp as any).toDate ? (message.timestamp as any).toDate() : new Date(message.timestamp as any) : new Date();

  const getInitials = (name?: string | null) => {
    if (!name) return isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />;
    const names = name.split(' ');
    if (names.length === 1 && names[0].length > 0) return names[0].substring(0, 2).toUpperCase();
    return names.map(n => n[0]).join('').toUpperCase();
  }
  
  // A very basic markdown link replacer. For full markdown, a library is needed.
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{part}</a>;
      }
      return part;
    });
  };


  return (
    <div className={cn("flex gap-3 my-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-10 w-10 border">
          <AvatarFallback><Bot className="h-5 w-5 text-primary" /></AvatarFallback>
        </Avatar>
      )}
      <Card className={cn("max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl rounded-xl shadow", 
                        isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none")}>
        <CardContent className="p-3">
          <div className="text-sm whitespace-pre-wrap break-words">
            {renderTextWithLinks(message.text)}
          </div>
          {message.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden">
              <Image src={message.imageUrl} alt="Uploaded content" width={300} height={200} className="object-cover" data-ai-hint="chat image" />
            </div>
          )}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className={cn("text-xs font-semibold mb-1", isUser ? "text-primary-foreground/80" : "text-muted-foreground")}>Citations:</p>
              <ul className="space-y-1">
                {message.citations.map((citation, index) => (
                  <li key={index} className="text-xs">
                    <a href={citation.url} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", isUser ? "text-accent-foreground/70 hover:text-accent-foreground" : "text-accent hover:text-accent/80")}>
                      [{index + 1}] {citation.citationText.substring(0,50)}{citation.citationText.length > 50 ? '...' : ''} ({citation.url.substring(0,30)}{citation.url.length > 30 ? '...' : ''})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className={cn("text-xs px-3 pb-2 pt-1", isUser ? "text-primary-foreground/70 justify-end" : "text-muted-foreground justify-start")}>
          {format(timestamp, 'p')}
        </CardFooter>
      </Card>
      {isUser && (
         <Avatar className="h-10 w-10 border">
          {/* Placeholder for user avatar, ideally from auth context */}
          <AvatarFallback><User className="h-5 w-5 text-primary"/></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

// Memoize ChatMessage for performance, preventing re-renders if props haven't changed.
export const ChatMessage = React.memo(ChatMessageComponent);
