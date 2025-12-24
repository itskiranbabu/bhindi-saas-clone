import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socket';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('New Conversation');

  useEffect(() => {
    if (conversationId) {
      loadConversation();
      socketClient.connect();
      socketClient.joinConversation(conversationId);

      socketClient.onMessageResponse((data) => {
        setMessages((prev) => [...prev, data.message]);
        setLoading(false);
      });

      return () => {
        socketClient.leaveConversation(conversationId);
      };
    }
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const conversation = await apiClient.getConversation(conversationId!);
      setConversationTitle(conversation.title || 'New Conversation');
      setMessages(conversation.messages || []);
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (conversationId) {
        socketClient.sendMessage(conversationId, input, userMessage.id);
      } else {
        await apiClient.sendMessage(conversationId!, input);
      }
    } catch (error) {
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">{conversationTitle}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <p className="text-gray-500">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
