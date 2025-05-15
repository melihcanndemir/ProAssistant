
"use client";

import React, { useEffect } from 'react'; // Added React import
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';

export default function ChatRedirectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }

    const findOrCreateChat = async () => {
      setIsLoading(true);
      const chatsCollectionRef = collection(db, `users/${user.uid}/chats`);
      // Query for chats ordered by lastMessageTimestamp descending, or createdAt if lastMessageTimestamp doesn't exist yet for a new chat
      const q = query(chatsCollectionRef, orderBy('lastMessageTimestamp', 'desc'), limit(1));
      
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestChat = querySnapshot.docs[0];
          router.replace(`/chat/${latestChat.id}`);
        } else {
          // No chats found, create a new one
          const newChatRef = await addDoc(chatsCollectionRef, {
            title: "New Chat",
            userId: user.uid,
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
          });
          router.replace(`/chat/${newChatRef.id}`);
        }
      } catch (error) {
        console.error("Error finding or creating chat:", error);
        // Handle error appropriately, maybe redirect to an error page or show a toast
        // For now, just stop loading and let the user potentially be stuck on a blank page or current page
        setIsLoading(false); 
        // A better UX would be to redirect to an error page or show a global toast.
        // router.replace('/error-page'); // Example
      }
      // setLoading(false) should ideally be here if navigation always succeeds or in a finally block
      // but given the router.replace, it might unmount before this.
      // The spinner will stop once navigation completes or if an error sets isLoading to false.
    };

    findOrCreateChat();

  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="large" />
      </div>
    );
  }

  return null; // Or some fallback UI if redirection takes time and spinner isn't preferred
}

//git
