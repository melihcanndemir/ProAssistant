"use client";
import React from 'react';
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

// Dummy chat data for now
const dummyChats = [
  { id: '1', title: 'Next.js Project Ideas' },
  { id: '2', title: 'Tailwind CSS Best Practices' },
  { id: '3', title: 'Genkit Flow Debugging' },
  { id: '4', title: 'Recipe for Chocolate Cake' },
  { id: '5', title: 'Travel Plans for Summer Vacation Holiday' },
  { id: '6', title: 'Learning Spanish Basics' },
  { id: '7', title: 'Fitness Routine for Beginners' },
];

export function ChatHistorySidebar() {
  const { state: sidebarState, isMobile } = useSidebar(); // 'expanded' or 'collapsed'
  const { user, signOut } = useAuth();

  const handleNewChat = () => {
    console.log("New chat started");
    // TODO: Implement logic to start a new chat session
    // This might involve redirecting to /chat/new or clearing current chat state
  };

  const handleChatSelect = (chatId: string) => {
    console.log("Selected chat:", chatId);
    // TODO: Implement logic to switch to the selected chat
    // This might involve redirecting to /chat/[chatId]
  };

  const showText = sidebarState === 'expanded' || isMobile; // Text is always shown on mobile sheet

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-2 border-b border-sidebar-border">
        <Button
          variant="ghost" // Use ghost for a less prominent look, or outline
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
            {/* Example of loading state
            {isLoadingChats && (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            )}
            */}
            {dummyChats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  onClick={() => handleChatSelect(chat.id)}
                  tooltip={{content: chat.title, side: "right", align: "center"}}
                  className="w-full justify-start gap-2 truncate"
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
