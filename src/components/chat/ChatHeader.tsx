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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 chat-header border-b shadow-sm gap-2 sm:gap-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-base sm:text-lg">Laxman Auto Parts</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs sm:text-sm text-gray-200">Online</span>
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
        className="flex items-center gap-2 text-gray-200 border-gray-600 bg-grey-800 hover:bg-gray-700 hover:border-gray-500 text-xs sm:text-sm"
      >
        <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
        Reset Chat
      </Button>
    </div>
  );
}
