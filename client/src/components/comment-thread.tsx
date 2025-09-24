import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CommentComposer from "@/components/comment-composer";
import CommentTreeNode from "@/components/comment-tree-node";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, TrendingUp, Clock, Heart } from "lucide-react";
import type { Comment, User } from "@shared/schema";

interface CommentThreadProps {
  postId: string;
  initialCount?: number;
}

export default function CommentThread({ postId, initialCount = 0 }: CommentThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");

  // Fetch comments for the post
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest("POST", `/api/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
    },
    onError: () => {
      toast({
        title: "Failed to like comment",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Define tree comment type for better type safety
  type TreeComment = Comment & { 
    replies: TreeComment[];
    author?: User;
    isLiked?: boolean;
  };

  // Build comment tree
  const buildCommentTree = (comments2: Comment[]): TreeComment[] => {
    if (!Array.isArray(comments2)) return [];

    const commentMap = new Map<string, TreeComment>();
    const rootComments: TreeComment[] = [];

    // First pass: create all comment nodes
    (comments2 || []).forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build parent-child relationships
    comments2.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (!comment.parentId) {
        // Top-level comment
        rootComments.push(commentWithReplies);
      } else {
        // Reply - add to parent's replies
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      }
    });

    // Sort replies recursively
    const sortReplies = (comment: TreeComment) => {
      if (Array.isArray(comment.replies)) {
        comment.replies.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        comment.replies.forEach(sortReplies);
      }
    };

    rootComments.forEach(sortReplies);
    return rootComments;
  };

  const commentThreads = buildCommentTree(comments);

  // Sort threads based on selected option
  const sortedThreads = [...commentThreads].sort((a: TreeComment, b: TreeComment) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case "popular":
        return (b.likesCount || 0) - (a.likesCount || 0);
      case "newest":
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleLike = (commentId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like comments.",
        variant: "destructive",
      });
      return;
    }
    likeCommentMutation.mutate(commentId);
  };

  const handleReplySuccess = () => {
    setReplyingTo(null);
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
  };

  if (error) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 text-center">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Failed to load comments. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({comments.length})
        </h3>

        {comments.length > 0 && (
          <Tabs value={sortBy} onValueChange={(value: any) => setSortBy(value)} className="w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="newest" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Newest
              </TabsTrigger>
              <TabsTrigger value="popular" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="oldest" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Oldest
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Comment Composer */}
      <CommentComposer 
        postId={postId} 
        placeholder="Share your thoughts on this post..."
        compact={false}
      />

      {/* Comments List */}
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mx-auto mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      ) : comments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="font-medium mb-2">No comments yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to share your thoughts on this post!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {sortedThreads.map((comment) => (
            <div key={comment.id} className="bg-card rounded-lg border border-border/50">
              <div className="p-4">
                <CommentTreeNode
                  comment={comment}
                  level={0}
                  onReply={handleReply}
                  onLike={handleLike}
                  replyingTo={replyingTo}
                  postId={postId}
                  onReplySuccess={handleReplySuccess}
                  onReplyCancel={handleReplyCancel}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}