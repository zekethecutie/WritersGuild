import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Heart, 
  Users, 
  Eye, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share,
  MessageCircle,
  Play,
  ThumbsUp,
  Laugh,
  Frown,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";

const reactions = [
  { name: "like", icon: ThumbsUp, color: "text-blue-500" },
  { name: "love", icon: Heart, color: "text-red-500" },
  { name: "laugh", icon: Laugh, color: "text-yellow-500" },
  { name: "surprise", icon: AlertCircle, color: "text-purple-500" },
  { name: "sad", icon: Frown, color: "text-gray-500" },
];

export default function StoryPage() {
  const [match, params] = useRoute("/story/:id");
  const [match2, params2] = useRoute("/story/:id/chapter/:chapterId");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const storyId = params?.id || params2?.id;
  const chapterId = params2?.chapterId;

  const [showReader, setShowReader] = useState(!!chapterId);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showReactions, setShowReactions] = useState(false);

  // Fetch story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ["/api/series", storyId],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}`),
    enabled: !!storyId,
  });

  // Fetch chapters
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["/api/series", storyId, "chapters"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/series/${storyId}/chapters`);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching chapters:", error);
        return [];
      }
    },
    enabled: !!storyId,
  });

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/series", storyId, "comments"],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}/comments`),
    enabled: !!storyId,
  });

  // Fetch reading progress
  const { data: progress } = useQuery({
    queryKey: ["/api/series", storyId, "progress"],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}/progress`),
    enabled: !!storyId && isAuthenticated,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/series/${storyId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId] });
      toast({ title: "Success", description: "Updated follow status" });
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/series/${storyId}/bookmark`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId] });
      toast({ title: "Success", description: "Updated bookmark status" });
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/series/${storyId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId] });
    },
  });

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: (reaction: string) => apiRequest("POST", `/api/series/${storyId}/react`, { reaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId] });
      setShowReactions(false);
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/series/${storyId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId, "comments"] });
      setNewComment("");
      toast({ title: "Success", description: "Comment added" });
    },
  });

  // Update reading progress
  const updateProgressMutation = useMutation({
    mutationFn: (chapterIndex: number) => 
      apiRequest("PUT", `/api/series/${storyId}/progress`, { chapterIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId, "progress"] });
    },
  });

  // Set current chapter index based on URL or progress
  useEffect(() => {
    if (chapterId && chapters.length > 0) {
      const index = chapters.findIndex((ch: any) => ch.id === chapterId);
      if (index >= 0) setCurrentChapterIndex(index);
    } else if (progress?.lastChapterIndex !== undefined) {
      setCurrentChapterIndex(progress.lastChapterIndex);
    }
  }, [chapterId, chapters, progress]);

  const currentChapter = chapters[currentChapterIndex];

  const startReading = () => {
    setShowReader(true);
    if (isAuthenticated && currentChapterIndex > (progress?.lastChapterIndex || -1)) {
      updateProgressMutation.mutate(currentChapterIndex);
    }
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const newIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(newIndex);
      if (isAuthenticated) {
        updateProgressMutation.mutate(newIndex);
      }
      window.history.pushState({}, "", `/story/${storyId}/chapter/${chapters[newIndex].id}`);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const newIndex = currentChapterIndex - 1;
      setCurrentChapterIndex(newIndex);
      window.history.pushState({}, "", `/story/${storyId}/chapter/${chapters[newIndex].id}`);
    }
  };

  const handleReaction = (reaction: string) => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to react to stories", variant: "destructive" });
      return;
    }
    reactionMutation.mutate(reaction);
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to comment", variant: "destructive" });
      return;
    }
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  if (storyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Story not found</h1>
          <p className="text-muted-foreground">The story you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Reader view
  if (showReader && currentChapter) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          {/* Reader Header */}
          <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-lg border-b p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowReader(false)}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Story
              </Button>

              <div className="text-center">
                <h1 className="font-semibold">{story.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Chapter {currentChapterIndex + 1} of {chapters.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={prevChapter}
                  disabled={currentChapterIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={nextChapter}
                  disabled={currentChapterIndex === chapters.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Chapter Content */}
          <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">{currentChapter.title}</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {currentChapter.content.split('\n').map((paragraph: string, index: number) => (
                <p key={index} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Chapter Navigation */}
            <div className="flex justify-between items-center mt-12 pt-6 border-t">
              <Button 
                variant="outline"
                onClick={prevChapter}
                disabled={currentChapterIndex === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Chapter
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentChapterIndex + 1} / {chapters.length}
              </span>

              <Button 
                onClick={nextChapter}
                disabled={currentChapterIndex === chapters.length - 1}
                className="flex items-center gap-2"
              >
                Next Chapter
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Story Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Cover Image */}
            <div className="lg:col-span-1">
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl overflow-hidden shadow-lg">
                {story?.coverImageUrl ? (
                  <img 
                    src={story.coverImageUrl} 
                    alt={story.title || "Story cover"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mt-4 p-3 bg-card rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={getProfileImageUrl(story.author?.profileImageUrl)} />
                  <AvatarFallback>{story.author?.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{story.author?.displayName || 'Unknown Author'}</p>
                  <p className="text-sm text-muted-foreground">@{story.author?.username || 'unknown'}</p>
                </div>
              </div>
            </div>

            {/* Story Details */}
            <div className="lg:col-span-2">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
                  {story.genre && (
                    <Badge variant="outline" className="mb-4">
                      {story.genre}
                    </Badge>
                  )}
                </div>

                {story.isCompleted && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                    Complete
                  </Badge>
                )}
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {story.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{chapters.length || 0} chapters</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{story.followersCount || 0} followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{story.likesCount || 0} likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{story.viewsCount || 0} views</span>
                </div>
              </div>

              {/* Tags */}
              {story.tags && story.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {story.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-6">
                <Button 
                  onClick={startReading}
                  size="lg"
                  className="flex items-center gap-2"
                  disabled={chapters.length === 0}
                >
                  <Play className="w-4 h-4" />
                  {chapters.length === 0 
                    ? "No Chapters Available" 
                    : progress?.lastChapterIndex >= 0 
                    ? "Continue Reading" 
                    : "Start Reading"
                  }
                </Button>

                {isAuthenticated && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => likeMutation.mutate()}
                      disabled={likeMutation.isPending}
                      className={`flex items-center gap-2 ${story.isLiked ? "text-red-500 border-red-500" : ""}`}
                    >
                      <Heart className={`w-4 h-4 ${story.isLiked ? "fill-current" : ""}`} />
                      {story.likesCount || 0}
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      {story.isFollowing ? "Unfollow" : "Follow"}
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={() => bookmarkMutation.mutate()}
                      disabled={bookmarkMutation.isPending}
                    >
                      <Bookmark className={`w-4 h-4 ${story.isBookmarked ? "fill-current" : ""}`} />
                    </Button>

                    <div className="relative">
                      <Button 
                        variant="outline"
                        onClick={() => setShowReactions(!showReactions)}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>

                      {showReactions && (
                        <div className="absolute top-full mt-2 bg-popover border rounded-lg p-2 flex gap-1 z-10">
                          {reactions.map((reaction) => (
                            <Button
                              key={reaction.name}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(reaction.name)}
                              className={`p-2 ${reaction.color}`}
                            >
                              <reaction.icon className="w-4 h-4" />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button variant="outline">
                  <Share className="w-4 h-4" />
                </Button>
              </div>

              {/* Reading Progress */}
              {progress && (
                <div className="bg-card p-4 rounded-lg mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Reading Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress.progressPercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.progressPercentage}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last read: Chapter {(progress.lastChapterIndex || 0) + 1}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Chapters List */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Chapters ({chapters.length})</h2>
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No chapters published yet.</p>
                <p className="text-sm">Check back later for updates!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter: any, index: number) => (
                <Card 
                  key={chapter.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setCurrentChapterIndex(index);
                    setShowReader(true);
                    window.history.pushState({}, "", `/story/${storyId}/chapter/${chapter.id}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">
                          Chapter {index + 1}: {chapter.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{chapter.wordCount} words</span>
                          <span>{formatDistanceToNow(new Date(chapter.createdAt), { addSuffix: true })}</span>
                          {progress?.lastChapterIndex >= index && (
                            <Badge variant="secondary" className="text-xs">Read</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {chapter.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {chapter.commentsCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-8" />

          {/* Comments Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
              <Button 
                variant="outline"
                onClick={() => setShowComments(!showComments)}
              >
                {showComments ? "Hide" : "Show"} Comments
              </Button>
            </div>

            {showComments && (
              <div className="space-y-6">
                {/* Comment Form */}
                {isAuthenticated && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarImage src={getProfileImageUrl(user?.profileImageUrl)} />
                          <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts about this story..."
                            className="min-h-[80px]"
                          />
                          <div className="flex justify-end mt-3">
                            <Button 
                              onClick={handleComment}
                              disabled={!newComment.trim() || commentMutation.isPending}
                            >
                              {commentMutation.isPending ? "Posting..." : "Post Comment"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Avatar>
                            <AvatarImage src={getProfileImageUrl(comment.user?.profileImageUrl)} />
                            <AvatarFallback>{comment.user?.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{comment.user?.displayName}</span>
                              <span className="text-sm text-muted-foreground">
                                @{comment.user?.username}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{comment.content}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <button className="flex items-center gap-1 hover:text-primary">
                                <Heart className="w-3 h-3" />
                                {comment.likesCount}
                              </button>
                              <button className="hover:text-primary">Reply</button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}