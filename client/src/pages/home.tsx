import { useEffect, useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import PostModal from "@/components/post-modal";
import PostCard from "@/components/post-card";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, Flame, Music } from "lucide-react";
import { AuthDialog } from "@/components/auth-dialog";
import type { Post, User } from "@shared/schema";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("for-you");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false); // State for controlling the Post Modal

  // Show login prompt if not authenticated but don't force redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Welcome to Writers Guild",
        description: "Create an account or log in to share your writing",
        variant: "default",
      });
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch posts with infinite scroll
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
    error: postsError,
  } = useInfiniteQuery({
    queryKey: ["/api/posts", activeTab === "following" ? user?.id : undefined],
    queryFn: ({ pageParam = 0 }) => 
      fetch(`/api/posts?limit=20&offset=${pageParam}&userId=${activeTab === "following" ? user?.id || "" : ""}`).then(res => res.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, pages) => {
      return lastPage.length === 20 ? pages.length * 20 : undefined;
    },
    enabled: !!user || !isAuthenticated, // Enable for guests as well
  });

  // Fetch trending posts
  const { data: trendingPosts } = useQuery({
    queryKey: ["/api/trending/posts"],
    queryFn: () => fetch("/api/trending/posts?limit=5").then(res => res.json()),
  });

  // Fetch trending topics
  const { data: trendingTopics } = useQuery({
    queryKey: ["/api/trending/topics"],
    queryFn: () => fetch("/api/trending/topics").then(res => res.json()),
  });

  // Fetch writing goals for authenticated user
  const { data: writingGoals } = useQuery({
    queryKey: ["/api/users", user?.id, "writing-goals"],
    queryFn: () => fetch(`/api/users/${user?.id}/writing-goals`).then(res => res.json()),
    enabled: !!user,
  });

  // Fetch suggested users
  const { data: suggestedUsers } = useQuery({
    queryKey: ["/api/suggested/users"],
    queryFn: async () => {
      const res = await fetch("/api/suggested/users?limit=3");
      const data = await res.json();
      // Return empty array if API returns error or non-array data
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  // Handle post errors
  useEffect(() => {
    if (postsError && isUnauthorizedError(postsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [postsError, toast]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = postsData?.pages.flat() || [];

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Feed */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="p-4">
                  <h2 className="text-xl font-bold">Home</h2>
                  <p className="text-sm text-muted-foreground">Latest from your creative community</p>
                </div>

                {/* Feed Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full bg-transparent border-b border-border rounded-none">
                    <TabsTrigger 
                      value="for-you" 
                      className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-for-you"
                    >
                      For You
                    </TabsTrigger>
                    <TabsTrigger 
                      value="following" 
                      className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-following"
                    >
                      Following
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Post Modal or Auth Prompt */}
              <div className="border-b border-border p-4">
                {isAuthenticated ? (
                  <Button 
                    onClick={() => setShowPostModal(true)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    size="lg"
                  >
                    ✍️ Make a Post
                  </Button>
                ) : (
                  <div className="p-2 text-center">
                    <h3 className="text-lg font-semibold mb-2">Share Your Writing</h3>
                    <p className="text-muted-foreground mb-4">Join Writers Guild to post your stories, poems, and creative works</p>
                    <Button onClick={() => setShowAuthDialog(true)} className="mr-2">
                      Create Account
                    </Button>
                    <Button variant="outline" onClick={() => setShowAuthDialog(true)}>
                      Sign In
                    </Button>
                    {/* Guest Access Button */}
                    <Button variant="ghost" onClick={() => { /* No-op for guest, as they are already viewing */ }} className="mt-4">
                      Continue as Guest
                    </Button>
                  </div>
                )}
              </div>

              {/* Posts Feed */}
              <div className="space-y-0">
                {postsLoading ? (
                  // Loading skeletons
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
                ) : allPosts.length === 0 ? (
                  <div className="p-12 text-center" data-testid="empty-feed">
                    <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {activeTab === "following" 
                        ? "Follow some writers to see their posts here" 
                        : "Be the first to share something with the community"
                      }
                    </p>
                    <Button 
                      onClick={() => setActiveTab("for-you")}
                      data-testid="button-explore-feed"
                    >
                      Explore Feed
                    </Button>
                  </div>
                ) : (
                  allPosts.map((post: any, index: number) => (
                    <PostCard key={`${post.id}-${index}`} post={post as Post} />
                  ))
                )}

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6 hidden lg:block">
              {/* Search */}
              <div className="sticky top-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        placeholder="Search writers, posts, genres..." 
                        className="pl-10 bg-input border-border focus:border-primary"
                        data-testid="input-search"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trending Topics */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Trending in Writing
                  </h3>
                  <div className="space-y-3">
                    {(trendingTopics || [
                      { rank: 1, category: "Poetry", hashtag: "#MidnightMusings", posts: "2,847" },
                      { rank: 2, category: "Fiction", hashtag: "#FlashFiction", posts: "1,923" },
                      { rank: 3, category: "Writing Challenge", hashtag: "#30DayChallenge", posts: "856" },
                      { rank: 4, category: "General", hashtag: "#WritersCommunity", posts: "634" },
                    ]).slice(0, 4).map((trend: any) => (
                      <div 
                        key={trend.rank}
                        className="hover:bg-secondary/50 p-2 rounded-lg cursor-pointer transition-colors"
                        data-testid={`trend-${trend.rank}`}
                      >
                        <p className="text-sm text-muted-foreground">#{trend.rank} • Trending in {trend.category}</p>
                        <p className="font-semibold">{trend.hashtag}</p>
                        <p className="text-xs text-muted-foreground">{trend.posts} posts</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Writers */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-4">Writers to Follow</h3>
                  <div className="space-y-4">
                    {suggestedUsers && suggestedUsers.length > 0 ? suggestedUsers.map((suggestedUser: User) => (
                      <div key={suggestedUser.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={suggestedUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestedUser.username}`}
                            alt={suggestedUser.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-semibold text-sm">
                              {suggestedUser.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{suggestedUser.username}
                            </p>
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
                    )) : (
                      <p className="text-sm text-muted-foreground text-center">No suggestions available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Writing Goals */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-4">Your Writing Goals</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Daily Word Count</span>
                        <span className="text-sm text-muted-foreground">
                          {writingGoals?.dailyWordCount ? 
                            `${writingGoals.dailyWordCount.current} / ${writingGoals.dailyWordCount.goal}` : 
                            "0 / 500"}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${writingGoals?.dailyWordCount?.percentage || 0}%` }} 
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Weekly Posts</span>
                        <span className="text-sm text-muted-foreground">
                          {writingGoals?.weeklyPosts ? 
                            `${writingGoals.weeklyPosts.current} / ${writingGoals.weeklyPosts.goal}` : 
                            "0 / 5"}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-accent h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${writingGoals?.weeklyPosts?.percentage || 0}%` }} 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center space-x-1">
                        <Flame className="w-4 h-4 text-orange-400 fire-icon" />
                        <span>Current Streak</span>
                      </span>
                      <span className="font-bold text-orange-400">
                        {writingGoals?.currentStreak || 0} days
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recently Played Music */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Music className="w-5 h-5 text-green-500" />
                    <h3 className="font-bold text-lg">Writing Soundtrack</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { artist: "Ludovico Einaudi", track: "Nuvole Bianche" },
                      { artist: "Ólafur Arnalds", track: "Near Light" },
                      { artist: "Max Richter", track: "On The Nature of Daylight" },
                    ].map((music, index) => (
                      <div 
                        key={index}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                        data-testid={`music-${index}`}
                      >
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                          <Music className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{music.artist}</p>
                          <p className="text-xs text-muted-foreground truncate">{music.track}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <MobileNav />

      {/* Post Modal */}
      {showPostModal && (
        <PostModal 
          isOpen={showPostModal} 
          onClose={() => setShowPostModal(false)} 
        />
      )}

      {/* Auth Dialog */}
      {showAuthDialog && (
        <AuthDialog 
          isOpen={showAuthDialog} 
          onClose={() => setShowAuthDialog(false)} 
        />
      )}
    </div>
  );
}