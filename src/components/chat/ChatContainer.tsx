'use client';

import { Card } from '@/components/ui/card';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';

export function ChatContainer() {
  const { messages, isLoading, sendMessage, resetConversation } = useChat();

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      <ChatHeader 
        onReset={resetConversation}
        messageCount={messages.length}
      />
      
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col m-4 shadow-lg border-0 overflow-hidden">
          <ChatMessages messages={messages} />
          <ChatInput 
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </Card>
      </div>
    </div>
  );
}
