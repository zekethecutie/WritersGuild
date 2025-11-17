
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import CommentThread from "@/components/comment-thread";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  AlertCircle,
  Heart,
  Bookmark,
  Share,
  MessageCircle,
  Repeat2,
  CheckCircle,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import { getProfileImageUrl } from "@/lib/defaultImages";
import type { Post, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function PostPage() {
  const [match, params] = useRoute("/post/:id");
  const postId = params?.id;
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimistic states
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(0);
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(false);
  const [optimisticReposted, setOptimisticReposted] = useState(false);
  const [optimisticRepostsCount, setOptimisticRepostsCount] = useState(0);
  
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

  // Initialize optimistic states when post data loads
  useEffect(() => {
    if (post) {
      setOptimisticLiked(post.isLiked || false);
      setOptimisticLikesCount(post.likesCount || 0);
      setOptimisticBookmarked(post.isBookmarked || false);
      setOptimisticReposted(post.isReposted || false);
      setOptimisticRepostsCount(post.repostsCount || 0);
    }
  }, [post]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to like post');
      return response.json();
    },
    onMutate: async ({ isLiked }) => {
      // Optimistic update
      setOptimisticLiked(!isLiked);
      setOptimisticLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    },
    onError: (error, { isLiked }) => {
      // Revert on error
      setOptimisticLiked(isLiked);
      setOptimisticLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      toast({
        title: "Error",
        description: "Failed to like article",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to bookmark post');
      return response.json();
    },
    onMutate: async ({ isBookmarked }) => {
      setOptimisticBookmarked(!isBookmarked);
    },
    onError: (error, { isBookmarked }) => {
      setOptimisticBookmarked(isBookmarked);
      toast({
        title: "Error",
        description: "Failed to bookmark article",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "bookmarks"] });
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to repost');
      return response.json();
    },
    onMutate: async () => {
      const wasReposted = optimisticReposted;
      setOptimisticReposted(!wasReposted);
      setOptimisticRepostsCount(prev => wasReposted ? prev - 1 : prev + 1);
      return { wasReposted };
    },
    onError: (error, variables, context) => {
      if (context) {
        setOptimisticReposted(context.wasReposted);
        setOptimisticRepostsCount(prev => context.wasReposted ? prev + 1 : prev - 1);
      }
      toast({
        title: "Error",
        description: "Failed to repost article",
        variant: "destructive",
      });
    },
    onSuccess: (result) => {
      if (result.reposted !== undefined) {
        setOptimisticReposted(result.reposted);
      }
      toast({
        title: result.reposted ? "Reposted" : "Repost removed",
        description: result.reposted ? "Article has been shared to your followers" : "Repost has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  // Engagement handlers
  const handleLike = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to like articles",
        variant: "default",
      });
      return;
    }
    likeMutation.mutate({ postId: postId!, isLiked: optimisticLiked });
  };

  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to bookmark articles",
        variant: "default",
      });
      return;
    }
    bookmarkMutation.mutate({ postId: postId!, isBookmarked: optimisticBookmarked });
  };

  const handleRepost = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to repost",
        variant: "default",
      });
      return;
    }
    repostMutation.mutate(postId!);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Article link copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  if (postLoading) {
    return <LoadingScreen title="Loading Article..." subtitle="Fetching article content" />;
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
            <h2 className="text-2xl font-bold mb-3">Article Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The article you're looking for doesn't exist or may have been removed.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
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

  const author = post.author || {} as User;
  const coverImage = post.coverImageUrl || (post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : null);
  
  const getCategoryColor = (category?: string) => {
    switch(category?.toLowerCase()) {
      case 'literary': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'news': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'opinion': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'culture': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'technology': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const calculateReadTime = (content: string | undefined | null) => {
    if (!content) return 1;
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  };

  const readTime = calculateReadTime(post.content);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        {/* Header - Simple Back Button */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>

        {/* Article Content Container */}
        <div className="max-w-4xl mx-auto p-6">
          <article className="mb-12">
            {/* Category & Metadata Badges */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {post.category && (
                <Badge variant="secondary" className="text-xs">
                  {post.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {readTime} min read
              </Badge>
              {(post.viewsCount || 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {(post.viewsCount || 0).toLocaleString()} views
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight" data-testid="text-article-title">
              {post.title || 'Untitled'}
            </h1>

            {/* Author & Publish Date */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
              <Link href={`/profile/${author.username}`}>
                <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarImage src={getProfileImageUrl(author.profileImageUrl)} alt={author.displayName} />
                  <AvatarFallback>{author.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1">
                <Link
                  href={`/profile/${author.username}`}
                  className="hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base" data-testid="text-author-name">
                      {author.displayName || 'Unknown Author'}
                    </span>
                    {author.isVerified && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <time data-testid="text-publish-date">
                    {post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : 'Draft'}
                  </time>
                </div>
              </div>
            </div>

            {/* Cover Image (if present) */}
            {coverImage && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img
                  src={coverImage}
                  alt={post.title || 'Article cover'}
                  className="w-full h-auto object-cover"
                  data-testid="img-article-cover"
                />
              </div>
            )}

            {/* Article Content - Prose Styling */}
            <div 
              className="prose prose-lg dark:prose-invert max-w-none mb-12"
              data-testid="article-content"
            >
              <div 
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {/* Engagement Actions */}
            <Separator className="my-8" />
            
            <div className="flex items-center justify-between py-4 flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className={`space-x-2 ${optimisticLiked ? 'text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950' : ''}`}
                  onClick={handleLike}
                  disabled={likeMutation.isPending}
                  data-testid="button-like-footer"
                >
                  <Heart className={`w-4 h-4 ${optimisticLiked ? 'fill-current' : ''}`} />
                  <span>{optimisticLikesCount > 0 ? optimisticLikesCount.toLocaleString() : 'Like'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className={`space-x-2 ${optimisticReposted ? 'text-green-500 border-green-500 hover:bg-green-50 dark:hover:bg-green-950' : ''}`}
                  onClick={handleRepost}
                  disabled={repostMutation.isPending}
                  data-testid="button-repost"
                >
                  <Repeat2 className="w-4 h-4" />
                  <span>{optimisticRepostsCount > 0 ? optimisticRepostsCount.toLocaleString() : 'Repost'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className={`space-x-2 ${optimisticBookmarked ? 'text-blue-500 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950' : ''}`}
                  onClick={handleBookmark}
                  disabled={bookmarkMutation.isPending}
                  data-testid="button-bookmark-footer"
                >
                  <Bookmark className={`w-4 h-4 ${optimisticBookmarked ? 'fill-current' : ''}`} />
                  <span>Bookmark</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="space-x-2"
                  onClick={handleShare}
                  data-testid="button-share-footer"
                >
                  <Share className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              </div>
            </div>
          </article>

          <Separator className="my-8" />

          {/* Comments Section */}
          <div id="comments-section">
            <h2 className="text-2xl font-bold mb-6">Comments</h2>
            <CommentThread postId={postId!} />
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
