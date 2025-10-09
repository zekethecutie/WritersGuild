import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Users, 
  Heart, 
  Eye, 
  Share2,
  Bookmark,
  MessageSquare,
  Edit,
  Plus,
  ArrowLeft,
  ArrowRight,
  Crown,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";

// Placeholder for the new StoryDescription component
const StoryDescription = ({ description }: { description?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLines = 3; // Number of lines before "See more" is shown

  if (!description) return null;

  // Split description into lines
  const lines = description.split('\n');
  const isLong = lines.length > maxLines;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <div
        className="whitespace-pre-wrap text-muted-foreground leading-relaxed"
        style={{
          maxHeight: isExpanded ? 'none' : `calc(${maxLines} * 1.7em * 18px)`, // Approximate height based on maxLines, line-height, and font-size
          overflow: 'hidden',
        }}
      >
        {description}
      </div>
      {isLong && (
        <Button
          variant="link"
          className="p-0 h-auto text-sm"
          onClick={toggleExpand}
        >
          {isExpanded ? "See Less" : "See More"}
        </Button>
      )}
    </div>
  );
};


export default function StoryPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId?: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Determine if we're viewing a specific chapter
  const isChapterView = !!chapterId;

  // Fetch specific chapter when in chapter view
  const { 
    data: currentChapter, 
    isLoading: chapterLoading 
  } = useQuery({
    queryKey: ["/api/chapters", chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Chapter not found');
      return response.json();
    },
    enabled: !!chapterId,
  });

  // Fetch story/series data
  const { 
    data: story, 
    isLoading: storyLoading, 
    error: storyError 
  } = useQuery({
    queryKey: ["/api/series", id],
    queryFn: () => fetch(`/api/series/${id}`).then(res => {
      if (!res.ok) throw new Error('Story not found');
      return res.json();
    }),
    enabled: !!id,
  });

  // Fetch chapters
  const { 
    data: chapters = [], 
    isLoading: chaptersLoading 
  } = useQuery({
    queryKey: ["/api/series", id, "chapters"],
    queryFn: () => fetch(`/api/series/${id}/chapters`).then(res => res.json()),
    enabled: !!id,
  });

  // Fetch comments
  const { 
    data: comments = [], 
    isLoading: commentsLoading 
  } = useQuery({
    queryKey: ["/api/series", id, "comments"],
    queryFn: () => fetch(`/api/series/${id}/comments`).then(res => res.json()),
    enabled: !!id,
  });

  // Fetch reading progress
  const { data: progress } = useQuery({
    queryKey: ["/api/series", id, "progress"],
    queryFn: () => fetch(`/api/series/${id}/progress`).then(res => res.json()),
    enabled: !!id && !!isAuthenticated,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/series/${id}/follow`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id] });
      toast({
        title: "Success",
        description: story?.isFollowing ? "Unfollowed series" : "Following series",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/series/${id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id] });
      toast({
        title: "Success",
        description: story?.isLiked ? "Removed like" : "Liked series",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    },
  });

  // Comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/series/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        setNewComment("");
        queryClient.invalidateQueries({ queryKey: ["/api/series", id, "comments"] });
        toast({
          title: "Comment posted",
          description: "Your comment has been added to the story.",
        });
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (storyLoading || chaptersLoading) {
    return <LoadingScreen title="Loading Story..." subtitle="Fetching story details and chapters" />;
  }

  if (storyError || !story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Story not found</h2>
          <p className="text-muted-foreground mb-4">
            The story you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation("/series")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && story.author?.id === user?.id;
  const readingProgressPercentage = progress?.progressPercentage || 0;
  const lastChapterRead = progress?.lastChapterIndex || 0;

  // If we're viewing a specific chapter, show chapter reader
  if (isChapterView) {
    if (chapterLoading) {
      return <LoadingScreen title="Loading Chapter..." subtitle="Fetching chapter content" />;
    }

    if (!currentChapter) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Chapter not found</h2>
            <p className="text-muted-foreground mb-4">
              The chapter you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation(`/story/${id}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Story
            </Button>
          </div>
        </div>
      );
    }

    // Find current chapter index for navigation
    const currentChapterIndex = chapters.findIndex((ch: any) => ch.id === chapterId);
    const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
    const nextChapter = currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />

        <div className="lg:ml-64 min-h-screen">
          {/* Chapter header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
            <div className="flex items-center gap-4 p-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation(`/story/${id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Story
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold truncate">
                  Chapter {currentChapter.chapterNumber}: {currentChapter.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {story.title} by {story.author?.displayName || "Unknown Author"}
                </p>
              </div>
            </div>
          </div>

          {/* Chapter content */}
          <div className="max-w-4xl mx-auto p-6">
            <Card>
              <CardContent className="p-8">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h1 className="text-3xl font-bold mb-8">
                    Chapter {currentChapter.chapterNumber}: {currentChapter.title}
                  </h1>
                  <div 
                    className="text-foreground leading-relaxed"
                    style={{ fontSize: '18px', lineHeight: '1.7' }}
                  >
                    {currentChapter.content.includes('<') ? (
                      <div dangerouslySetInnerHTML={{ __html: currentChapter.content }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{currentChapter.content}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chapter navigation */}
            <div className="flex justify-between items-center mt-8">
              <div>
                {prevChapter && (
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/story/${id}/chapter/${prevChapter.id}`)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous Chapter
                  </Button>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Chapter {currentChapterIndex + 1} of {chapters.length}
                </p>
              </div>
              <div>
                {nextChapter && (
                  <Button
                    onClick={() => setLocation(`/story/${id}/chapter/${nextChapter.id}`)}
                    className="flex items-center gap-2"
                  >
                    Next Chapter
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <MobileNav />
      </div>
    );
  }

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
              onClick={() => setLocation("/series")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Stories
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold truncate">{story.title}</h1>
              <p className="text-sm text-muted-foreground">
                by {story.author?.displayName || "Unknown Author"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Story header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Cover image */}
                    <div className="w-32 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      {story.coverImageUrl ? (
                        <img 
                          src={story.coverImageUrl} 
                          alt={story.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>

                    {/* Story info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar 
                              className="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setLocation(`/profile/${story.author?.username}`)}
                            >
                              <AvatarImage src={getProfileImageUrl(story.author?.profileImageUrl)} />
                              <AvatarFallback>{story.author?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">
                              by <span 
                                className="hover:underline cursor-pointer"
                                onClick={() => setLocation(`/profile/${story.author?.username}`)}
                              >
                                {story.author?.displayName || "Unknown Author"}
                              </span>
                            </span>
                            {story.author?.isVerified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          {story.genre && (
                            <Badge variant="outline" className="mb-3">
                              {story.genre}
                            </Badge>
                          )}
                        </div>
                        {isOwner && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/series/${id}/edit`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {chapters.length} chapters
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {story.followersCount || 0} followers
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {story.likesCount || 0} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {story.viewsCount || 0} views
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3">
                        {chapters.length > 0 ? (
                          <Button 
                            size="lg" 
                            className="flex-1"
                            onClick={() => {
                              const targetChapter = chapters[lastChapterRead] || chapters[0];
                              if (targetChapter?.id) {
                                setLocation(`/story/${id}/chapter/${targetChapter.id}`);
                              }
                            }}
                          >
                            {readingProgressPercentage > 0 ? "Continue Reading" : "Start Reading"}
                          </Button>
                        ) : (
                          <Button size="lg" className="flex-1" disabled>
                            No Chapters Available
                          </Button>
                        )}

                        {isAuthenticated && !isOwner && (
                          <>
                            <Button 
                              variant="outline"
                              onClick={() => followMutation.mutate()}
                              disabled={followMutation.isPending}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {story.isFollowing ? "Unfollow" : "Follow"}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => likeMutation.mutate()}
                              disabled={likeMutation.isPending}
                            >
                              <Heart className={`w-4 h-4 mr-2 ${story.isLiked ? "fill-current text-red-500" : ""}`} />
                              {story.isLiked ? "Liked" : "Like"}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Reading progress */}
                      {isAuthenticated && readingProgressPercentage > 0 && (
                        <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Reading Progress</span>
                            <span>{readingProgressPercentage}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${readingProgressPercentage}%` }} 
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last read: Chapter {lastChapterRead + 1}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {story.description && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <div className="text-muted-foreground leading-relaxed">
                        <StoryDescription description={story.description} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for chapters and comments */}
              <Tabs defaultValue="chapters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="chapters">
                    Chapters ({chapters.length})
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    Comments ({Array.isArray(comments) ? comments.length : 0})
                  </TabsTrigger>
                  <TabsTrigger value="conversations">
                    Conversations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chapters" className="space-y-4">
                  {chapters.length > 0 ? (
                    <div className="space-y-3">
                      {chapters.map((chapter: any, index: number) => (
                        <Card 
                          key={chapter.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setLocation(`/story/${id}/chapter/${chapter.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">
                                  Chapter {chapter.chapterNumber}: {chapter.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {chapter.wordCount} words • {formatDistanceToNow(new Date(chapter.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              {index === lastChapterRead && readingProgressPercentage > 0 && (
                                <Badge variant="secondary">Currently Reading</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {isOwner && (
                        <Card className="border-dashed">
                          <CardContent className="p-4 text-center">
                            <Button 
                              variant="outline" 
                              onClick={() => setLocation(`/story/${id}/edit`)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add New Chapter
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No chapters published yet.</h3>
                      <p className="text-muted-foreground mb-4">
                        {isOwner ? "Start writing your first chapter!" : "Check back later for updates!"}
                      </p>
                      {isOwner && (
                        <Button onClick={() => setLocation(`/story/${id}/edit`)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Write First Chapter
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="conversations" className="space-y-4">
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Will be available soon</h3>
                    <p className="text-muted-foreground">
                      Community conversations feature is currently under development
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  {/* Comment form */}
                  {isAuthenticated && (
                    <Card>
                      <CardContent className="p-4">
                        <form onSubmit={handleCommentSubmit} className="space-y-3">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts about this story..."
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button 
                              type="submit" 
                              disabled={!newComment.trim() || isSubmittingComment}
                            >
                              {isSubmittingComment ? "Posting..." : "Post Comment"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Comments list */}
                  {Array.isArray(comments) && comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment: any) => (
                        <Card key={comment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={getProfileImageUrl(comment.author?.profileImageUrl)} />
                                <AvatarFallback>{comment.author?.displayName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{comment.author?.displayName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
                      <p className="text-muted-foreground">
                        {isAuthenticated ? "Be the first to comment on this story!" : "Sign in to leave a comment."}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Author info */}
              <Card>
                <CardHeader>
                  <CardTitle>About the Author</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar 
                      className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLocation(`/profile/${story.author?.username}`)}
                    >
                      <AvatarImage src={getProfileImageUrl(story.author?.profileImageUrl)} />
                      <AvatarFallback>{story.author?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium hover:underline cursor-pointer"
                          onClick={() => setLocation(`/profile/${story.author?.username}`)}
                        >
                          {story.author?.displayName}
                        </span>
                        {story.author?.isVerified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p 
                        className="text-sm text-muted-foreground hover:underline cursor-pointer"
                        onClick={() => setLocation(`/profile/${story.author?.username}`)}
                      >
                        @{story.author?.username}
                      </p>
                    </div>
                  </div>
                  {story.author?.bio && (
                    <p className="text-sm text-muted-foreground">{story.author.bio}</p>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => setLocation(`/profile/${story.author?.username}`)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Story stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Story Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Published</span>
                    <span>{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={story.isCompleted ? "default" : "secondary"}>
                      {story.isCompleted ? "Completed" : "Ongoing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chapters</span>
                    <span>{chapters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Words</span>
                    <span>
                      {chapters.reduce((total: number, chapter: any) => total + (chapter.wordCount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {story.tags && story.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {story.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}