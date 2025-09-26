
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  name?: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  participants: Array<{
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
  }>;
  unreadCount?: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newMessage.trim()
        }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchMessages(selectedConversation.id);
        fetchConversations();
      } else {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
    if (conversation.name) return conversation.name;
    if (conversation.isGroup) return "Group Chat";

    const otherParticipant = conversation.participants?.find(p => p.id !== user?.id);
    return otherParticipant?.displayName || otherParticipant?.username || "Unknown User";
  };

  const getConversationImage = (conversation: Conversation) => {
    if (conversation.isGroup) return null;

    const otherParticipant = conversation.participants?.find(p => p.id !== user?.id);
    return getProfileImageUrl(otherParticipant?.profileImageUrl);
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants?.find(p => p.id !== user?.id);
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
                            {conversation.isGroup ? <Users className="w-4 h-4" /> : getConversationName(conversation)[0]}
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
                        {selectedConversation.isGroup ? <Users className="w-4 h-4" /> : getConversationName(selectedConversation)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{getConversationName(selectedConversation)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.isGroup
                          ? `${selectedConversation.participants.length} members`
                          : (() => {
                              const otherUser = getOtherParticipant(selectedConversation);
                              return otherUser ? `@${otherUser.username}` : "Direct message";
                            })()
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-gray-50/50 dark:bg-gray-900/20">
                  <div className="space-y-1">
                    {messages
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((message, index, array) => {
                        const isOwn = message.senderId === user.id;
                        const prevMessage = array[index - 1];
                        const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex items-end space-x-2 ${isOwn ? 'justify-end' : 'justify-start'} group`}
                          >
                            {!isOwn && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={getProfileImageUrl(message.sender?.profileImageUrl)} />
                                <AvatarFallback className="text-xs">
                                  {message.sender?.displayName?.[0] || message.sender?.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className={`max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
                              {!isOwn && isFirstInGroup && (
                                <div className="mb-1 px-3">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {message.sender?.displayName || message.sender?.username || 'Unknown User'}
                                  </span>
                                </div>
                              )}
                              
                              <div className="relative">
                                <div
                                  className={`px-4 py-2 rounded-2xl max-w-full break-words relative ${
                                    isOwn
                                      ? 'bg-blue-500 text-white rounded-br-md'
                                      : 'bg-gray-200 dark:bg-gray-700 text-foreground rounded-bl-md'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">{message.content}</p>
                                </div>
                                
                                {/* Message options */}
                                {isOwn && (
                                  <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-6 h-6 p-0 rounded-full bg-background shadow-md hover:bg-muted"
                                        >
                                          <MoreHorizontal className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem
                                          onClick={() => handleUnsendMessage(message.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Unsend message
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>
                              
                              <div className={`mt-1 px-3 ${isOwn ? 'text-right' : 'text-left'}`}>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            
                            {isOwn && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={getProfileImageUrl(user.profileImageUrl)} />
                                <AvatarFallback className="text-xs">
                                  {user.displayName?.[0] || user.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
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
