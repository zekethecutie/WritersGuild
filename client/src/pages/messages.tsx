import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getProfileImageUrl } from "@/lib/defaultImages";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Search,
  Send,
  MoreHorizontal,
  Phone,
  Video,
  User as UserIcon,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Conversation, Message, User } from "@shared/schema";
import ChatBubble from "@/components/chat-bubble";

interface ConversationWithDetails extends Conversation {
  otherParticipant: User;
  lastMessage?: Message;
}

interface MessageWithSender extends Message {
  sender: User;
}

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);

  // Check for user parameter in URL to start new conversation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user');

    if (targetUserId && isAuthenticated) {
      // Create conversation with target user
      createConversationMutation.mutate(targetUserId);
      // Clear URL parameter
      window.history.replaceState({}, '', '/messages');
    }
  }, [isAuthenticated]);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => apiRequest("GET", "/api/conversations") as unknown as Promise<ConversationWithDetails[]>,
    enabled: isAuthenticated,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    queryFn: async () => {
      try {
        const result = await apiRequest("GET", `/api/conversations/${selectedConversation!.id}/messages`);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        return [];
      }
    },
    enabled: !!selectedConversation?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return apiRequest("POST", `/api/conversations/${selectedConversation!.id}/messages`, data);
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ participantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create conversation");
      }

      return response.json();
    },
    onSuccess: (conversation: ConversationWithDetails) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(conversation);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  // Mark conversation as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiRequest("PUT", `/api/conversations/${conversationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Select conversation and mark as read
  const selectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    markAsReadMutation.mutate(conversation.id);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({ content: messageInput.trim() });
  };

  // Search users when typing in search box
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return [];
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    onSuccess: (data) => {
      setSearchUsers(data);
    }
  });

  // Handle search input change
  useEffect(() => {
    if (searchQuery.trim()) {
      setShowUserSearch(true);
      searchUsersMutation.mutate(searchQuery);
    } else {
      setShowUserSearch(false);
      setSearchUsers([]);
    }
  }, [searchQuery]);

  // Filter conversations based on search
  const filteredConversations = (Array.isArray(conversations) ? conversations : []).filter((conv: any) =>
    conv.otherParticipant?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherParticipant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sign in to access messages</h2>
            <p className="text-muted-foreground">You need to be logged in to view your conversations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="h-screen flex">
          {/* Conversations List */}
          <div className="w-full lg:w-1/3 border-r border-border bg-card">
            <div className="p-4 border-b border-border">
              <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Messages
              </h1>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-140px)]">
              {showUserSearch ? (
                <div className="p-4 space-y-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Search Users</div>
                  {searchUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        createConversationMutation.mutate(user.id);
                        setSearchQuery("");
                        setShowUserSearch(false);
                      }}
                      className="w-full p-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors text-left rounded-lg"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={getProfileImageUrl(user.profileImageUrl)}
                          alt={user.displayName}
                        />
                        <AvatarFallback>
                          <UserIcon className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                        {user.followersCount !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {user.followersCount} followers
                          </p>
                        )}
                      </div>
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                  {searchUsers.length === 0 && searchQuery && (
                    <div className="p-4 text-center text-muted-foreground">
                      <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No users found</p>
                    </div>
                  )}
                </div>
              ) : conversationsLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 && !searchQuery ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Search for users above to start a conversation</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredConversations.map((conversation: ConversationWithDetails) => (
                    <button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`w-full p-4 flex items-center space-x-3 hover:bg-muted/50 transition-colors text-left ${
                        selectedConversation?.id === conversation.id ? "bg-muted" : ""
                      }`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={getProfileImageUrl(conversation.otherParticipant?.profileImageUrl)}
                          alt={conversation.otherParticipant?.displayName}
                        />
                        <AvatarFallback>
                          <UserIcon className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">
                            {conversation.otherParticipant?.displayName}
                          </p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.lastMessage.createdAt || new Date()), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground truncate">
                          @{conversation.otherParticipant?.username}
                        </p>

                        {conversation.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
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
                <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={getProfileImageUrl(selectedConversation.otherParticipant?.profileImageUrl)}
                        alt={selectedConversation.otherParticipant?.displayName}
                      />
                      <AvatarFallback>
                        <UserIcon className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">
                        {selectedConversation.otherParticipant?.displayName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        @{selectedConversation.otherParticipant?.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-xs p-3 rounded-lg animate-pulse ${
                            i % 2 === 0 ? "bg-muted" : "bg-primary/20"
                          }`}>
                            <div className="h-4 bg-muted-foreground/20 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (messages as MessageWithSender[]).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {Array.isArray(messages) && messages.length > 0 ? 
                        [...messages].reverse().map((message: MessageWithSender, index: number, array: MessageWithSender[]) => {
                          const isOwn = message.senderId === user?.id;
                          const nextMessage = array[index + 1];
                          const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;

                          return (
                            <ChatBubble
                              key={message.id}
                              message={message}
                              isOwn={isOwn}
                              isLastInGroup={isLastInGroup}
                              onReact={(messageId, emoji) => console.log('React to:', messageId, 'with', emoji)}
                              onReply={(messageId) => console.log('Reply to:', messageId)}
                            />
                          );
                        }) : null}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border bg-card">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the sidebar to start messaging</p>
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