"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-4 chat-input-section items-center border-t"
    >
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message about car parts..."
        disabled={isLoading}
        className="flex-1 chat-input text-white placeholder-gray-400"
      />
      <Button
        type="submit"
        disabled={!message.trim() || isLoading}
        size="sm"
        className="px-3 bg-transparent border-0 hover:bg-transparent active:bg-transparent"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[rgba(36,83,72,1)]" />
        ) : (
          <span className="text-[rgba(36,83,72,1)]">
            <Send className="w-5 h-5" />
          </span>
        )}
      </Button>
    </form>
  );
}
