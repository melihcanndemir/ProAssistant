
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  // SidebarMenuSkeleton, // Can be used later for loading states
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MessageSquare, Settings, LogOut } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ChatSession } from '@/types/chat';
import { cn } from '@/lib/utils';

export function ChatHistorySidebar() {
  const { state: sidebarState, isMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const currentChatId = params.chatId as string | undefined;

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  useEffect(() => {
    if (!user) {
      setChatSessions([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    const chatsCollectionRef = collection(db, `users/${user.uid}/chats`);
    const q = query(chatsCollectionRef, orderBy('lastMessageTimestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sessions: ChatSession[] = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setChatSessions(sessions);
      setIsLoadingChats(false);
    }, (error) => {
      console.error("Error fetching chat sessions:", error);
      setIsLoadingChats(false);
      // Optionally, show a toast message for the error
    });

    return () => unsubscribe();
  }, [user]);

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const newChatRef = await addDoc(collection(db, `users/${user.uid}/chats`), {
        title: "New Chat",
        userId: user.uid,
        createdAt: serverTimestamp() as Timestamp,
        lastMessageTimestamp: serverTimestamp() as Timestamp,
      });
      router.push(`/chat/${newChatRef.id}`);
      if (isMobile && useSidebar().setOpenMobile) { // Close mobile sidebar on new chat
        useSidebar().setOpenMobile(false);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
      // Optionally, show a toast message for the error
    }
  };

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
     if (isMobile && useSidebar().setOpenMobile) { // Close mobile sidebar on chat select
        useSidebar().setOpenMobile(false);
      }
  };

  const showText = sidebarState === 'expanded' || isMobile;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-2 border-b border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-primary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleNewChat}
          aria-label="New Chat"
        >
          <PlusCircle className="h-5 w-5 shrink-0" />
          {showText && <span className="truncate">New Chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <SidebarMenu className="p-2">
            {isLoadingChats && (
              <>
                {[...Array(3)].map((_, i) => (
                  <SidebarMenuItem key={`skeleton-${i}`}>
                    <SidebarMenuButton 
                      disabled 
                      className="w-full justify-start gap-2 truncate"
                      variant="ghost"
                      size="default"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                      {showText && <span className="truncate text-sm opacity-50">Loading chat...</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            )}
            {!isLoadingChats && chatSessions.length === 0 && showText && (
              <div className="p-4 text-center text-sm text-sidebar-foreground/70">
                No chats yet. Start a new one!
              </div>
            )}
            {!isLoadingChats && chatSessions.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  onClick={() => handleChatSelect(chat.id)}
                  tooltip={{content: chat.title, side: "right", align: "center"}}
                  className={cn(
                    "w-full justify-start gap-2 truncate",
                    chat.id === currentChatId && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                  variant="ghost"
                  size="default"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {showText && <span className="truncate text-sm">{chat.title}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
        {user && (
          <SidebarMenu>
             <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => console.log("Settings clicked")} 
                tooltip={{content: "Settings", side: "right", align: "center"}}
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {showText && <span className="truncate">Settings</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={signOut} 
                tooltip={{content: "Log Out", side: "right", align: "center"}}
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {showText && <span className="truncate">Log Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </div>
  );
}
