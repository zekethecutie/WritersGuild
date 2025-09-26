import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Search, 
  Send, 
  MoreVertical,
  Phone,
  Video,
  Plus,
  User as UserIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ChatBubble from "@/components/chat-bubble";
import type { Conversation, Message, User } from "@shared/schema";

interface ConversationWithParticipants extends Conversation {
  participantOne?: User;
  participantTwo?: User;
  lastMessage?: Message;
  unreadCount?: number;
}

interface MessageWithSender extends Message {
  sender: User;
}

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<ConversationWithParticipants[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000, // Poll for new messages
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    refetchInterval: 2000, // Poll for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      // Refresh messages
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", selectedConversationId, "messages"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations"] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversationId || !newMessage.trim()) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: newMessage.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConversation = conversations.find(
    (conv: ConversationWithParticipants) => conv.id === selectedConversationId
  );

  const filteredConversations = conversations.filter((conv: ConversationWithParticipants) => {
    if (!searchTerm) return true;
    const otherParticipant = conv.participantOne?.displayName || conv.participantTwo?.displayName || "";
    return otherParticipant.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold" data-testid="text-messages-title">Messages</h1>
            <Button size="sm" variant="outline" data-testid="button-new-message">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a conversation by visiting someone's profile
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation: ConversationWithParticipants) => {
              // Determine the other participant by excluding current user
              const otherParticipant = conversation.participantOne?.id === user?.id 
                ? conversation.participantTwo 
                : conversation.participantOne;
              const isSelected = conversation.id === selectedConversationId;

              return (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer border-b border-border hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  data-testid={`conversation-item-${conversation.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={getProfileImageUrl(otherParticipant?.profileImageUrl)} 
                        alt={otherParticipant?.displayName}
                      />
                      <AvatarFallback>
                        <UserIcon className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">
                          {otherParticipant?.displayName || "Unknown User"}
                        </h4>
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(conversation.lastMessage.createdAt ? new Date(conversation.lastMessage.createdAt) : new Date(), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.content}
                        </p>
                      )}

                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <Badge variant="default" className="mt-1 text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            {selectedConversation && (
              <div className="p-4 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      {(() => {
                        const otherParticipant = selectedConversation.participantOne?.id === user?.id 
                          ? selectedConversation.participantTwo 
                          : selectedConversation.participantOne;
                        return (
                          <>
                            <AvatarImage 
                              src={getProfileImageUrl(otherParticipant?.profileImageUrl)} 
                              alt={otherParticipant?.displayName || "Profile"}
                            />
                            <AvatarFallback>
                              <UserIcon className="w-5 h-5" />
                            </AvatarFallback>
                          </>
                        );
                      })()}
                    </Avatar>
                    <div>
                      {(() => {
                        const otherParticipant = selectedConversation.participantOne?.id === user?.id 
                          ? selectedConversation.participantTwo 
                          : selectedConversation.participantOne;
                        return (
                          <>
                            <h3 className="font-medium" data-testid="text-chat-participant-name">
                              {otherParticipant?.displayName || "Unknown User"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              @{otherParticipant?.username || "unknown"}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="messages-container">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                      <Skeleton className="h-10 w-48 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">Start the conversation</h3>
                    <p className="text-sm text-muted-foreground">
                      Send a message to get the conversation started
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message: MessageWithSender, index: number) => {
                  const chatMessage = {
                    ...message,
                    createdAt: message.createdAt ? (typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString()) : new Date().toISOString()
                  };

                  return (
                    <ChatBubble
                      key={message.id}
                      message={chatMessage}
                      isOwn={message.senderId === user?.id}
                      isLastInGroup={
                        index === messages.length - 1 ||
                        messages[index + 1]?.senderId !== message.senderId
                      }
                    />
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-new-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Search } from "lucide-react";

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access messages",
        variant: "destructive",
      });
      return;
    }

    // Fetch conversations
    fetchConversations();
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
              <p className="text-muted-foreground">
                Please log in to access your messages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="flex h-screen">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground">
                    Start a conversation with other writers
                  </p>
                </div>
              ) : (
                conversations.map((conversation: any) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-secondary/50 ${
                      selectedConversation?.id === conversation.id ? "bg-secondary" : ""
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      fetchMessages(conversation.id);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={conversation.otherParticipant?.profileImageUrl} />
                        <AvatarFallback>
                          {conversation.otherParticipant?.displayName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conversation.otherParticipant?.displayName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={selectedConversation.otherParticipant?.profileImageUrl} />
                      <AvatarFallback>
                        {selectedConversation.otherParticipant?.displayName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedConversation.otherParticipant?.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{selectedConversation.otherParticipant?.username}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} size="sm">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a conversation to start messaging
                  </p>
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