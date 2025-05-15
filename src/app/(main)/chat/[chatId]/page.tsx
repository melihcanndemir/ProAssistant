
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
import { chat as chatFlowFn, type ChatInput } from '@/ai/flows/chat-flow'; // Renamed to avoid conflict
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

      const chatUpdateData: { lastMessageTimestamp: any, title?: string } = {
        lastMessageTimestamp: serverTimestamp(),
      };

      const chatDocSnap = await getDoc(chatDocRef);
      if (chatDocSnap.exists() && chatDocSnap.data()?.title === "New Chat") {
        chatUpdateData.title = text.trim().split(' ').slice(0, 5).join(' ') + (text.trim().split(' ').length > 5 ? '...' : '');
      }
      if (chatUpdateData.title || Object.keys(chatUpdateData).length > 1) {
        await setDoc(chatDocRef, chatUpdateData, { merge: true });
      }

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
      const { stream, response: finalResponsePromise } = await chatFlowFn(aiFlowInput);

      let accumulatedResponse = '';
      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log("AI response streaming aborted by user.");
          if (aiMessageRef) {
             // Don't set isLoading to false yet, finalization below will do it.
             // Only update text if there's something to show from partial stream.
            if (accumulatedResponse) {
                await updateDoc(aiMessageRef, { text: accumulatedResponse + "\n(Yanıt iptal edildi)"});
            } else {
                await updateDoc(aiMessageRef, { text: "(Yanıt iptal edildi)"});
            }
          }
          break; 
        }
        
        if (chunk.output?.response) {
          accumulatedResponse = chunk.output.response; 
          if (aiMessageRef) {
            updateDoc(aiMessageRef, { text: accumulatedResponse, isLoading: true }).catch(err => console.error("Error updating chunk to Firestore:", err));
          }
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === aiMessageId ? { ...msg, text: accumulatedResponse, isLoading: true } : msg
            )
          );
        }
      }
      
      if (aiMessageRef) {
        const finalLlmResponse = abortControllerRef.current?.signal.aborted ? null : await finalResponsePromise;
        const finalAiOutput = finalLlmResponse?.output;
        let finalTextToSave: string;

        if (abortControllerRef.current?.signal.aborted) {
          finalTextToSave = accumulatedResponse ? accumulatedResponse + "\n(Yanıt iptal edildi)" : "(Yanıt iptal edildi)";
        } else {
          if (finalAiOutput?.response && finalAiOutput.response.trim() !== "") {
            finalTextToSave = finalAiOutput.response;
          } else if (accumulatedResponse && accumulatedResponse.trim() !== "") {
            finalTextToSave = accumulatedResponse;
            console.warn("Final AI output was empty or invalid, using accumulated stream data. Full LLM response:", JSON.stringify(finalLlmResponse));
            // Optionally, show a less severe toast if stream data was used
            toast({
              title: "Yapay Zeka Uyarısı",
              description: "Yapay zekanın nihai yanıtı boştu, akıştan gelen veri kullanıldı.",
              variant: "default",
            });
          } else {
            finalTextToSave = "Üzgünüm, şu anda bir yanıt oluşturamıyorum.";
            console.error("AI failed to provide a valid response. Full LLM response:", JSON.stringify(finalLlmResponse));
            toast({
              title: "Yapay Zeka Hatası",
              description: "Yapay zeka geçerli bir yanıt döndüremedi.",
              variant: "destructive",
            });
          }
        }
        
        await updateDoc(aiMessageRef, { text: finalTextToSave, isLoading: false, timestamp: serverTimestamp() });
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: finalTextToSave, isLoading: false } : msg
          )
        );
      }

    } catch (error: any) {
      console.error("Error sending message or getting AI response:", error);
      const errorText = "Üzgünüm, yanıt verirken bir sorunla karşılaştım.";
      if (aiMessageRef && aiMessageId) {
        await updateDoc(aiMessageRef, { text: errorText, isLoading: false, timestamp: serverTimestamp() });
         setMessages(prev => prev.map(m => m.id === aiMessageId ? {...m, text: errorText, isLoading: false} : m));
      } else {
         setMessages(prev => prev.filter(m => m.id !== tempClientAiMessageId)); 
         const errorAiMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
          text: errorText, sender: 'ai', userId: 'proassistant-ai', timestamp: serverTimestamp(), isLoading: false
        };
        if (!aiMessageId) { 
            await addDoc(messagesCollection, errorAiMessageData);
        }
      }
      toast({
        title: "Yapay Zeka Hatası",
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
