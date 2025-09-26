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
              const otherParticipant = conversation.participantOne || conversation.participantTwo;
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
                      <AvatarImage 
                        src={getProfileImageUrl(
                          selectedConversation.participantOne?.profileImageUrl || 
                          selectedConversation.participantTwo?.profileImageUrl
                        )} 
                        alt="Profile"
                      />
                      <AvatarFallback>
                        <UserIcon className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium" data-testid="text-chat-participant-name">
                        {selectedConversation.participantOne?.displayName || 
                         selectedConversation.participantTwo?.displayName || 
                         "Unknown User"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        @{selectedConversation.participantOne?.username || 
                           selectedConversation.participantTwo?.username || 
                           "unknown"}
                      </p>
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
                      isOwn={message.senderId === "current-user-id"} // TODO: Replace with actual current user ID
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