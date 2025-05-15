
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendHorizonal, Square, Sparkles } from 'lucide-react'; // Added Square for stop
import { autoComplete as autoCompleteFlow } from '@/ai/flows/auto-completion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

interface ChatInputProps {
  onSendMessage: (text: string, imageFile?: File) => void;
  isAiResponding: boolean;
  onStopGenerating: () => void;
}

export function ChatInput({ onSendMessage, isAiResponding, onStopGenerating }: ChatInputProps) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isTypingForSuggestion, setIsTypingForSuggestion] = useState(false); // Renamed from isTyping
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  const fetchSuggestions = useCallback(async (currentText: string) => {
    if (!currentText.trim() || currentText.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestion(true);
    try {
      const result = await autoCompleteFlow({ text: currentText });
      if (result && result.suggestion) {
        setSuggestions([result.suggestion]);
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
    if (isTypingForSuggestion && text.trim() && !isAiResponding) { // Only fetch suggestions if not waiting for AI response
      typingTimer = setTimeout(() => {
        fetchSuggestions(text);
      }, 500); 
    }
    return () => clearTimeout(typingTimer);
  }, [text, isTypingForSuggestion, fetchSuggestions, isAiResponding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setIsTypingForSuggestion(true);
    if (!e.target.value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsTypingForSuggestion(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const lastWordIndex = text.lastIndexOf(' ') + 1;
    setText(text.substring(0, lastWordIndex) + suggestion + ' ');
    setSuggestions([]);
    setShowSuggestions(false);
    document.getElementById('chat-input-textarea')?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAiResponding) return; // Don't submit if AI is already responding
    if (text.trim() || imageFile) {
      onSendMessage(text, imageFile);
      setText('');
      setImageFile(undefined);
      setSuggestions([]);
      setShowSuggestions(false);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isAiResponding) {
      e.preventDefault();
      handleSubmit(e as any); 
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
          placeholder={isAiResponding ? "ProAssistant yanıtlıyor..." : "Mesajınızı yazın veya ProAssistant'a sorun..."}
          className="pr-10 min-h-[40px] max-h-[200px] resize-none"
          rows={1}
          onBlur={() => setTimeout(() => { setIsTypingForSuggestion(false); }, 200)}
          onFocus={() => text && text.length > 2 && !isAiResponding && fetchSuggestions(text) }
          disabled={isAiResponding}
        />
        {showSuggestions && suggestions.length > 0 && !isAiResponding && (
          <div className="absolute bottom-full left-0 mb-1 w-full bg-card border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
            {isLoadingSuggestion && <div className="p-2 text-sm text-muted-foreground flex items-center"><Spinner size="small" className="mr-2"/>Yükleniyor...</div>}
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

      <input type="file" id="file-input" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isAiResponding} />
      <Button type="button" variant="ghost" size="icon" onClick={() => document.getElementById('file-input')?.click()} aria-label="Dosya ekle" className="shrink-0" disabled={isAiResponding}>
        <Paperclip className="h-5 w-5" />
      </Button>
      
      {isAiResponding ? (
        <Button type="button" variant="destructive" size="icon" onClick={onStopGenerating} aria-label="Durdur" className="shrink-0">
          <Square className="h-5 w-5" />
        </Button>
      ) : (
        <Button type="submit" size="icon" aria-label="Mesaj gönder" className="shrink-0 bg-accent hover:bg-accent/90" disabled={!text.trim() && !imageFile}>
          <SendHorizonal className="h-5 w-5" />
        </Button>
      )}
    </form>
  );
}
