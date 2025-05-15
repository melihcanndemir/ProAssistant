
"use client";
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Spinner } from '@/components/ui/spinner';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true} >
      <div className="flex flex-col h-screen bg-background">
        <Navbar />
        <div className="flex flex-row flex-1 w-full">
          <Sidebar collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground hidden md:flex">
            <ChatHistorySidebar />
          </Sidebar>
          {/* Added w-0 to work with flex-1 for robust width calculation */}
          <SidebarInset className="flex-1 min-w-0 w-0 overflow-auto">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
