import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FollowButton from "@/components/follow-button";
import { Search, TrendingUp, Users, BookOpen, Hash, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import AuthDialog from "@/components/auth-dialog";

// Define interfaces for data types
interface TrendingTopic {
  topic: string;
  count: number;
  growth?: number;
}

interface TrendingUser {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  followerCount: number;
  isVerified?: boolean;
  bio?: string;
  postsCount?: number; // Added for guest view
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  imageUrls?: string[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isReposted?: boolean;
  spotifyTrack?: any;
  genre?: string; // Added genre for post display
}

export default function Explore() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoadingExploreData, setIsLoadingExploreData] = useState(true);

  // Data states
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [searchResults, setSearchResults] = useState<{
    posts: Post[];
    users: TrendingUser[];
  }>({ posts: [], users: [] });

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

  // Fetch explore data
  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    try {
      setIsLoadingExploreData(true);

      const [trendingRes, popularRes, topicsRes, usersRes] = await Promise.allSettled([
        fetch('/api/trending/posts?limit=20'),
        fetch('/api/explore/popular?limit=20'),
        fetch('/api/explore/trending-topics'),
        fetch('/api/users/trending?limit=10')
      ]);

      if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
        const data = await trendingRes.value.json();
        setTrendingPosts(data);
      } else if (trendingRes.status === 'rejected') {
        console.error("Error fetching trending posts:", trendingRes.reason);
      }

      if (popularRes.status === 'fulfilled' && popularRes.value.ok) {
        const data = await popularRes.value.json();
        setPopularPosts(data);
      } else if (popularRes.status === 'rejected') {
        console.error("Error fetching popular posts:", popularRes.reason);
      }

      if (topicsRes.status === 'fulfilled' && topicsRes.value.ok) {
        const data = await topicsRes.value.json();
        setTrendingTopics(data);
      } else if (topicsRes.status === 'rejected') {
        console.error("Error fetching trending topics:", topicsRes.reason);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data = await usersRes.value.json();
        setTrendingUsers(data);
      } else if (usersRes.status === 'rejected') {
        console.error("Error fetching trending users:", usersRes.reason);
      }

    } catch (error) {
      console.error("An unexpected error occurred during fetchExploreData:", error);
    } finally {
      setIsLoadingExploreData(false);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const [postsRes, usersRes] = await Promise.allSettled([
        fetch(`/api/search/posts?q=${encodeURIComponent(searchQuery)}&limit=20`),
        fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}&limit=20`)
      ]);

      const posts = postsRes.status === 'fulfilled' && postsRes.value.ok
        ? await postsRes.value.json()
        : [];

      const users = usersRes.status === 'fulfilled' && usersRes.value.ok
        ? await usersRes.value.json()
        : [];

      setSearchResults({ posts, users });
      setActiveTab("search");
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle errors from original queries
  useEffect(() => {
    // This effect is less relevant with the new fetching logic, but kept for completeness if needed elsewhere.
  }, [toast]);


  // Render component for unauthenticated users
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-2">Explore Writers Guild</h1>
                <p className="text-muted-foreground">
                  Discover amazing content from our community of writers
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Join to unlock full features</h3>
                <p className="text-muted-foreground mb-4">
                  Sign up to interact with posts, follow writers, and share your own content
                </p>
                <AuthDialog
                  open={showAuthDialog}
                  onOpenChange={setShowAuthDialog}
                  onSuccess={() => window.location.reload()}
                />
                <Button onClick={() => setShowAuthDialog(true)} className="mr-2">
                  Sign Up
                </Button>
                <Button variant="outline" onClick={() => setShowAuthDialog(true)}>
                  Sign In
                </Button>
              </div>

              <ExploreContentGuest
                trendingTopics={trendingTopics}
                trendingUsers={trendingUsers}
                isLoading={isLoadingExploreData}
                />
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  // Render explore page for authenticated users
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search posts, users, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-4 py-2"
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trending" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="space-y-4 mt-6">
                {isLoadingExploreData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-b border-border p-6">
                      <div className="flex space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-32 w-full rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : trendingPosts?.length === 0 ? (
                   <div className="p-12 text-center" data-testid="empty-trending">
                     <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                       <TrendingUp className="w-8 h-8 text-muted-foreground" />
                     </div>
                     <h3 className="text-lg font-semibold mb-2">No trending posts</h3>
                     <p className="text-muted-foreground">
                       Check back later for trending content from the community
                     </p>
                   </div>
                ) : (
                  trendingPosts?.map((post: Post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-4 mt-6">
                {isLoadingExploreData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                     <div key={i} className="border-b border-border p-6">
                       <div className="flex space-x-3">
                         <Skeleton className="w-10 h-10 rounded-full" />
                         <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-1/4" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-32 w-full rounded-lg" />
                         </div>
                       </div>
                     </div>
                  ))
                ) : popularPosts?.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No popular posts</h3>
                    <p className="text-muted-foreground">
                      Check back later for popular content from the community
                    </p>
                  </div>
                ) : (
                  popularPosts?.map((post: Post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-4 mt-6">
                <RecentPosts />
              </TabsContent>

              <TabsContent value="search" className="space-y-4 mt-6">
                {searchResults.posts.length > 0 || searchResults.users.length > 0 ? (
                  <div className="space-y-6">
                    {searchResults.users.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Writers</h3>
                        <div className="grid gap-3">
                          {searchResults.users.map((user) => (
                            <UserSearchResult key={user.id} user={user} />
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.posts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Posts</h3>
                        <div className="space-y-4">
                          {searchResults.posts.map((post: Post) => (
                            <PostCard key={post.id} post={post} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No results found</h3>
                    <p className="text-muted-foreground">Try searching for something else</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Search for content</h3>
                    <p className="text-muted-foreground">Enter keywords to find writers and posts</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 hidden lg:block">
            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-accent" />
                  Trending Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingExploreData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))
                ) : trendingTopics.length > 0 ? (
                  trendingTopics.map((topic, index) => (
                    <div
                      key={topic.topic}
                      className="flex items-center justify-between hover:bg-secondary/50 p-2 rounded-lg cursor-pointer transition-colors"
                      data-testid={`genre-${index}`}
                      onClick={() => {
                        setSearchQuery(topic.topic);
                        handleSearch();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <Badge variant="secondary" className="text-xs">#{topic.topic}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{topic.count} posts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No trending topics found.</p>
                )}
              </CardContent>
            </Card>

            {/* Who to Follow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Who to Follow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingExploreData ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))
                ) : trendingUsers.length > 0 ? (
                  trendingUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback>
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate">{user.displayName}</span>
                          {user.isVerified && (
                            <Badge variant="secondary" className="h-4 w-4 p-0">✓</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      {isAuthenticated && user.id !== user?.id && (
                        <FollowButton userId={user.id} />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No users to follow right now.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
        </div>

      <MobileNav />
    </div>
  );
}

// Component for displaying recent posts
function RecentPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts?limit=20')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPosts(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="border-b border-border p-6">
        <div className="flex space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    ));
  }

  if (posts.length === 0) {
    return (
      <div className="p-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No recent posts</h3>
        <p className="text-muted-foreground">Be the first to post!</p>
      </div>
    );
  }

  return (
    <>
      {posts.map((post: Post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}

// Component for displaying user search results
function UserSearchResult({ user }: { user: TrendingUser }) {
  const { user: currentUser, isAuthenticated } = useAuth();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profileImageUrl} />
            <AvatarFallback>
              {user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium truncate">{user.displayName}</span>
              {user.isVerified && (
                <Badge variant="secondary" className="h-4 w-4 p-0">✓</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
            )}
          </div>
          {isAuthenticated && user.id !== currentUser?.id && (
            <FollowButton userId={user.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying explore content for guests
function ExploreContentGuest({ trendingTopics, trendingUsers, isLoading }: { trendingTopics: TrendingTopic[], trendingUsers: TrendingUser[], isLoading: boolean }) {

  const mockPopularPosts: Post[] = [
    {
      id: "guest-post-1", content: "Welcome to Writers Guild! Discover your next favorite read.", authorId: "guest-author-1", author: { id: "guest-author-1", username: "guild_admin", displayName: "Writers Guild Admin", profileImageUrl: "/path/to/admin_avatar.png", isVerified: true }, createdAt: new Date().toISOString(), likeCount: 100, commentCount: 10, repostCount: 5, genre: "Announcement"
    },
    {
      id: "guest-post-2", content: "Share your writing journey with us. #writingcommunity", authorId: "guest-author-2", author: { id: "guest-author-2", username: "writer_x", displayName: "Writer X", isVerified: false }, createdAt: new Date(Date.now() - 86400000).toISOString(), likeCount: 50, commentCount: 5, repostCount: 2, genre: "Tips"
    }
  ];

  return (
    <Tabs defaultValue="trending" className="mb-8">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="trending">
          <TrendingUp className="w-4 h-4 mr-2" />
          Trending
        </TabsTrigger>
        <TabsTrigger value="writers">
          <Users className="w-4 h-4 mr-2" />
          Writers
        </TabsTrigger>
        <TabsTrigger value="topics">
          <BookOpen className="w-4 h-4 mr-2" />
          Topics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trending" className="space-y-6 mt-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : trendingTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingTopics.map((topic, index) => (
              <Card key={topic.topic} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">#{topic.topic}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">Category</p>
                  <p className="text-2xl font-bold text-primary">{topic.count} posts</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No trending topics available.</p>
        )}
      </TabsContent>

      <TabsContent value="writers" className="space-y-6 mt-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : trendingUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trendingUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>
                        {user.displayName?.[0] || user.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{user.displayName || user.username}</h3>
                        {user.isVerified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{user.bio}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{user.followerCount || 0} followers</span>
                    <span>Posts: {user.postsCount || 0}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No trending writers found.</p>
        )}
      </TabsContent>

      <TabsContent value="topics" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Poetry", "Short Stories", "Fiction", "Non-Fiction", "Fantasy",
            "Romance", "Mystery", "Science Fiction", "Historical Fiction",
            "Young Adult", "Memoir", "Creative Writing"
          ].map((genre, index) => (
            <Card key={genre} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{genre}</h3>
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Explore {genre.toLowerCase()} content
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}