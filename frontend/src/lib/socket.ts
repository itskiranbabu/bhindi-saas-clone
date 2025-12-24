import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SocketClient {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().token;

    if (!token) {
      console.error('No auth token available');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Chat events
  sendMessage(conversationId: string, content: string, messageId: string) {
    this.socket?.emit('chat:message', {
      conversationId,
      content,
      messageId,
    });
  }

  onMessageAck(callback: (data: any) => void) {
    this.socket?.on('chat:message:ack', callback);
  }

  onMessageResponse(callback: (data: any) => void) {
    this.socket?.on('chat:message:response', callback);
  }

  onError(callback: (data: any) => void) {
    this.socket?.on('chat:error', callback);
  }

  // Typing indicators
  sendTyping(conversationId: string) {
    this.socket?.emit('chat:typing', { conversationId });
  }

  sendStopTyping(conversationId: string) {
    this.socket?.emit('chat:stop-typing', { conversationId });
  }

  onTyping(callback: (data: any) => void) {
    this.socket?.on('chat:typing', callback);
  }

  onStopTyping(callback: (data: any) => void) {
    this.socket?.on('chat:stop-typing', callback);
  }

  // Conversation events
  joinConversation(conversationId: string) {
    this.socket?.emit('conversation:join', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation:leave', { conversationId });
  }
}

export const socketClient = new SocketClient();
