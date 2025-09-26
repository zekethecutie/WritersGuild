import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { getProfileImageUrl } from "@/lib/defaultImages";
import SpotifyPlayer from "@/components/spotify-player";
import ImageGallery from "@/components/image-gallery";
import type { Post, User } from "@shared/schema";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [showFullContent, setShowFullContent] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Create fallback author if none provided
  const author = post.author || {
    id: post.authorId,
    email: null,
    password: null,
    displayName: `User ${post.authorId.slice(-4)}`,
    username: `user${post.authorId.slice(-4)}`,
    bio: null,
    location: null,
    website: null,
    profileImageUrl: null,
    coverImageUrl: null,
    isVerified: false,
    isAdmin: false,
    isSuperAdmin: false,
    writingStreak: 0,
    wordCountGoal: 500,
    weeklyPostsGoal: 5,
    genres: [],
    postsCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as User;

  const isOwnPost = user?.id === post.authorId;
  const canModerate = user?.isAdmin || user?.isSuperAdmin;

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to like posts",
        variant: "default",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        onLike?.(post.id);
        window.location.reload();
      }
    } catch (error) {
      console.error('Like error:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const handleComment = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to comment",
        variant: "default",
      });
      return;
    }
    window.location.href = `/post/${post.id}`;
  };

  const handleRepost = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to repost",
        variant: "default",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        onRepost?.(post.id);
        toast({
          title: "Reposted!",
          description: "Post has been shared to your profile",
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Repost error:', error);
      toast({
        title: "Error",
        description: "Failed to repost",
        variant: "destructive",
      });
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to bookmark posts",
        variant: "default",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        onBookmark?.(post.id);
        toast({
          title: post.isBookmarked ? "Removed from bookmarks" : "Bookmarked!",
          description: post.isBookmarked ? "Post removed from your bookmarks" : "Post saved to your bookmarks",
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark post",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
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

  // Truncate content if it's too long
  const shouldTruncate = post.content.length > 300;
  const displayContent = shouldTruncate && !showFullContent 
    ? post.content.slice(0, 300) + "..." 
    : post.content;

  const getPostTypeLabel = (type: string) => {
    switch(type) {
      case 'poetry': return 'Poetry';
      case 'story': return 'Story';
      case 'challenge': return 'Challenge';
      default: return null;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch(type) {
      case 'poetry': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'story': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'challenge': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <article className="border-b border-border bg-background group">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <Link href={`/profile/${author.username}`}>
            <img
              src={getProfileImageUrl(author.profileImageUrl)}
              alt={`${author.displayName} profile`}
              className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              data-testid={`img-avatar-${author.id}`}
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <Link href={`/profile/${author.username}`}>
                <div className="flex items-center space-x-2 hover:underline">
                  <h3 className="font-semibold text-base" data-testid={`text-username-${author.id}`}>
                    {author.displayName}
                  </h3>
                  {author.isVerified && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                  {author.isAdmin && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </Link>
              
              <span className="text-muted-foreground text-sm">
                @{author.username}
              </span>
              
              <span className="text-muted-foreground text-sm">•</span>
              
              <time className="text-muted-foreground text-sm" data-testid={`text-timestamp-${post.id}`}>
                {formatDistanceToNow(post.createdAt ? new Date(post.createdAt) : new Date(), { addSuffix: true })}
              </time>
            </div>

            {/* Post type and genre badges */}
            <div className="flex items-center gap-2 mb-2">
              {getPostTypeLabel(post.postType) && (
                <Badge variant="secondary" className={`text-xs ${getPostTypeColor(post.postType)}`}>
                  {getPostTypeLabel(post.postType)}
                </Badge>
              )}
              {post.genre && (
                <Badge variant="outline" className="text-xs">
                  {post.genre}
                </Badge>
              )}
              {post.isPrivate && (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            
            <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              {isOwnPost && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted rounded-t-lg"
                  >
                    Edit Post
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muted"
                  >
                    Delete Post
                  </button>
                  <div className="border-t border-border"></div>
                </>
              )}
              {canModerate && !isOwnPost && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muted"
                >
                  Moderate Delete
                </button>
              )}
              <button
                onClick={() => window.open(`/post/${post.id}`, '_blank')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                View Post
              </button>
              <button
                onClick={handleShare}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted rounded-b-lg"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <h2 className="text-xl font-bold mb-3 leading-tight" data-testid={`text-title-${post.id}`}>
            {post.title}
          </h2>
        )}

        {/* Content */}
        <div className="mb-4">
          <div 
            className="text-foreground text-base leading-relaxed whitespace-pre-wrap break-words max-w-none"
            data-testid={`text-content-${post.id}`}
            style={{ 
              fontSize: '16px', 
              lineHeight: '1.6',
              color: 'var(--foreground)'
            }}
          >
            {post.content.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: displayContent }} />
            ) : (
              <div>{displayContent}</div>
            )}
          </div>
          {shouldTruncate && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-blue-500 hover:text-blue-600 mt-2"
              onClick={() => setShowFullContent(!showFullContent)}
              data-testid={`button-toggle-content-${post.id}`}
            >
              {showFullContent ? "Show less" : "Show more"}
            </Button>
          )}
        </div>

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mb-4">
            <ImageGallery 
              images={post.imageUrls} 
            />
          </div>
        )}

        {/* Spotify Integration */}
        {post.spotifyTrackData && (
          <div className="mb-4">
            <SpotifyPlayer track={post.spotifyTrackData} />
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center space-x-6 text-muted-foreground text-sm mb-4">
          {(post.viewsCount || 0) > 0 && (
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span data-testid={`text-views-${post.id}`}>{(post.viewsCount || 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 space-x-2 transition-colors ${post.isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={handleLike}
                data-testid={`button-like-${post.id}`}
              >
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                <span>{(post.likesCount || 0).toLocaleString()}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 space-x-2 text-muted-foreground hover:text-blue-500 transition-colors"
                onClick={handleComment}
                data-testid={`button-comment-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{(post.commentsCount || 0).toLocaleString()}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 space-x-2 transition-colors ${post.isReposted ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'}`}
                onClick={handleRepost}
                data-testid={`button-repost-${post.id}`}
              >
                <Repeat2 className="w-4 h-4" />
                <span>{(post.repostsCount || 0).toLocaleString()}</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 transition-colors ${post.isBookmarked ? 'text-blue-500 hover:text-blue-600' : 'text-muted-foreground hover:text-blue-500'}`}
                onClick={handleBookmark}
                data-testid={`button-bookmark-${post.id}`}
              >
                <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={handleShare}
                data-testid={`button-share-${post.id}`}
              >
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </article>
  );
}

export default PostCard;
export { PostCard };