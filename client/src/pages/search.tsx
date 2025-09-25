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

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: isAuthenticated && debouncedQuery.trim().length > 0,
  });

  const resetFilters = () => {
    setFilters({
      type: 'all',
      timeRange: 'all',
      sortBy: 'relevance',
      postType: 'all',
      hasImages: false,
      hasMusic: false,
      verified: false,
      minEngagement: 0
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Sign in to search</h2>
            <p className="text-muted-foreground">
              You need to be signed in to search for posts and users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-4">Search</h1>
              
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for posts, users, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters && <ChevronDown className="w-4 h-4" />}
                </Button>
                
                {Object.values(filters).some(v => v !== 'all' && v !== false && v !== 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Type Filter */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Type</label>
                        <Select 
                          value={filters.type} 
                          onValueChange={(value: typeof filters.type) => 
                            setFilters(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="posts">Posts</SelectItem>
                            <SelectItem value="users">Users</SelectItem>
                            <SelectItem value="topics">Topics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Time Range */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Time Range</label>
                        <Select 
                          value={filters.timeRange} 
                          onValueChange={(value: typeof filters.timeRange) => 
                            setFilters(prev => ({ ...prev, timeRange: value }))
                          }
                        >
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

                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Sort By</label>
                        <Select 
                          value={filters.sortBy} 
                          onValueChange={(value: typeof filters.sortBy) => 
                            setFilters(prev => ({ ...prev, sortBy: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevance">Relevance</SelectItem>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="engagement">Most Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Post Type */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Post Type</label>
                        <Select 
                          value={filters.postType} 
                          onValueChange={(value: typeof filters.postType) => 
                            setFilters(prev => ({ ...prev, postType: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="poetry">Poetry</SelectItem>
                            <SelectItem value="story">Story</SelectItem>
                            <SelectItem value="challenge">Challenge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-images"
                          checked={filters.hasImages}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasImages: checked as boolean }))
                          }
                        />
                        <label htmlFor="has-images" className="text-sm">Has Images</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-music"
                          checked={filters.hasMusic}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasMusic: checked as boolean }))
                          }
                        />
                        <label htmlFor="has-music" className="text-sm">Has Music</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="verified"
                          checked={filters.verified}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, verified: checked as boolean }))
                          }
                        />
                        <label htmlFor="verified" className="text-sm">Verified Users Only</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Search Results */}
            {searchQuery ? (
              <div>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Searching...</p>
                  </div>
                ) : error ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-destructive">Search failed. Please try again.</p>
                    </CardContent>
                  </Card>
                ) : searchResults ? (
                  <div>
                    <Tabs defaultValue="posts" className="w-full">
                      <TabsList className="grid grid-cols-3 w-full max-w-md">
                        <TabsTrigger value="posts">Posts ({searchResults.posts?.length || 0})</TabsTrigger>
                        <TabsTrigger value="users">Users ({searchResults.users?.length || 0})</TabsTrigger>
                        <TabsTrigger value="topics">Topics ({searchResults.topics?.length || 0})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="posts" className="mt-4">
                        {searchResults.posts?.length > 0 ? (
                          <div className="space-y-4">
                            {searchResults.posts.map((post: any) => (
                              <PostCard key={post.id} post={post} />
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>No posts found for "{searchQuery}"</p>
                              <p className="text-sm">Try different keywords or adjust your filters</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="users" className="mt-4">
                        {searchResults.users?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {searchResults.users.map((user: any) => (
                              <Card 
                                key={user.id} 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => window.location.href = `/profile/${user.username}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <Avatar>
                                      <AvatarImage src={user.profileImageUrl} />
                                      <AvatarFallback>
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold truncate">
                                          {user.firstName} {user.lastName}
                                        </h3>
                                        {user.verified && (
                                          <Badge variant="secondary" className="text-xs">
                                            Verified
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                                      {user.bio && (
                                        <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>{user.postsCount || 0} posts</span>
                                        <span>{user.followersCount || 0} followers</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>No users found for "{searchQuery}"</p>
                              <p className="text-sm">Try different keywords or adjust your filters</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="topics" className="mt-4">
                        {searchResults.topics?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.topics.map((topic: any, index: number) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <span className="text-primary font-semibold">#</span>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">{topic.name}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {topic.postCount} posts
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>No topics found for "{searchQuery}"</p>
                              <p className="text-sm">Try different keywords or adjust your filters</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold mb-2">Search Writers Guild</h2>
                <p className="text-muted-foreground mb-6">
                  Find posts, users, and topics that interest you
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchQuery("poetry")}>
                    poetry
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchQuery("short story")}>
                    short story
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchQuery("writing challenge")}>
                    writing challenge
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchQuery("creative writing")}>
                    creative writing
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}