import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageCircle, X } from "lucide-react";

interface CommentComposerProps {
  postId: string;
  parentId?: string;
  replyingTo?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export default function CommentComposer({ 
  postId, 
  parentId, 
  replyingTo,
  onCancel, 
  onSuccess,
  placeholder = "Write a thoughtful comment...",
  compact = false
}: CommentComposerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(!compact);

  const createCommentMutation = useMutation({
    mutationFn: async () => {
      if (parentId) {
        // Creating a reply
        return apiRequest("POST", `/api/comments/${parentId}/reply`, {
          content: content.trim(),
          postId
        });
      } else {
        // Creating a top-level comment
        return apiRequest("POST", `/api/posts/${postId}/comments`, {
          content: content.trim()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Comment posted!",
        description: parentId ? "Your reply has been added." : "Your comment has been posted.",
      });
      setContent("");
      setIsExpanded(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sign in required",
          description: "Please sign in to comment on posts.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to post comment",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Comment required",
        description: "Please write a comment before posting.",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 1000) {
      toast({
        title: "Comment too long",
        description: "Comments must be 1000 characters or less.",
        variant: "destructive",
      });
      return;
    }

    createCommentMutation.mutate();
  };

  const handleCancel = () => {
    setContent("");
    setIsExpanded(false);
    onCancel?.();
  };

  if (!user) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 text-center">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Sign in to join the conversation
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = "/api/login"}
          >
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact && !isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="text-muted-foreground hover:text-foreground w-full justify-start"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {parentId ? `Reply to ${replyingTo || "comment"}` : "Add a comment..."}
      </Button>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <img
            src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={`${user.displayName} profile`}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            {replyingTo && (
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span>Replying to {replyingTo}</span>
                {onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-auto p-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
            
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="min-h-[80px] resize-none border-border/50 focus:border-primary"
              disabled={createCommentMutation.isPending}
            />
            
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                {content.length}/1000 characters
              </div>
              
              <div className="flex space-x-2">
                {compact && onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={createCommentMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || createCommentMutation.isPending || content.length > 1000}
                  size="sm"
                >
                  {createCommentMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {parentId ? "Reply" : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}