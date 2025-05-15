
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Use Textarea for multi-line input
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendHorizonal, Sparkles } from 'lucide-react';
import { autoComplete as autoCompleteFlow } from '@/ai/flows/auto-completion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

interface ChatInputProps {
  onSendMessage: (text: string, imageFile?: File) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  const fetchSuggestions = useCallback(async (currentText: string) => {
    if (!currentText.trim() || currentText.length < 3) { // Min length for suggestions
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestion(true);
    try {
      const result = await autoCompleteFlow({ text: currentText });
      if (result && result.suggestion) {
        setSuggestions([result.suggestion]); // Genkit flow provides one suggestion
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error fetching auto-completion:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestion(false);
    }
  }, []);

  useEffect(() => {
    let typingTimer: NodeJS.Timeout;
    if (isTyping && text.trim()) {
      typingTimer = setTimeout(() => {
        fetchSuggestions(text);
      }, 500); // Debounce API call
    }
    return () => clearTimeout(typingTimer);
  }, [text, isTyping, fetchSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setIsTyping(true);
    if (!e.target.value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const lastWordIndex = text.lastIndexOf(' ') + 1;
    setText(text.substring(0, lastWordIndex) + suggestion + ' ');
    setSuggestions([]);
    setShowSuggestions(false);
    // Focus the textarea
    document.getElementById('chat-input-textarea')?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || imageFile) {
      onSendMessage(text, imageFile);
      setText('');
      setImageFile(undefined);
      setSuggestions([]);
      setShowSuggestions(false);
      // Clear file input if it exists
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      // Optionally, show a preview or file name
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); // Cast to any to satisfy form event type
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="relative flex-1">
         <Textarea
          id="chat-input-textarea"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or ask ProAssistant..."
          className="pr-10 min-h-[40px] max-h-[200px] resize-none"
          rows={1}
          onBlur={() => setTimeout(() => { setIsTyping(false); /*setShowSuggestions(false);*/ }, 200)} // Delay hide to allow click
          onFocus={() => text && text.length > 2 && fetchSuggestions(text) }
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-full bg-card border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
            {isLoadingSuggestion && <div className="p-2 text-sm text-muted-foreground flex items-center"><Spinner size="small" className="mr-2"/>Loading...</div>}
            {!isLoadingSuggestion && suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File input is hidden and triggered by the button */}
      <input type="file" id="file-input" accept="image/*" onChange={handleFileChange} className="hidden" />
      <Button type="button" variant="ghost" size="icon" onClick={() => document.getElementById('file-input')?.click()} aria-label="Attach file" className="shrink-0">
        <Paperclip className="h-5 w-5" />
      </Button>
      <Button type="submit" size="icon" aria-label="Send message" className="shrink-0 bg-accent hover:bg-accent/90">
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </form>
  );
}
