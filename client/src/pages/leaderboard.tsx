
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import PostCard from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Medal, 
  Award, 
  Heart, 
  BookOpen, 
  Users, 
  Eye, 
  Crown,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");

  // Fetch most liked posts
  const { data: topPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/leaderboard/posts"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/leaderboard/posts?limit=20", {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error('Failed to fetch top posts:', response.statusText);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching top posts:', error);
        return [];
      }
    },
  });

  // Fetch most liked stories
  const { data: topStories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ["/api/leaderboard/stories"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard/stories?limit=20");
      return response.ok ? response.json() : [];
    },
  });

  // Fetch top authors by story popularity
  const { data: topAuthors = [], isLoading: authorsLoading } = useQuery({
    queryKey: ["/api/leaderboard/authors"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard/authors?limit=20");
      return response.ok ? response.json() : [];
    },
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-gray-400" />;
      case 2: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{index + 1}</span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 1: return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 2: return "bg-gradient-to-r from-amber-500 to-amber-700";
      default: return "bg-gradient-to-r from-primary/20 to-accent/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground text-lg">
              Celebrating the most popular content and creators in our community
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Top Posts
              </TabsTrigger>
              <TabsTrigger value="stories" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Top Stories
              </TabsTrigger>
              <TabsTrigger value="authors" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Top Authors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6">
              <div className="space-y-4">
                {postsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : topPosts.length > 0 ? (
                  topPosts.map((post: any, index: number) => (
                    <Card key={post.id} className={`relative overflow-hidden ${getRankColor(index)}`}>
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        {getRankIcon(index)}
                        <Badge variant="secondary" className="text-xs">
                          {post.likesCount} likes
                        </Badge>
                      </div>
                      <div className="bg-background/95 backdrop-blur-sm m-1 rounded-lg">
                        <PostCard post={post} />
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No posts available</h3>
                    <p className="text-muted-foreground">Be the first to create popular content!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stories" className="space-y-6">
              <div className="grid gap-4">
                {storiesLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : topStories.length > 0 ? (
                  topStories.map((story: any, index: number) => (
                    <Card 
                      key={story.id} 
                      className={`relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${getRankColor(index)}`}
                      onClick={() => window.location.href = `/story/${story.id}`}
                    >
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        {getRankIcon(index)}
                        <Badge variant="secondary" className="text-xs">
                          {story.likesCount} likes
                        </Badge>
                      </div>
                      
                      <div className="bg-background/95 backdrop-blur-sm m-1 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            {story.coverImageUrl ? (
                              <img 
                                src={story.coverImageUrl} 
                                alt={story.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <BookOpen className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">{story.title}</h3>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {story.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={getProfileImageUrl(story.author?.profileImageUrl)} />
                                <AvatarFallback>{story.author?.displayName?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                by {story.author?.displayName}
                              </span>
                              {story.genre && (
                                <Badge variant="outline" className="text-xs">
                                  {story.genre}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {story.chaptersCount} chapters
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {story.followersCount} followers
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {story.viewsCount} views
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No stories available</h3>
                    <p className="text-muted-foreground">Be the first to create popular stories!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="authors" className="space-y-6">
              <div className="grid gap-4">
                {authorsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : topAuthors.length > 0 ? (
                  topAuthors.map((author: any, index: number) => (
                    <Card 
                      key={author.id} 
                      className={`relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${getRankColor(index)}`}
                      onClick={() => window.location.href = `/profile/${author.username}`}
                    >
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        {getRankIcon(index)}
                        <Badge variant="secondary" className="text-xs">
                          {author.totalLikes} total likes
                        </Badge>
                      </div>
                      
                      <div className="bg-background/95 backdrop-blur-sm m-1 rounded-lg p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={getProfileImageUrl(author.profileImageUrl)} />
                            <AvatarFallback className="text-lg">{author.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold">{author.displayName}</h3>
                              {author.isVerified && (
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-muted-foreground text-sm mb-3">
                              @{author.username}
                            </p>
                            
                            {author.bio && (
                              <p className="text-sm mb-3 line-clamp-2">{author.bio}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {author.storiesCount} stories
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {author.followersCount} followers
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {author.avgLikesPerStory} avg likes/story
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No authors available</h3>
                    <p className="text-muted-foreground">Start creating content to appear here!</p>
                  </div>
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
