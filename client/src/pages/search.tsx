import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { getProfileImageUrl } from "@/lib/defaultImages";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FollowButton from "@/components/follow-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search as SearchIcon, 
  TrendingUp, 
  Users, 
  Filter,
  User as UserIcon,
  MapPin,
  Calendar,
  BookOpen,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User, Post } from "@shared/schema";

interface SearchResults {
  users: User[];
  posts: Post[];
}

interface UserWithStats extends User {
  postsCount: number;
  followersCount: number;
  isFollowing?: boolean;
}

export default function Search() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [searchResults, setSearchResults] = useState<SearchResults>({ users: [], posts: [] });

  // Fetch recommended users
  const { data: recommendedUsers = [], isLoading: recommendedLoading } = useQuery({
    queryKey: ["/api/users/recommended"],
    queryFn: () => apiRequest("GET", "/api/users/recommended") as unknown as Promise<UserWithStats[]>,
    enabled: isAuthenticated,
  });

  // Fetch trending users
  const { data: trendingUsers = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/users/trending"],
    queryFn: () => apiRequest("GET", "/api/users/trending") as unknown as Promise<UserWithStats[]>,
    enabled: isAuthenticated,
  });

  // Fetch popular posts
  const { data: popularPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/posts/popular"],
    queryFn: () => apiRequest("GET", "/api/posts/popular") as unknown as Promise<Post[]>,
    enabled: isAuthenticated,
  });

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [] });
      return;
    }

    try {
      const results = await apiRequest("GET", `/api/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(results as unknown as SearchResults);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults({ users: [], posts: [] });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const UserCard = ({ user: profileUser, showFollowButton = true }: { user: UserWithStats; showFollowButton?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage
              src={getProfileImageUrl(profileUser.profileImageUrl)}
              alt={profileUser.displayName}
            />
            <AvatarFallback>
              <UserIcon className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg truncate">{profileUser.displayName}</h3>
                <p className="text-muted-foreground text-sm">@{profileUser.username}</p>
              </div>
              {showFollowButton && user?.id !== profileUser.id && (
                <FollowButton userId={profileUser.id} isFollowing={profileUser.isFollowing} />
              )}
            </div>
            
            {profileUser.bio && (
              <p className="text-sm text-muted-foreground mb-3" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>{profileUser.bio}</p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              {profileUser.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {profileUser.location}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Joined {formatDistanceToNow(new Date(profileUser.createdAt || new Date()), { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                <span className="font-medium">{profileUser.postsCount || 0}</span> posts
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span className="font-medium">{profileUser.followersCount || 0}</span> followers
              </div>
            </div>

            {profileUser.genres && profileUser.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {profileUser.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
                {profileUser.genres.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{profileUser.genres.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PostCard = ({ post }: { post: Post }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={getProfileImageUrl((post as any).author?.profileImageUrl)}
                alt={(post as any).author?.displayName || "User"}
              />
              <AvatarFallback>
                <UserIcon className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{(post as any).author?.displayName || "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">@{(post as any).author?.username}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {post.genre && (
              <Badge variant="outline" className="text-xs">{post.genre}</Badge>
            )}
            <p className="text-sm" style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>{post.content}</p>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              {post.likesCount || 0}
            </div>
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.commentsCount || 0}
            </div>
            <span>
              {formatDistanceToNow(new Date(post.createdAt || new Date()), { addSuffix: true })}
            </span>
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
            <h2 className="text-2xl font-bold mb-2">Sign in to discover</h2>
            <p className="text-muted-foreground">You need to be logged in to search and discover content.</p>
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
            <div className="flex items-center space-x-3 mb-6">
              <SearchIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Discover</h1>
                <p className="text-muted-foreground">Find writers, stories, and inspiration</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for users, posts, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg py-3"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>

            {/* Discover Tab */}
            <TabsContent value="discover" className="space-y-8">
              {searchQuery ? (
                <>
                  {/* Search Results */}
                  {searchResults.users.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Users ({searchResults.users.length})
                      </h2>
                      <div className="grid gap-4">
                        {searchResults.users.slice(0, 5).map((searchUser) => (
                          <UserCard key={searchUser.id} user={searchUser as UserWithStats} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {searchResults.posts.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2" />
                        Posts ({searchResults.posts.length})
                      </h2>
                      <div className="grid gap-4">
                        {searchResults.posts.slice(0, 10).map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No results found for "{searchQuery}"</p>
                      <p className="text-sm">Try different keywords or browse our recommendations below</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Recommended Users */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Recommended for You
                    </h2>
                    {recommendedLoading ? (
                      <div className="grid gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                              <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 bg-muted rounded-full" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                  <div className="h-3 bg-muted rounded w-1/3" />
                                  <div className="h-3 bg-muted rounded w-full" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : recommendedUsers.length > 0 ? (
                      <div className="grid gap-4">
                        {recommendedUsers.slice(0, 5).map((recommendedUser) => (
                          <UserCard key={recommendedUser.id} user={recommendedUser} />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No recommendations available yet</p>
                          <p className="text-sm">Follow some users or interact with posts to get personalized recommendations</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Popular Posts */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Popular Posts
                    </h2>
                    {postsLoading ? (
                      <div className="grid gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-muted rounded-full" />
                                  <div className="space-y-1">
                                    <div className="h-3 bg-muted rounded w-20" />
                                    <div className="h-3 bg-muted rounded w-16" />
                                  </div>
                                </div>
                                <div className="h-4 bg-muted rounded w-full" />
                                <div className="h-4 bg-muted rounded w-2/3" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : popularPosts.length > 0 ? (
                      <div className="grid gap-4">
                        {popularPosts.slice(0, 10).map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No popular posts yet</p>
                          <p className="text-sm">Be the first to create content that inspires others</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">All Users</h2>
                {recommendedLoading ? (
                  <div className="grid gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-muted rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2" />
                              <div className="h-3 bg-muted rounded w-1/3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {[...recommendedUsers, ...trendingUsers].slice(0, 20).map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">All Posts</h2>
                {postsLoading ? (
                  <div className="grid gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full" />
                              <div className="space-y-1">
                                <div className="h-3 bg-muted rounded w-20" />
                                <div className="h-3 bg-muted rounded w-16" />
                              </div>
                            </div>
                            <div className="h-4 bg-muted rounded w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {popularPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Trending Tab */}
            <TabsContent value="trending" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Trending Writers
                </h2>
                {trendingLoading ? (
                  <div className="grid gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-muted rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2" />
                              <div className="h-3 bg-muted rounded w-1/3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : trendingUsers.length > 0 ? (
                  <div className="grid gap-4">
                    {trendingUsers.map((trendingUser) => (
                      <UserCard key={trendingUser.id} user={trendingUser} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No trending users yet</p>
                      <p className="text-sm">Check back later to see who's gaining popularity</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <MobileNav />
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import PostCard from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Calendar,
  MapPin,
  User as UserIcon,
  BookOpen,
  Music,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Repeat2,
  ChevronDown,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SearchFilters {
  type: 'all' | 'posts' | 'users' | 'topics';
  timeRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'recent' | 'popular' | 'engagement';
  postType: 'all' | 'text' | 'poetry' | 'story' | 'challenge';
  hasImages: boolean;
  hasMusic: boolean;
  verified: boolean;
  minEngagement: number;
}

export default function SearchPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    timeRange: 'all',
    sortBy: 'relevance',
    postType: 'all',
    hasImages: false,
    hasMusic: false,
    verified: false,
    minEngagement: 0
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search results
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ["/api/search", debouncedQuery, filters],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { posts: [], users: [], topics: [] };
      
      const params = new URLSearchParams({
        q: debouncedQuery,
        type: filters.type,
        timeRange: filters.timeRange,
        sortBy: filters.sortBy,
        postType: filters.postType,
        hasImages: filters.hasImages.toString(),
        hasMusic: filters.hasMusic.toString(),
        verified: filters.verified.toString(),
        minEngagement: filters.minEngagement.toString()
      });

      const response = await fetch(`/api/search?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    enabled: !!debouncedQuery.trim(),
  });

  // Trending searches
  const { data: trendingSearches } = useQuery({
    queryKey: ["/api/trending/searches"],
    queryFn: () => fetch("/api/trending/searches").then(res => res.json()),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search term",
        variant: "destructive"
      });
    }
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'minEngagement' ? 0 : 
                   typeof prev[filterKey] === 'boolean' ? false : 'all'
    }));
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'minEngagement') return value > 0;
    if (typeof value === 'boolean') return value;
    return value !== 'all';
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-4xl mx-auto p-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search posts, users, topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 text-lg"
                  />
                </div>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Content Type</label>
                        <Select value={filters.type} onValueChange={(value: any) => setFilters(prev => ({...prev, type: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Content</SelectItem>
                            <SelectItem value="posts">Posts Only</SelectItem>
                            <SelectItem value="users">Users Only</SelectItem>
                            <SelectItem value="topics">Topics Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Time Range</label>
                        <Select value={filters.timeRange} onValueChange={(value: any) => setFilters(prev => ({...prev, timeRange: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Sort By</label>
                        <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({...prev, sortBy: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevance">Most Relevant</SelectItem>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="engagement">Most Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Post Type</label>
                        <Select value={filters.postType} onValueChange={(value: any) => setFilters(prev => ({...prev, postType: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="text">Text Posts</SelectItem>
                            <SelectItem value="poetry">Poetry</SelectItem>
                            <SelectItem value="story">Stories</SelectItem>
                            <SelectItem value="challenge">Challenges</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="hasImages"
                          checked={filters.hasImages}
                          onCheckedChange={(checked) => setFilters(prev => ({...prev, hasImages: !!checked}))}
                        />
                        <label htmlFor="hasImages" className="text-sm font-medium flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" />
                          Has Images
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="hasMusic"
                          checked={filters.hasMusic}
                          onCheckedChange={(checked) => setFilters(prev => ({...prev, hasMusic: !!checked}))}
                        />
                        <label htmlFor="hasMusic" className="text-sm font-medium flex items-center gap-1">
                          <Music className="w-4 h-4" />
                          Has Music
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="verified"
                          checked={filters.verified}
                          onCheckedChange={(checked) => setFilters(prev => ({...prev, verified: !!checked}))}
                        />
                        <label htmlFor="verified" className="text-sm font-medium flex items-center gap-1">
                          <Badge variant="secondary" className="h-4 w-4 p-0">✓</Badge>
                          Verified Only
                        </label>
                      </div>
                    </div>

                    {/* Active Filters */}
                    {activeFiltersCount > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium">Active filters:</span>
                        {Object.entries(filters).map(([key, value]) => {
                          if (key === 'minEngagement' && value > 0) {
                            return (
                              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                                Min {value} engagement
                                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter(key as keyof SearchFilters)} />
                              </Badge>
                            );
                          }
                          if (typeof value === 'boolean' && value) {
                            return (
                              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                                {key}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter(key as keyof SearchFilters)} />
                              </Badge>
                            );
                          }
                          if (typeof value === 'string' && value !== 'all') {
                            return (
                              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                                {key}: {value}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter(key as keyof SearchFilters)} />
                              </Badge>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </form>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {!debouncedQuery ? (
            // Search suggestions when no query
            <div className="space-y-8">
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-2xl font-bold mb-2">Discover Amazing Content</h2>
                <p className="text-muted-foreground">Search for posts, writers, topics, and more</p>
              </div>

              {/* Trending Searches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Trending Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(trendingSearches || [
                      "poetry", "flash fiction", "writing tips", "love poems", 
                      "short stories", "haiku", "fantasy", "romance"
                    ]).map((term: string) => (
                      <Button
                        key={term}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(term)}
                        className="text-sm"
                      >
                        {term}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Search Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilters(prev => ({...prev, type: 'posts', postType: 'poetry'}))}>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <h3 className="font-semibold">Poetry</h3>
                    <p className="text-sm text-muted-foreground">Discover beautiful poems</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilters(prev => ({...prev, type: 'posts', postType: 'story'}))}>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <h3 className="font-semibold">Stories</h3>
                    <p className="text-sm text-muted-foreground">Read captivating tales</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilters(prev => ({...prev, type: 'users', verified: true}))}>
                  <CardContent className="p-6 text-center">
                    <UserIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <h3 className="font-semibold">Verified Writers</h3>
                    <p className="text-sm text-muted-foreground">Follow established authors</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : isLoading ? (
            // Loading state
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            // Error state
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Search Error</h3>
                <p className="text-muted-foreground">Failed to search. Please try again.</p>
              </CardContent>
            </Card>
          ) : (
            // Search results
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({(searchResults?.posts?.length || 0) + (searchResults?.users?.length || 0)})
                </TabsTrigger>
                <TabsTrigger value="posts">
                  Posts ({searchResults?.posts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="users">
                  Users ({searchResults?.users?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="topics">
                  Topics ({searchResults?.topics?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 mt-6">
                {/* Users Section */}
                {searchResults?.users?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Writers</h3>
                    <div className="grid gap-4">
                      {searchResults.users.slice(0, 3).map((user: any) => (
                        <UserSearchResult key={user.id} user={user} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Section */}
                {searchResults?.posts?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Posts</h3>
                    <div className="space-y-4">
                      {searchResults.posts.map((post: any) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {(!searchResults?.posts?.length && !searchResults?.users?.length) && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No results found</h3>
                      <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="posts" className="space-y-4 mt-6">
                {searchResults?.posts?.length > 0 ? (
                  searchResults.posts.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                      <p className="text-muted-foreground">Try different search terms</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-4 mt-6">
                {searchResults?.users?.length > 0 ? (
                  <div className="grid gap-4">
                    {searchResults.users.map((user: any) => (
                      <UserSearchResult key={user.id} user={user} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <UserIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No users found</h3>
                      <p className="text-muted-foreground">Try different search terms</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="topics" className="space-y-4 mt-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Topic search coming soon</h3>
                    <p className="text-muted-foreground">We're working on advanced topic discovery</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      
      <MobileNav />
    </div>
  );
}

function UserSearchResult({ user }: { user: any }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profileImageUrl} />
            <AvatarFallback>
              {user.displayName?.slice(0, 2).toUpperCase() || user.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{user.displayName}</h3>
              {user.isVerified && (
                <Badge variant="secondary" className="h-4 w-4 p-0">✓</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
            {user.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{user.bio}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {user.location && (
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {user.location}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </div>
              <div className="flex items-center">
                <UserIcon className="w-3 h-3 mr-1" />
                {user.followersCount || 0} followers
              </div>
            </div>
          </div>
          
          <Button size="sm">View Profile</Button>
        </div>
      </CardContent>
    </Card>
  );
}
