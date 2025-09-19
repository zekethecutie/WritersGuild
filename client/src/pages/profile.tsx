import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import PostCard from "@/components/post-card";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Settings, 
  MessageCircle,
  Heart,
  Repeat2,
  Bookmark,
  Users,
  Edit3,
  Camera
} from "lucide-react";
import type { Post, User } from "@shared/schema";

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Use current user's username/id if no username provided
  const profileUsername = username || currentUser?.username || currentUser?.id;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch profile user data
  const { 
    data: profileUser, 
    isLoading: profileLoading, 
    error: profileError 
  } = useQuery({
    queryKey: ["/api/users", profileUsername],
    queryFn: () => fetch(`/api/users/${profileUsername}`).then(res => res.json()),
    enabled: !!profileUsername,
  });

  // Fetch user posts
  const { 
    data: userPosts, 
    isLoading: postsLoading,
    error: postsError 
  } = useQuery({
    queryKey: ["/api/users", profileUser?.id, "posts"],
    queryFn: () => fetch(`/api/users/${profileUser.id}/posts`).then(res => res.json()),
    enabled: !!profileUser?.id,
  });

  // Handle errors
  useEffect(() => {
    if (profileError && isUnauthorizedError(profileError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [profileError, toast]);

  const isOwnProfile = currentUser?.id === profileUser?.id;

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto">
            {/* Profile header skeleton */}
            <div className="relative">
              <Skeleton className="h-48 w-full" />
              <div className="absolute -bottom-16 left-6">
                <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
              </div>
            </div>
            <div className="pt-20 px-6 pb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="relative">
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-br from-primary/20 via-background to-accent/20 relative">
              {profileUser.coverImageUrl && (
                <img 
                  src={profileUser.coverImageUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
              {isOwnProfile && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
                  data-testid="button-edit-cover"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Edit Cover
                </Button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="absolute -bottom-16 left-6">
              <div className="relative">
                <img 
                  src={profileUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                  alt={`${profileUser.firstName} ${profileUser.lastName}`}
                  className="w-32 h-32 rounded-full border-4 border-background object-cover"
                  data-testid="img-profile-avatar"
                />
                {isOwnProfile && (
                  <Button 
                    size="sm" 
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full p-0"
                    data-testid="button-edit-avatar"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4">
              {isOwnProfile ? (
                <Button 
                  variant="outline" 
                  className="bg-background/80 backdrop-blur-sm"
                  data-testid="button-edit-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-background/80 backdrop-blur-sm"
                    data-testid="button-message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button 
                    className="bg-primary text-primary-foreground"
                    data-testid="button-follow-user"
                  >
                    Follow
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 px-6 pb-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold" data-testid="text-user-name">
                {profileUser.firstName} {profileUser.lastName}
              </h1>
              <p className="text-muted-foreground" data-testid="text-username">
                @{profileUser.username}
              </p>
              {profileUser.isVerified && (
                <Badge variant="secondary" className="mt-1">
                  Verified Writer
                </Badge>
              )}
            </div>

            {profileUser.bio && (
              <p className="text-base leading-relaxed mb-4" data-testid="text-bio">
                {profileUser.bio}
              </p>
            )}

            {/* Profile Details */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a 
                    href={profileUser.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profileUser.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Writing Genres */}
            {profileUser.genres && profileUser.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profileUser.genres.map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1 cursor-pointer hover:underline">
                <Users className="w-4 h-4" />
                <span className="font-semibold">247</span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:underline">
                <Users className="w-4 h-4" />
                <span className="font-semibold">1.2k</span>
                <span className="text-muted-foreground">Followers</span>
              </div>
              {profileUser.writingStreak > 0 && (
                <div className="flex items-center gap-1">
                  <Edit3 className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-orange-400">{profileUser.writingStreak}</span>
                  <span className="text-muted-foreground">day streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full bg-transparent border-b border-border rounded-none px-6">
              <TabsTrigger 
                value="posts" 
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-posts"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="likes" 
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-likes"
              >
                Likes
              </TabsTrigger>
              <TabsTrigger 
                value="reposts" 
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-reposts"
              >
                Reposts
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger 
                  value="bookmarks" 
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-bookmarks"
                >
                  Bookmarks
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {postsLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-b border-border p-6">
                      <div className="flex space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userPosts?.length === 0 ? (
                <div className="p-12 text-center" data-testid="empty-posts">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Edit3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile 
                      ? "Share your first story, poem, or thought with the community" 
                      : `${profileUser.firstName} hasn't posted anything yet`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {userPosts?.map((post: Post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="likes" className="mt-0">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Heart className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No likes yet</h3>
                <p className="text-muted-foreground">
                  Posts liked by {isOwnProfile ? "you" : profileUser.firstName} will appear here
                </p>
              </div>
            </TabsContent>

            <TabsContent value="reposts" className="mt-0">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Repeat2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No reposts yet</h3>
                <p className="text-muted-foreground">
                  Posts reposted by {isOwnProfile ? "you" : profileUser.firstName} will appear here
                </p>
              </div>
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="bookmarks" className="mt-0">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Bookmark className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                  <p className="text-muted-foreground">
                    Save posts to read later and they'll appear here
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
      
      <MobileNav />
    </div>
  );
}
