"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@/types";
import { useEffect, useRef } from "react";
import carPartsData from "@/data/car-parts.json";

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
              <div className="w-full max-w-4xl p-4">
                <div className="text-2xl font-semibold mb-4 text-center">
                  Welcome to Laxman Auto Parts & Accessories
                </div>
                <div className="text-center text-sm mb-6">
                  Ask me about car parts, accessories, prices, and availability
                  — below is what this demo currently covers.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[rgba(23,23,23,0.6)] rounded-lg border border-gray-700">
                    <h3 className="font-semibold mb-2">Types of parts</h3>
                    <p className="text-sm mb-2">
                      This demo includes the following categories:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {Object.values((carPartsData as any).categories).map(
                        (c: any) => (
                          <li key={c.name} className="truncate">
                            {c.name}
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="p-4 bg-[rgba(23,23,23,0.6)] rounded-lg border border-gray-700">
                    <h3 className="font-semibold mb-2">Supported car makes</h3>
                    <p className="text-sm mb-2">
                      Common vehicle makes covered in the demo:
                    </p>
                    <div className="text-sm">
                      {(() => {
                        const compat = new Set<string>();
                        Object.values((carPartsData as any).categories).forEach(
                          (cat: any) => {
                            (cat.items || []).forEach((it: any) => {
                              (it.compatibility || []).forEach((v: string) =>
                                compat.add(v)
                              );
                            });
                          }
                        );
                        const items = Array.from(compat).slice(0, 8);
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {items.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-4 bg-[rgba(23,23,23,0.6)] rounded-lg border border-gray-700">
                    <h3 className="font-semibold mb-2">Services</h3>
                    <p className="text-sm mb-2">
                      Available services included in this demo:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {((carPartsData as any).services || []).map((s: any) => (
                        <li key={s.name}>
                          {s.name} —{" "}
                          <span className="text-xs text-gray-300">
                            {s.price || s.availability}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-300 bg-[rgba(255,255,255,0.02)] p-3 rounded">
                  Limitations: The assistant only returns information present in
                  the provided database (parts, brands, price ranges,
                  compatibilities, availability, and listed services). For
                  queries about parts or vehicles not in the dataset, the bot
                  will recommend contacting a human representative.
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
