"use client";

import { useState, useCallback } from "react";
import { Message } from "@/types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
        type: "text",
      };

      const currentMessages = [...messages, userMessage];
      setMessages(currentMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Send the updated history
          body: JSON.stringify({
            message: content,
            history: messages, // Send the history *before* the new user message
          }),
        });

        if (!response.ok) {
          // Handle specific 429 error for rate limiting
          if (response.status === 429) {
            const errorData = await response.json();
            throw new Error(
              errorData.message ||
                "Too many requests. Please try again shortly."
            );
          }
          throw new Error("Failed to get response from the server.");
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          type: "text",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error sending message:", error);
        const errorMessageContent =
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.";
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessageContent,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    resetConversation,
  };
}
