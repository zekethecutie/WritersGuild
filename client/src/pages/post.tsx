
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import PostCard from "@/components/post-card";
import CommentCard from "@/components/comment-card";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MessageSquare, 
  Send,
  AlertCircle
} from "lucide-react";
import type { Post, Comment, User } from "@shared/schema";

export default function PostPage() {
  const [match, params] = useRoute("/post/:id");
  const postId = params?.id;
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch post
  const { 
    data: post, 
    isLoading: postLoading, 
    error: postError 
  } = useQuery({
    queryKey: ["/api/posts", postId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Post not found');
      }
      return response.json();
    },
    enabled: !!postId,
  });

  // Fetch comments
  const { 
    data: comments = [], 
    isLoading: commentsLoading 
  } = useQuery({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      });
      return response.json();
    },
    enabled: !!postId,
  });

  // Comment submission mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      setNewComment("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added to the post.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Comment like mutation
  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest("POST", `/api/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;

    setIsSubmittingComment(true);
    commentMutation.mutate(newComment.trim());
    setIsSubmittingComment(false);
  };

  const handleCommentLike = (commentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to like comments",
        variant: "default",
      });
      return;
    }
    commentLikeMutation.mutate(commentId);
  };

  if (postLoading) {
    return <LoadingScreen title="Loading Post..." subtitle="Fetching post details" />;
  }

  if (postError || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Post Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The post you're looking for doesn't exist or may have been removed.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setLocation("/")}>
                Go Home
              </Button>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
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
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center gap-4 p-4 max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Post</h1>
              <p className="text-sm text-muted-foreground">
                by {post.author?.displayName || "Unknown Author"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Post */}
          <div className="mb-8">
            <PostCard 
              post={post} 
              showActions={true}
              onComment={() => {}} // Already on post page
            />
          </div>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments ({Array.isArray(comments) ? comments.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comment form */}
              {isAuthenticated ? (
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this post..."
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!newComment.trim() || isSubmittingComment || commentMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {commentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">
                    Sign in to join the conversation
                  </p>
                  <Button onClick={() => setLocation("/")}>
                    Sign In
                  </Button>
                </div>
              )}

              <Separator />

              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-3 bg-muted rounded w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(comments) && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: Comment & { author?: User; isLiked?: boolean }) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      onLike={handleCommentLike}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
                  <p className="text-muted-foreground">
                    {isAuthenticated ? "Be the first to comment on this post!" : "Sign in to leave a comment."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
