
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput as ChatInputComponent } from '@/components/chat/ChatInput';
import type { ChatMessage, Citation } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, DocumentReference, getDoc, setDoc } from 'firebase/firestore';
import { generateCitations as generateCitationsFlow } from '@/ai/flows/citation-generation';
import { chat as chatFlow, type ChatInput } from '@/ai/flows/chat-flow'; // Removed ChatOutput as it's inferred
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function ChatSessionPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  useEffect(() => {
    if (!user || !chatId) {
      setIsLoadingChat(false);
      return;
    };

    setIsLoadingChat(true);
    const messagesCollection = collection(db, `users/${user.uid}/chats/${chatId}/messages`);
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(newMessages);
      setIsLoadingChat(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
      setIsLoadingChat(false);
    });

    return () => unsubscribe();
  }, [user, chatId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string, imageFile?: File) => {
    if (!user || !chatId || (!text.trim() && !imageFile)) return;

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
    
    const userMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any, citations?: Citation[] } = {
      text: text.trim(),
      sender: 'user',
      userId: user.uid,
      timestamp: serverTimestamp(),
    };
    if (generatedCitations && generatedCitations.length > 0) {
      userMessageData.citations = generatedCitations;
    }

    const messagesCollection = collection(db, `users/${user.uid}/chats/${chatId}/messages`);
    const chatDocRef = doc(db, `users/${user.uid}/chats/${chatId}`);
    let aiMessageRef: DocumentReference | null = null;
    let aiMessageId: string | null = null;
    const tempClientAiMessageId = `temp-ai-${Date.now()}`; 

    try {
      await addDoc(messagesCollection, userMessageData);

      // Update chat session metadata (title and lastMessageTimestamp)
      const chatDocSnap = await getDoc(chatDocRef);
      const chatUpdateData: { lastMessageTimestamp: any, title?: string } = {
        lastMessageTimestamp: serverTimestamp(),
      };

      if (!chatDocSnap.exists() || chatDocSnap.data()?.title === "New Chat" || messages.length === 0) {
        chatUpdateData.title = text.trim().split(' ').slice(0, 5).join(' ') + (text.trim().split(' ').length > 5 ? '...' : '');
      }
      await setDoc(chatDocRef, chatUpdateData, { merge: true });


      const aiMessagePlaceholderData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        text: '...', 
        sender: 'ai',
        userId: 'proassistant-ai',
        timestamp: serverTimestamp(),
        isLoading: true,
      };
      
      setMessages(prevMessages => [
        ...prevMessages,
        { ...aiMessagePlaceholderData, id: tempClientAiMessageId, timestamp: new Timestamp(Math.floor(Date.now()/1000),0) } as ChatMessage
      ]);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

      aiMessageRef = await addDoc(messagesCollection, aiMessagePlaceholderData);
      aiMessageId = aiMessageRef.id;

      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempClientAiMessageId ? { ...msg, id: aiMessageId!, text: '', isLoading: true } : msg
      ));

      const aiFlowInput: ChatInput = { message: text.trim() };
      const { stream, response: finalResponsePromise } = await chatFlow(aiFlowInput);

      let accumulatedResponse = '';
      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log("AI response streaming aborted by user.");
          if (aiMessageRef) {
            await updateDoc(aiMessageRef, { text: accumulatedResponse + "\n(Response cancelled)", isLoading: false, timestamp: serverTimestamp() });
          }
          setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: accumulatedResponse + "\n(Response cancelled)", isLoading: false} : m));
          break;
        }
        
        if (chunk.output?.response) {
          accumulatedResponse = chunk.output.response; 
          if (aiMessageRef) {
            // No need to await updateDoc for each chunk in Firestore if focusing on UI responsiveness
             updateDoc(aiMessageRef, { text: accumulatedResponse, isLoading: true }).catch(err => console.error("Error updating chunk to Firestore:", err));
          }
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === aiMessageId ? { ...msg, text: accumulatedResponse, isLoading: true } : msg
            )
          );
        }
      }
      
      // Final update after stream ends or is aborted
      if (aiMessageRef) {
        const finalAiOutput = abortControllerRef.current?.signal.aborted ? null : (await finalResponsePromise).output;
        const finalText = finalAiOutput?.response ?? (accumulatedResponse + (abortControllerRef.current?.signal.aborted ? "\n(Response cancelled)" : ""));
        
        await updateDoc(aiMessageRef, { text: finalText, isLoading: false, timestamp: serverTimestamp() });
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: finalText, isLoading: false } : msg
          )
        );
        if (!finalAiOutput?.response && !abortControllerRef.current?.signal.aborted) {
            const errorText = "Sorry, I couldn't complete my response.";
            await updateDoc(aiMessageRef, { text: errorText, isLoading: false, timestamp: serverTimestamp() });
            setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: errorText, isLoading: false} : m));
        }
      }

    } catch (error: any) {
      console.error("Error sending message or getting AI response:", error);
      const errorText = "Sorry, I encountered an issue while responding.";
      if (aiMessageRef && aiMessageId) {
        await updateDoc(aiMessageRef, { text: errorText, isLoading: false, timestamp: serverTimestamp() });
         setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: errorText, isLoading: false} : m));
      } else {
         setMessages(prev => prev.filter(m => m.id !== tempClientAiMessageId)); 
         const errorAiMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
          text: errorText, sender: 'ai', userId: 'proassistant-ai', timestamp: serverTimestamp(), isLoading: false
        };
        // Only add error message if a placeholder wasn't already potentially created and failed before stream
        if (!aiMessageId) { 
            await addDoc(messagesCollection, errorAiMessageData);
        }
      }
      toast({
        title: "AI Error",
        description: error.message || "Could not get AI response.",
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
  
  if (authLoading || isLoadingChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 bg-secondary/50">
      <Card className="flex flex-col flex-1 shadow-lg overflow-hidden w-full">
        <div className="flex flex-col flex-1 justify-center items-center overflow-y-auto p-4 md:p-6">
          <ChatMessageList messages={messages} messagesEndRef={messagesEndRef} />
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
