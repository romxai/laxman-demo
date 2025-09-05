"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Settings } from "lucide-react";

interface ChatHeaderProps {
  onReset: () => void;
  messageCount: number;
}

export function ChatHeader({ onReset, messageCount }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 chat-header border-b shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-lg">Laxman Auto Parts</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-200">Online</span>
            {messageCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messageCount} messages
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="flex items-center gap-2 text-gray-200 border-gray-600 bg-grey-800 hover:bg-gray-700 hover:border-gray-500"
      >
        <RotateCcw className="w-4 h-4" />
        Reset Chat
      </Button>
    </div>
  );
}
