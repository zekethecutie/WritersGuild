import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share,
  Crown,
  CheckCircle,
  Play,
  Music,
  Eye,
  MoreHorizontal,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Edit,
  Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { SpotifyTrackDisplay } from "@/components/spotify-track-display";
import { ImageGallery } from "@/components/image-gallery";
import type { Post, User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditPostModal from "@/components/edit-post-modal";


interface PostCardProps {
  post: Post & {
    author?: User;
    isLiked?: boolean;
    isBookmarked?: boolean;
    isReposted?: boolean;
  };
  showActions?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

function PostCard({
  post,
  showActions = true,
  onLike,
  onComment,
  onRepost,
  onBookmark,
  onShare
}: PostCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showFullContent, setShowFullContent] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Optimistic state for instant UI updates
  const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(post.likesCount || 0);
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(post.isBookmarked);
  const [optimisticReposted, setOptimisticReposted] = useState(post.isReposted);
  const [optimisticRepostsCount, setOptimisticRepostsCount] = useState(post.repostsCount || 0);

  // Create fallback author if none provided
  const authorId = post.authorId || 'unknown';
  const author = post.author || {
    id: authorId,
    email: null,
    password: null,
    displayName: `User ${authorId.slice(-4)}`,
    username: `user${authorId.slice(-4)}`,
    bio: null,
    location: null,
    website: null,
    profileImageUrl: null,
    coverImageUrl: null,
    isVerified: false,
    isAdmin: false,
    isSuperAdmin: false,
    userRole: 'reader',
    writingStreak: 0,
    wordCountGoal: 500,
    weeklyPostsGoal: 5,
    genres: [],
    preferredGenres: [],
    postsCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as User;

  const isOwnPost = user?.id === post.authorId;
  const canModerate = (user as any)?.isAdmin || (user as any)?.isSuperAdmin;

  // Add state to prevent rapid clicking
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to like posts",
        variant: "default",
      });
      return;
    }

    // Prevent rapid clicking
    if (isLiking) return;
    setIsLiking(true);

    // Instant optimistic update
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const endpoint = `/api/posts/${post.id}/like`;
      
      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
      });

      if (!response.ok) {
        // Revert on error
        setOptimisticLiked(wasLiked);
        setOptimisticLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
        throw new Error('Failed to like post');
      }

      onLike?.(post.id);
    } catch (error) {
      // Revert on error
      setOptimisticLiked(wasLiked);
      setOptimisticLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    } finally {
      // Allow clicking again after a small delay
      setTimeout(() => setIsLiking(false), 500);
    }
  };

  const [, navigate] = useLocation();

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to comment",
        variant: "default",
      });
      return;
    }
    navigate(`/post/${post.id}`);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to repost",
        variant: "default",
      });
      return;
    }

    // Instant optimistic update
    const wasReposted = optimisticReposted;
    setOptimisticReposted(!wasReposted);
    setOptimisticRepostsCount(prev => wasReposted ? prev - 1 : prev + 1);

    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Revert on error
        setOptimisticReposted(wasReposted);
        setOptimisticRepostsCount(prev => wasReposted ? prev + 1 : prev - 1);
        throw new Error('Failed to repost');
      }

      const result = await response.json();
      
      // Update based on server response
      if (result.reposted !== undefined) {
        setOptimisticReposted(result.reposted);
      }

      onRepost?.(post.id);
      toast({
        title: result.reposted ? "Reposted!" : "Repost removed",
        description: result.reposted ? "Post has been shared to your profile" : "Repost has been removed",
      });
    } catch (error) {
      console.error('Repost error:', error);
      toast({
        title: "Error",
        description: "Failed to repost",
        variant: "destructive",
      });
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to bookmark posts",
        variant: "default",
      });
      return;
    }

    // Instant optimistic update
    const wasBookmarked = optimisticBookmarked;
    setOptimisticBookmarked(!wasBookmarked);

    try {
      const response = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Revert on error
        setOptimisticBookmarked(wasBookmarked);
        throw new Error('Failed to bookmark post');
      }

      const result = await response.json();
      
      // Update based on server response
      if (result.bookmarked !== undefined) {
        setOptimisticBookmarked(result.bookmarked);
      }

      onBookmark?.(post.id);
      toast({
        title: result.bookmarked ? "Bookmarked!" : "Removed from bookmarks",
        description: result.bookmarked ? "Post saved to your bookmarks" : "Post removed from your bookmarks",
      });
    } catch (error) {
      console.error('Bookmark error:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark post",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || `Post by ${author.displayName}`,
          text: post.content.slice(0, 100) + (post.content.length > 100 ? '...' : ''),
          url: postUrl,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(postUrl);
        toast({
          title: "Link copied!",
          description: "Post link copied to clipboard",
        });
      } catch (error) {
        console.error('Copy error:', error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }

    onShare?.(post.id);
  };


  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Post deleted",
          description: "Your post has been deleted",
        });
        window.location.reload();
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  // Calculate read time from content if not available
  const calculateReadTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const readTime = post.readTimeMinutes || calculateReadTime(post.content);

  // Get cover image (use coverImageUrl or fallback to first imageUrl)
  const coverImage = post.coverImageUrl || (post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : null);

  // Get category badge color
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

  // Format publication date
  const formatPublishDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article className="border-b border-border bg-background group hover-elevate cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
      {/* Cover Image */}
      {coverImage && (
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <img
            src={coverImage}
            alt={post.title || 'Article cover'}
            className="w-full h-full object-cover"
            data-testid={`img-cover-${post.id}`}
          />
          
          {/* Category Badge overlaying cover */}
          {post.category && (
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className={`text-xs ${getCategoryColor(post.category)}`}>
                {post.category}
              </Badge>
            </div>
          )}

          {/* Edit/Delete buttons for own posts */}
          {(isOwnPost || canModerate) && (
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              {isOwnPost && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 text-xs text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Category Badge (if no cover image) */}
        {!coverImage && post.category && (
          <div className="mb-3">
            <Badge variant="secondary" className={`text-xs ${getCategoryColor(post.category)}`}>
              {post.category}
            </Badge>
          </div>
        )}

        {/* Edit/Delete buttons (if no cover image) */}
        {!coverImage && (isOwnPost || canModerate) && (
          <div className="flex items-center justify-end space-x-2 mb-3">
            {isOwnPost && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
              >
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </Button>
          </div>
        )}

        {/* Title */}
        <Link href={`/post/${post.id}`} onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-3 leading-tight hover:text-blue-600 transition-colors" data-testid={`text-title-${post.id}`}>
            {post.title || 'Untitled'}
          </h2>
        </Link>

        {/* Excerpt - fallback to truncated content if no excerpt */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`text-excerpt-${post.id}`}>
          {post.excerpt || post.content}
        </p>

        {/* Author Info + Metadata */}
        <div className="flex items-center space-x-3 mb-4">
          <Link 
            href={`/profile/${author.username}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getProfileImageUrl(author.profileImageUrl)}
              alt={`${author.displayName} profile`}
              className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              data-testid={`img-avatar-${author.id}`}
            />
          </Link>

          <div className="flex-1 flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
            <Link 
              href={`/profile/${author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-foreground transition-colors"
            >
              <span className="font-medium" data-testid={`text-username-${author.id}`}>
                {author.displayName}
              </span>
            </Link>
            
            {author.isVerified && (
              <CheckCircle className="w-3 h-3 text-blue-500" />
            )}
            
            <span>•</span>
            
            <time data-testid={`text-timestamp-${post.id}`}>
              {formatPublishDate(post.publishedAt || post.createdAt || new Date())}
            </time>
            
            <span>•</span>
            
            <span data-testid={`text-readtime-${post.id}`}>
              {readTime} min read
            </span>

            {(post.viewsCount || 0) > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span data-testid={`text-views-${post.id}`}>{(post.viewsCount || 0).toLocaleString()} views</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Spotify Integration (if present) */}
        {post.spotifyTrackData && typeof post.spotifyTrackData === 'object' && post.spotifyTrackData !== null && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <SpotifyTrackDisplay track={post.spotifyTrackData as any} size="sm" showPreview={false} />
          </div>
        )}

        {/* Additional Images (if not used as cover) */}
        {!post.coverImageUrl && post.imageUrls && post.imageUrls.length > 1 && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <ImageGallery images={post.imageUrls.slice(1)} />
          </div>
        )}
        {post.coverImageUrl && post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <ImageGallery images={post.imageUrls} />
          </div>
        )}

        {/* Engagement Actions - Smaller, less prominent */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 space-x-1 text-xs transition-colors ${optimisticLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={handleLike}
                data-testid={`button-like-${post.id}`}
              >
                <Heart className={`w-3.5 h-3.5 ${optimisticLiked ? 'fill-current' : ''}`} />
                <span>{optimisticLikesCount > 0 ? optimisticLikesCount.toLocaleString() : ''}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 space-x-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors"
                onClick={handleComment}
                data-testid={`button-comment-${post.id}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{(post.commentsCount || 0) > 0 ? (post.commentsCount || 0).toLocaleString() : ''}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 space-x-1 text-xs transition-colors ${optimisticReposted ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'}`}
                onClick={handleRepost}
                data-testid={`button-repost-${post.id}`}
              >
                <Repeat2 className="w-3.5 h-3.5" />
                <span>{optimisticRepostsCount > 0 ? optimisticRepostsCount.toLocaleString() : ''}</span>
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 transition-colors ${optimisticBookmarked ? 'text-blue-500 hover:text-blue-600' : 'text-muted-foreground hover:text-blue-500'}`}
                onClick={handleBookmark}
                data-testid={`button-bookmark-${post.id}`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${optimisticBookmarked ? 'fill-current' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={handleShare}
                data-testid={`button-share-${post.id}`}
              >
                <Share className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditPostModal
        post={post}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </article>
  );
}

export { PostCard };
export default PostCard;