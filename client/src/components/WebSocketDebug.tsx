import React from "@/lib/ensure-react";
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function WebSocketDebug() {
  const { status, messages } = useWebSocket();
  const lastMessage = messages[messages.length - 1];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          WebSocket Debug
          <Badge className={getStatusColor(status)}>
            {status}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Connection status and last message
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs">
          <div className="font-medium">Status: {status}</div>
          <div className="mt-1">Last: {lastMessage}</div>
        </div>
      </CardContent>
    </Card>
  );
}