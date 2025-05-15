
import Link from 'next/link';
import { Bot } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/chat" className="flex items-center gap-2 text-xl font-semibold text-primary hover:text-primary/90 transition-colors">
      <Bot className="h-7 w-7" />
      <span>ProAssistant</span>
    </Link>
  );
}

//git
