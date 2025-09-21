import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import PostCard from "@/components/post-card";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  TrendingUp, 
  Users, 
  Hash, 
  Music, 
  BookOpen,
  Feather,
  Quote,
  Edit3
} from "lucide-react";
import type { Post, User } from "@shared/schema";
import { AuthDialog } from "@/components/auth-dialog";

export default function Explore() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [showAuthDialog, setShowAuthDialog] = useState(false);


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

  // Fetch trending posts
  const { 
    data: trendingPosts, 
    isLoading: trendingLoading,
    error: trendingError 
  } = useQuery({
    queryKey: ["/api/trending/posts"],
    queryFn: () => fetch("/api/trending/posts?limit=20").then(res => res.json()),
  });

  // Fetch suggested users
  const { 
    data: suggestedUsers, 
    isLoading: usersLoading,
    error: usersError 
  } = useQuery({
    queryKey: ["/api/suggested/users"],
    queryFn: () => fetch("/api/suggested/users?limit=10").then(res => res.json()),
    enabled: !!user,
  });

  // Search users
  const { 
    data: searchUsers, 
    isLoading: searchUsersLoading 
  } = useQuery({
    queryKey: ["/api/search/users", searchQuery],
    queryFn: () => fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}&limit=20`).then(res => res.json()),
    enabled: searchQuery.length > 2 && activeTab === "users",
  });

  // Search posts
  const { 
    data: searchPosts, 
    isLoading: searchPostsLoading 
  } = useQuery({
    queryKey: ["/api/search/posts", searchQuery],
    queryFn: () => fetch(`/api/search/posts?q=${encodeURIComponent(searchQuery)}&limit=20`).then(res => res.json()),
    enabled: searchQuery.length > 2 && activeTab === "posts",
  });

  // Handle errors
  useEffect(() => {
    const errors = [trendingError, usersError];
    for (const error of errors) {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        break;
      }
    }
  }, [trendingError, usersError, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab("posts");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading Writers Guild...</p>
        </div>
      </div>
    );
  }

  // Render explore page for unauthenticated users
  if (!isAuthenticated) {
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

              {/* Show limited explore content */}
              <ExploreContent isAuthenticated={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render explore page for authenticated users
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen">
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Explore</h2>
                    <p className="text-sm text-muted-foreground">Discover amazing writers and stories</p>
                  </div>

                  {/* Search Bar */}
                  <div className="p-4 border-b border-border">
                    <form onSubmit={handleSearch}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search writers, posts, hashtags, genres..."
                          className="pl-10 bg-input border-border focus:border-primary text-lg py-3"
                          data-testid="input-search-explore"
                        />
                      </div>
                    </form>
                  </div>

                  {/* Explore Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full bg-transparent border-b border-border rounded-none">
                      <TabsTrigger 
                        value="trending" 
                        className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        data-testid="tab-trending"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Trending
                      </TabsTrigger>
                      <TabsTrigger 
                        value="users" 
                        className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        data-testid="tab-users"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Writers
                      </TabsTrigger>
                      <TabsTrigger 
                        value="posts" 
                        className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        data-testid="tab-posts"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Posts
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Content */}
                <TabsContent value="trending" className="mt-0">
                  {trendingLoading ? (
                    <div className="space-y-0">
                      {Array.from({ length: 5 }).map((_, i) => (
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
                      ))}
                    </div>
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
                    <div className="space-y-0">
                      {trendingPosts?.map((post: Post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                  {searchQuery.length > 2 ? (
                    searchUsersLoading ? (
                      <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {searchUsers?.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                              <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No users found</h3>
                            <p className="text-muted-foreground">
                              Try searching with different keywords
                            </p>
                          </div>
                        ) : (
                          searchUsers?.map((searchUser: User) => (
                            <div key={searchUser.id} className="border-b border-border p-6 hover:bg-card/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={searchUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.username}`}
                                    alt={`${searchUser.firstName} ${searchUser.lastName}`}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h3 className="font-semibold">
                                        {searchUser.firstName} {searchUser.lastName}
                                      </h3>
                                      {searchUser.isVerified && (
                                        <Badge variant="secondary" className="text-xs">
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">@{searchUser.username}</p>
                                    {searchUser.bio && (
                                      <p className="text-sm mt-1 line-clamp-2">{searchUser.bio}</p>
                                    )}
                                    {searchUser.genres && searchUser.genres.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {searchUser.genres.slice(0, 3).map((genre) => (
                                          <Badge key={genre} variant="outline" className="text-xs">
                                            {genre}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  size="sm"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  data-testid={`button-follow-${searchUser.username}`}
                                >
                                  Follow
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )
                  ) : (
                    usersLoading ? (
                      <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-0">
                        <div className="p-4 border-b border-border">
                          <h3 className="font-semibold mb-2">Suggested Writers</h3>
                          <p className="text-sm text-muted-foreground">Discover talented writers you might enjoy</p>
                        </div>
                        {suggestedUsers?.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                              <Users className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No suggestions yet</h3>
                            <p className="text-muted-foreground">
                              Follow some writers to get personalized suggestions
                            </p>
                          </div>
                        ) : (
                          suggestedUsers?.map((suggestedUser: User) => (
                            <div key={suggestedUser.id} className="border-b border-border p-6 hover:bg-card/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={suggestedUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestedUser.username}`}
                                    alt={`${suggestedUser.firstName} ${suggestedUser.lastName}`}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h3 className="font-semibold">
                                        {suggestedUser.firstName} {suggestedUser.lastName}
                                      </h3>
                                      {suggestedUser.isVerified && (
                                        <Badge variant="secondary" className="text-xs">
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">@{suggestedUser.username}</p>
                                    {suggestedUser.bio && (
                                      <p className="text-sm mt-1 line-clamp-2">{suggestedUser.bio}</p>
                                    )}
                                    {suggestedUser.genres && suggestedUser.genres.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {suggestedUser.genres.slice(0, 3).map((genre) => (
                                          <Badge key={genre} variant="outline" className="text-xs">
                                            {genre}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  size="sm"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  data-testid={`button-follow-${suggestedUser.username}`}
                                >
                                  Follow
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )
                  )}
                </TabsContent>

                <TabsContent value="posts" className="mt-0">
                  {searchQuery.length > 2 ? (
                    searchPostsLoading ? (
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
                    ) : (
                      <div className="space-y-0">
                        {searchPosts?.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                              <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                            <p className="text-muted-foreground">
                              Try searching with different keywords
                            </p>
                          </div>
                        ) : (
                          searchPosts?.map((post: Post) => (
                            <PostCard key={post.id} post={post} />
                          ))
                        )}
                      </div>
                    )
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Search for posts</h3>
                      <p className="text-muted-foreground">
                        Enter keywords to find amazing stories, poems, and creative writing
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6 hidden lg:block">
                {/* Featured Genres */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-accent" />
                      Popular Genres
                    </h3>
                    <div className="space-y-3">
                      {[
                        { name: "Poetry", posts: "2,847", color: "text-purple-400" },
                        { name: "Flash Fiction", posts: "1,923", color: "text-blue-400" },
                        { name: "Fantasy", posts: "1,456", color: "text-green-400" },
                        { name: "Romance", posts: "1,234", color: "text-pink-400" },
                        { name: "Sci-Fi", posts: "987", color: "text-cyan-400" },
                      ].map((genre, index) => (
                        <div 
                          key={genre.name}
                          className="hover:bg-secondary/50 p-3 rounded-lg cursor-pointer transition-colors"
                          data-testid={`genre-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <BookOpen className={`w-5 h-5 ${genre.color}`} />
                              <div>
                                <p className="font-semibold">{genre.name}</p>
                                <p className="text-xs text-muted-foreground">{genre.posts} posts</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs">
                              Follow
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Challenge */}
                <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Feather className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-lg">Weekly Challenge</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-background/50 rounded-lg p-3">
                        <h4 className="font-semibold mb-2">This Week's Prompt</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          "Write about a memory triggered by a scent"
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">234 participants</span>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Join Challenge
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Writing Tips */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Quote className="w-5 h-5 text-accent" />
                      Writing Tip of the Day
                    </h3>
                    <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm italic mb-2">
                        "The first draft is just you telling yourself the story."
                      </p>
                      <p className="text-xs text-muted-foreground">— Terry Pratchett</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

function ExploreContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { data: trendingTopics = [] } = useQuery({
    queryKey: ['/api/explore/trending-topics'],
    queryFn: async () => {
      const response = await fetch('/api/explore/trending-topics');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: trendingUsers } = useQuery({
    queryKey: ['/api/users/trending'],
    queryFn: async () => {
      const response = await fetch('/api/users/trending');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: popularPosts } = useQuery({
    queryKey: ['/api/explore/popular'],
    queryFn: async () => {
      const response = await fetch('/api/explore/popular');
      if (!response.ok) return [];
      return response.json();
    },
  });

  return (
    <Tabs defaultValue="trending" className="mb-8">
      <TabsList className="grid w-full grid-cols-4">
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
        <TabsTrigger value="featured">
          <Star className="w-4 h-4 mr-2" />
          Featured
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trending" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingTopics.map((topic: any) => (
            <Card key={topic.rank} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">#{topic.rank}</Badge>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{topic.hashtag}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{topic.category}</p>
                <p className="text-2xl font-bold text-primary">{topic.posts} posts</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="writers" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trendingUsers?.map((user: any) => (
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
                <p className="text-sm text-muted-foreground mb-3">{user.bio}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{user.followersCount || 0} followers</span>
                  <span>{user.postsCount || 0} posts</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

      <TabsContent value="featured" className="space-y-6 mt-6">
        <div className="space-y-4">
          {popularPosts?.slice(0, 5).map((post: any) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar>
                    <AvatarImage src={post.author?.profileImageUrl} />
                    <AvatarFallback>
                      {post.author?.displayName?.[0] || post.author?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold">{post.author?.displayName || post.author?.username}</span>
                      <span className="text-sm text-muted-foreground">@{post.author?.username}</span>
                      {post.genre && (
                        <Badge variant="outline" className="text-xs">{post.genre}</Badge>
                      )}
                    </div>
                    <p className="text-sm mb-3 line-clamp-3">{post.content}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-4 h-4" />
                        <span>{post.likesCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentsCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Share2 className="w-4 h-4" />
                        <span>{post.repostsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}