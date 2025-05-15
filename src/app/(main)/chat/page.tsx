
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput as ChatInputComponent } from '@/components/chat/ChatInput';
import type { ChatMessage, Citation } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, DocumentReference } from 'firebase/firestore';
import { generateCitations as generateCitationsFlow } from '@/ai/flows/citation-generation';
import { chat as chatFlow, type ChatInput, type ChatOutput } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    setIsAiResponding(true);
    abortControllerRef.current = new AbortController();

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
    let aiMessageRef: DocumentReference | null = null;
    let aiMessageId: string | null = null;
    const tempClientAiMessageId = `temp-ai-${Date.now()}`; // For optimistic UI update

    try {
      await addDoc(messagesCollection, userMessageData);

      // Add placeholder for AI message
      const aiMessagePlaceholderData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        text: '...', // Typing indicator
        sender: 'ai',
        userId: 'proassistant-ai',
        timestamp: serverTimestamp(),
        isLoading: true,
      };
      
      // Optimistically add placeholder to local state
      setMessages(prevMessages => [
        ...prevMessages,
        { ...aiMessagePlaceholderData, id: tempClientAiMessageId, timestamp: new Timestamp(Math.floor(Date.now()/1000),0) } as ChatMessage
      ]);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });


      aiMessageRef = await addDoc(messagesCollection, aiMessagePlaceholderData);
      aiMessageId = aiMessageRef.id;

      // Update local state with real ID and clear text for streaming
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempClientAiMessageId ? { ...msg, id: aiMessageId!, text: '', isLoading: true } : msg
      ));

      const aiFlowInput: ChatInput = { message: text.trim() };
      // Await the server action call
      const { stream, response: finalResponsePromise } = await chatFlow(aiFlowInput);

      let accumulatedResponse = '';
      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log("AI response streaming aborted by user.");
          if (aiMessageRef) {
            await updateDoc(aiMessageRef, { text: accumulatedResponse + "\n(Yanıt iptal edildi)", isLoading: false, timestamp: serverTimestamp() });
          }
          setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: accumulatedResponse + "\n(Yanıt iptal edildi)", isLoading: false} : m));
          break;
        }
        
        if (chunk.output?.response) {
          // Append the new part of the response.
          // Genkit streams can sometimes send the whole acculumated response in each chunk,
          // or just the delta. The prompt is simple so it's likely sending deltas or small fulls.
          // For this example, we assume `chunk.output.response` is the *new piece* or *current full text*.
          // To be safe, let's just set it as the current text.
          accumulatedResponse = chunk.output.response; 
          if (aiMessageRef) {
            // No need to await updateDoc for every chunk if performance is critical,
            // but it ensures data persistence if connection drops.
            // For a smoother UI, you might only update Firestore less frequently or at the end.
            await updateDoc(aiMessageRef, { text: accumulatedResponse, isLoading: true });
          }
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === aiMessageId ? { ...msg, text: accumulatedResponse, isLoading: true } : msg
            )
          );
        }
      }

      if (abortControllerRef.current?.signal.aborted) {
        // Already handled
      } else {
        const finalAiOutput = (await finalResponsePromise).output;
        if (finalAiOutput?.response) {
          if (aiMessageRef) {
            await updateDoc(aiMessageRef, { text: finalAiOutput.response, isLoading: false, timestamp: serverTimestamp() });
          }
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === aiMessageId ? { ...msg, text: finalAiOutput.response, isLoading: false } : msg
            )
          );
        } else {
          const errorText = "Üzgünüm, yanıtımı tamamlayamadım.";
          if (aiMessageRef) await updateDoc(aiMessageRef, { text: errorText, isLoading: false, timestamp: serverTimestamp() });
          setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: errorText, isLoading: false} : m));
        }
      }

    } catch (error: any) {
      console.error("Error sending message or getting AI response:", error);
      const errorText = "Özür dilerim, yanıt verirken bir sorunla karşılaştım.";
      if (aiMessageRef && aiMessageId) {
        await updateDoc(aiMessageRef, { text: errorText, isLoading: false, timestamp: serverTimestamp() });
         setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: errorText, isLoading: false} : m));
      } else {
         // If AI placeholder wasn't even added to FS or local state correctly
         setMessages(prev => prev.filter(m => m.id !== tempClientAiMessageId)); // Remove optimistic placeholder
         const errorAiMessage: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
          text: errorText, sender: 'ai', userId: 'proassistant-ai', timestamp: serverTimestamp(), isLoading: false
        };
        await addDoc(messagesCollection, errorAiMessage); // Add a new error message
      }
      toast({
        title: "AI Hatası",
        description: error.message || "Yapay zeka yanıtı alınamadı.",
        variant: "destructive",
      });
    } finally {
      setIsAiResponding(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
          <ChatInputComponent 
            onSendMessage={handleSendMessage} 
            isAiResponding={isAiResponding}
            onStopGenerating={handleStopGenerating}
          />
        </div>
      </Card>
    </div>
  );
}
