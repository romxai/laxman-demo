"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@/types";
import { useEffect, useRef } from "react";

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="relative flex-1 overflow-hidden chat-conversation">
      {/* Lazy background image - placed behind messages */}
      <img
        src="/convo_bg.jpg"
        alt="conversation background"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        onError={(e) => {
          // hide image if not present or failed to load
          (e.target as HTMLImageElement).style.display = "none";
          console.warn("Background image failed to load or is missing.");
        }}
      />

      <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex-1 min-h-[40vh] flex items-center justify-center text-white">
              <div className="text-center opacity-90">
                <div className="text-2xl font-semibold mb-2">
                  Welcome to Laxman Auto Parts & Accessories
                </div>
                <div className="text-sm">
                  Ask me about car parts, accessories, prices, and availability!
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
