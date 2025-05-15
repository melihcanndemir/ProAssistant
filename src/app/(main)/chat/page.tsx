
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput as ChatInputComponent } from '@/components/chat/ChatInput'; // Renamed to avoid conflict
import type { ChatMessage, Citation } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateCitations as generateCitationsFlow } from '@/ai/flows/citation-generation';
import { chat as chatFlow, type ChatInput } from '@/ai/flows/chat-flow'; // Import the new chat flow
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
// import { Metadata } from 'next'; // Cannot be used in client component

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

    let generatedCitations: Citation[] | undefined;
    try {
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
      timestamp: serverTimestamp(),
    };

    if (generatedCitations && generatedCitations.length > 0) {
      userMessageData.citations = generatedCitations;
    }

    const messagesCollection = collection(db, `users/${user.uid}/messages`);
    
    try {
      // Add user message to Firestore
      await addDoc(messagesCollection, userMessageData);

      // Get AI Response
      const aiFlowInput: ChatInput = { message: text.trim() };
      // Here you could also pass message history to the AI if your flow supports it
      // aiFlowInput.history = messages.slice(-10).map(m => ({role: m.sender === 'user' ? 'user' : 'model', content: m.text}));
      
      const aiResponseOutput = await chatFlow(aiFlowInput);

      let aiResponseText = "I'm sorry, I couldn't quite understand that. Could you please rephrase?"; // Default fallback
      if (aiResponseOutput && aiResponseOutput.response) {
        aiResponseText = aiResponseOutput.response;
      }
      
      const aiMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        text: aiResponseText,
        sender: 'ai',
        userId: 'proassistant-ai', 
        timestamp: serverTimestamp(),
      };
      // Add AI message to Firestore
      await addDoc(messagesCollection, aiMessageData);

    } catch (error) {
      console.error("Error sending message or getting AI response:", error);
      toast({
        title: "Error",
        description: "Could not send message or get AI response.",
        variant: "destructive",
      });
       // Optionally, add a more generic AI error message to chat if the flow itself failed
       const errorAiMessage: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        text: "Apologies, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        userId: 'proassistant-ai',
        timestamp: serverTimestamp(),
      };
      await addDoc(messagesCollection, errorAiMessage);
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
          <ChatInputComponent onSendMessage={handleSendMessage} />
        </div>
      </Card>
    </div>
  );
}
