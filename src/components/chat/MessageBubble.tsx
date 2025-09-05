"use client";

import { Message } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-[rgba(36,83,72,1)] text-white"
              : "bg-[rgba(61,60,63,1)] text-white"
          )}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <Card
        className={cn(
          "px-4 py-2 max-w-[70%] shadow-sm relative gap-2",
          isUser
            ? "bg-[rgba(36,83,72,1)] text-white border-transparent"
            : "bg-[rgba(61,60,63,1)] text-white border-transparent"
        )}
      >
        <div className="text-sm whitespace-pre-wrap break-words text-white mb-0">
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const text = part.slice(2, -2);
              return <strong key={index}>{text}</strong>;
            }
            return part;
          })}
        </div>
        {message.imageUrl && (
          <div className="mt-2">
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="max-w-full h-auto rounded-md"
            />
          </div>
        )}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {message.imageUrls.map((url, i) => (
              <a
                key={url + i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <div className="w-64 h-40 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
                  <img
                    src={url}
                    loading="lazy"
                    alt={`image-${i}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </a>
            ))}
          </div>
        )}
        <div
          className={cn(
            "message-timestamp mt-0 text-xs leading-none",
            isUser ? "text-[rgba(36,83,72,0.85)]" : "text-gray-300"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </Card>
    </div>
  );
}
