
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, Search, MessageCircle, Users, X, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ChatBubble from "@/components/chat-bubble";

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
}

interface Conversation {
  id: string;
  participantOneId: string;
  participantTwoId: string;
  lastMessageId?: string;
  lastMessageAt: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  otherParticipant: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
  unreadCount?: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected, lastMessage, sendMessage: sendWebSocketMessage } = useWebSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for conversation ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId && conversations.length > 0) {
      const targetConversation = conversations.find(c => c.id === conversationId);
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        // Clean up URL parameter
        window.history.replaceState({}, '', '/messages');
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_message' && selectedConversation?.id === lastMessage.data.conversationId) {
        // Only add message if it's not already in the list (avoid duplicates)
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === lastMessage.data.id);
          if (messageExists) return prev;
          return [...prev, lastMessage.data];
        });
      } else if (lastMessage.type === 'message_reaction' && selectedConversation?.id === lastMessage.data.conversationId) {
        // Handle emoji reactions
        console.log('Message reaction received:', lastMessage.data);
      }
    }
  }, [lastMessage, selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure participants have proper user data
        const conversationsWithUsers = data.map((conv: Conversation) => ({
          ...conv,
          participants: conv.participants || []
        }));
        setConversations(conversationsWithUsers);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure messages have sender data
        const messagesWithSenders = data.map((msg: Message) => ({
          ...msg,
          sender: msg.sender || {
            id: msg.senderId,
            username: 'unknown',
            displayName: 'Unknown User',
            profileImageUrl: null
          }
        }));
        setMessages(messagesWithSenders);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  // Handle emoji reactions
  const handleEmojiReact = async (messageId: string, emoji: string) => {
    if (!selectedConversation) return;
    
    try {
      // Send via WebSocket for real-time updates
      if (isConnected) {
        sendWebSocketMessage({
          type: 'message_reaction',
          data: {
            messageId,
            emoji,
            conversationId: selectedConversation.id
          }
        });
      }

      // Also persist to backend
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji })
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Handle message replies
  const handleReply = (messageId: string) => {
    console.log('Reply to message:', messageId);
    // TODO: Implement reply functionality
  };


  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Always persist via REST API first
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: messageContent
        }),
      });

      if (response.ok) {
        const newMessageData = await response.json();
        
        // Add message to local state immediately
        setMessages(prev => [...prev, newMessageData]);
        
        // Send via WebSocket for real-time delivery to other user
        if (isConnected) {
          sendWebSocketMessage({
            type: 'send_message',
            data: {
              conversationId: selectedConversation.id,
              content: messageContent,
              messageId: newMessageData.id
            }
          });
        }
        
        // Refresh conversations to update last message
        fetchConversations();
        
        // Auto-scroll to bottom after sending message
        setTimeout(scrollToBottom, 100);
      } else {
        // Restore message if sending failed
        setNewMessage(messageContent);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageContent); // Restore message on error
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to unsend this message?')) {
      return;
    }

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh messages to show the deletion
        if (selectedConversation) {
          fetchMessages(selectedConversation.id);
        }
        toast({
          title: "Message unsent",
          description: "Your message has been deleted",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to unsend message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to unsend message:', error);
      toast({
        title: "Error",
        description: "Failed to unsend message",
        variant: "destructive",
      });
    }
  };

  const getConversationName = (conversation: Conversation) => {
    return conversation.otherParticipant?.displayName || conversation.otherParticipant?.username || "Unknown User";
  };

  const getConversationImage = (conversation: Conversation) => {
    return getProfileImageUrl(conversation.otherParticipant?.profileImageUrl);
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.otherParticipant;
  };

  const filteredConversations = conversations.filter(conversation =>
    getConversationName(conversation).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please sign in to view messages</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="flex h-[calc(100vh-4rem)] max-w-6xl mx-auto">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-border">
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="w-5 h-5" />
                <h1 className="text-xl font-bold">Messages</h1>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100%-8rem)]">
              {loading ? (
                <div className="p-4">
                  <p className="text-muted-foreground">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4">
                  <p className="text-muted-foreground">No conversations found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getConversationImage(conversation) || undefined} />
                          <AvatarFallback>
                            {getConversationName(conversation)[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">
                              {getConversationName(conversation)}
                            </h3>
                            {conversation.lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="mt-1">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={getConversationImage(selectedConversation) || undefined} />
                      <AvatarFallback>
                        {getConversationName(selectedConversation)[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{getConversationName(selectedConversation)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const otherUser = getOtherParticipant(selectedConversation);
                          return otherUser ? `@${otherUser.username}` : "Direct message";
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-1">
                    {messages
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((message, index, array) => {
                        const isOwn = message.senderId === user?.id;
                        const nextMessage = array[index + 1];
                        const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
                        
                        // Create message object compatible with ChatBubble
                        const chatMessage = {
                          ...message,
                          sender: message.sender || {
                            id: message.senderId,
                            username: 'unknown',
                            displayName: 'Unknown User',
                            profileImageUrl: undefined
                          }
                        };
                        
                        return (
                          <ChatBubble
                            key={message.id}
                            message={chatMessage}
                            isOwn={isOwn}
                            isLastInGroup={isLastInGroup}
                            onReact={handleEmojiReact}
                            onReply={handleReply}
                          />
                        );
                      })}
                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border bg-background">
                  <div className="flex space-x-3 items-end">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={getProfileImageUrl(user.profileImageUrl)} />
                      <AvatarFallback className="text-xs">
                        {user.displayName?.[0] || user.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex space-x-2">
                      <Input
                        placeholder="Message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 rounded-full border-gray-300 focus:border-blue-500"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim()}
                        className="rounded-full w-10 h-10 p-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
