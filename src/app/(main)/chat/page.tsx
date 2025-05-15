
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import type { ChatMessage, Citation } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateCitations as generateCitationsFlow } from '@/ai/flows/citation-generation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Metadata } from 'next';

// Cannot set metadata in client component, should be done in a parent server component or page.tsx if it were server-rendered.
// export const metadata: Metadata = {
//   title: 'Chat - ProAssistant',
// };

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const messagesCollection = collection(db, `users/${user.uid}/messages`);
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string, imageFile?: File) => {
    if (!user || (!text.trim() && !imageFile)) return;

    // For now, image upload to Firebase Storage is not implemented to keep it simple.
    // We'll just store a placeholder or ignore imageFile for now.
    // let imageUrl: string | undefined = undefined;
    // if (imageFile) { /* Upload logic here */ }

    let generatedCitations: Citation[] | undefined;
    try {
      // Check for URLs and generate citations
      if (text.includes('http://') || text.includes('https://')) {
        const citationResult = await generateCitationsFlow({ message: text });
        if (citationResult && citationResult.citations.length > 0) {
          generatedCitations = citationResult.citations;
        }
      }
    } catch (error) {
      console.error("Error generating citations:", error);
      toast({
        title: "Citation Error",
        description: "Could not generate citations for URLs.",
        variant: "destructive",
      });
    }
    
    const userMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
      text: text.trim(),
      sender: 'user',
      userId: user.uid,
      timestamp: serverTimestamp(), // Firestore server timestamp
      // imageUrl, // Add if/when image upload is implemented
    };

    if (generatedCitations && generatedCitations.length > 0) {
      userMessageData.citations = generatedCitations;
    }

    try {
      const messagesCollection = collection(db, `users/${user.uid}/messages`);
      await addDoc(messagesCollection, userMessageData);

      // Mock AI Response
      const aiResponseText = `ProAssistant received: "${text.trim()}"`;
      // if (generatedCitations && generatedCitations.length > 0) {
      //   aiResponseText += `\n\nCitations found: \n${generatedCitations.map(c => `- ${c.url}: ${c.citationText}`).join('\n')}`;
      // }

      const aiMessage: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        text: aiResponseText,
        sender: 'ai',
        userId: 'proassistant-ai',
        timestamp: serverTimestamp(),
      };
      // Simulate a delay for AI response
      setTimeout(async () => {
        await addDoc(messagesCollection, aiMessage);
      }, 1000);

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Error",
        description: "Could not send message.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-col h-full p-4 md:p-6 bg-secondary/50">
      <Card className="flex flex-col flex-1 shadow-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <ChatMessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4 md:p-6 bg-background">
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </Card>
    </div>
  );
}
