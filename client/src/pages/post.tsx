
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import PostCard from "@/components/post-card";
import CommentThread from "@/components/comment-thread";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MessageSquare, 
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
          <CommentThread postId={postId!} />
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
