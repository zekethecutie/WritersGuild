import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { getProfileImageUrl } from "@/lib/defaultImages";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Repeat,
  Eye,
  EyeOff,
  CheckCheck,
  Filter,
  User as UserIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification, User } from "@shared/schema";

interface NotificationWithActor extends Notification {
  actor?: User;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'follow':
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case 'repost':
      return <Repeat className="w-5 h-5 text-purple-500" />;
    case 'mention':
      return <MessageCircle className="w-5 h-5 text-orange-500" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

const getNotificationMessage = (notification: NotificationWithActor) => {
  const actorName = notification.actor?.displayName || "Someone";
  
  switch (notification.type) {
    case 'like':
      return `${actorName} liked your post`;
    case 'comment':
      return `${actorName} commented on your post`;
    case 'follow':
      return `${actorName} started following you`;
    case 'repost':
      return `${actorName} reposted your post`;
    case 'mention':
      return `${actorName} mentioned you in a post`;
    default:
      return `${actorName} interacted with your content`;
  }
};

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, lastMessage } = useWebSocket();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications (no polling - WebSocket handles real-time updates)
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => apiRequest("GET", "/api/notifications") as unknown as Promise<NotificationWithActor[]>,
    enabled: isAuthenticated,
    // Remove refetchInterval - WebSocket handles real-time updates
  });

  // Handle real-time WebSocket notifications
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'notification') {
      // Invalidate and refetch notifications when new notification arrives
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      // Show toast for new notification
      toast({
        title: "New Notification",
        description: "You have a new notification",
      });
    }
  }, [lastMessage, queryClient, toast]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.isRead;
    return notification.type === activeTab;
  });

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const NotificationCard = ({ notification }: { notification: NotificationWithActor }) => (
    <Card 
      className={`transition-all cursor-pointer hover:shadow-md ${
        !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200" : ""
      }`}
      onClick={() => {
        if (!notification.isRead) {
          markAsReadMutation.mutate(notification.id);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Notification Icon */}
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>

          {/* Actor Avatar */}
          {notification.actor && (
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={getProfileImageUrl(notification.actor.profileImageUrl)}
                alt={notification.actor.displayName}
              />
              <AvatarFallback>
                <UserIcon className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          )}

          {/* Notification Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {getNotificationMessage(notification)}
                </p>
                
                {/* Notification data/preview */}
                {notification.data && typeof notification.data === 'object' && (
                  <div className="mt-2">
                    {typeof (notification.data as any).content === 'string' && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        "{(notification.data as any).content.substring(0, 100)}..."
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt || new Date()), { addSuffix: true })}
                </p>
              </div>

              {/* Read status indicator */}
              <div className="ml-2 flex-shrink-0">
                {!notification.isRead ? (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sign in to view notifications</h2>
            <p className="text-muted-foreground">You need to be logged in to see your notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Bell className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Notifications</h1>
                  <p className="text-muted-foreground">
                    Stay updated with your latest activity
                    {isConnected && (
                      <span className="text-green-500 ml-2">● Real-time</span>
                    )}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="like">Likes</TabsTrigger>
              <TabsTrigger value="comment">Comments</TabsTrigger>
              <TabsTrigger value="follow">Follows</TabsTrigger>
              <TabsTrigger value="repost">Reposts</TabsTrigger>
            </TabsList>

            {/* Notifications Content */}
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-5 h-5 bg-muted rounded" />
                          <div className="w-10 h-10 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-2/3" />
                            <div className="h-3 bg-muted rounded w-1/3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "unread" 
                      ? "All caught up! No new notifications to show."
                      : activeTab === "all"
                      ? "You don't have any notifications yet. Start engaging with posts to receive updates!"
                      : `No ${activeTab} notifications found.`
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <MobileNav />
    </div>
  );
}