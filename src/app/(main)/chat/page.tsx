
"use client";

import { useEffect } from 'react';
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
        setIsLoading(false);
      }
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
