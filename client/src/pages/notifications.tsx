
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Bell, Heart, MessageCircle, Repeat, UserPlus, Check, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'collaboration_invite';
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
    isVerified?: boolean;
  };
  post?: {
    id: string;
    content: string;
  };
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        toast({
          title: "Success",
          description: "All notifications marked as read"
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'repost':
        return <Repeat className="h-4 w-4 text-purple-500" />;
      case 'collaboration_invite':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'repost':
        return 'reposted your post';
      case 'collaboration_invite':
        return 'invited you to collaborate on a post';
      default:
        return 'interacted with your content';
    }
  };

  const handleAcceptCollaboration = async (postId: string, notificationId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/collaborators/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Collaboration accepted!"
        });
        markAsRead(notificationId);
        fetchNotifications();
      } else {
        throw new Error('Failed to accept collaboration');
      }
    } catch (error) {
      console.error('Error accepting collaboration:', error);
      toast({
        title: "Error",
        description: "Failed to accept collaboration",
        variant: "destructive"
      });
    }
  };

  const handleRejectCollaboration = async (postId: string, notificationId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/collaborators/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Collaboration declined"
        });
        markAsRead(notificationId);
        fetchNotifications();
      } else {
        throw new Error('Failed to reject collaboration');
      }
    } catch (error) {
      console.error('Error rejecting collaboration:', error);
      toast({
        title: "Error",
        description: "Failed to decline collaboration",
        variant: "destructive"
      });
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.isRead
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        {/* Header with back button */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center gap-4 p-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? 'border-2 border-primary shadow-lg shadow-primary/20' : 'border'
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.actor?.profileImageUrl} />
                          <AvatarFallback>
                            {notification.actor?.displayName?.slice(0, 2)?.toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{notification.actor?.displayName || "Unknown User"}</span>
                          {notification.actor?.isVerified && (
                            <Badge variant="secondary" className="h-4 w-4 p-0">✓</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            @{notification.actor?.username || "unknown"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getNotificationText(notification)}
                          </span>
                        </div>
                        
                        {notification.post && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.post.content}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      )}
                    </div>

                    {notification.type === 'collaboration_invite' && !notification.isRead && notification.post && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptCollaboration(notification.post!.id, notification.id);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectCollaboration(notification.post!.id, notification.id);
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {filter === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : "When you get notifications, they'll show up here."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
