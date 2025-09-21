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
                <Button
                  variant={profileUser.isFollowing ? "outline" : "default"}
                  size="sm"
                  className="ml-2"
                >
                  {profileUser.isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
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