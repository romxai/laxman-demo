'use client';

import { Message } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={cn(
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-500 text-white'
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <Card className={cn(
        'px-4 py-3 max-w-[80%] shadow-sm',
        isUser 
          ? 'bg-blue-500 text-white border-blue-500' 
          : 'bg-white border-gray-200'
      )}>
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
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
        <div className={cn(
          'text-xs mt-2 opacity-70',
          isUser ? 'text-blue-100' : 'text-gray-500'
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </Card>
    </div>
  );
}
