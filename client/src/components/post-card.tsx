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
import SpotifyPlayer from "@/components/spotify-player";
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
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content || "");
  const [editGenre, setEditGenre] = useState(post.genre || "");
  const [isEditing, setIsEditing] = useState(false);
  
  // Optimistic state for instant UI updates
  const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(post.likesCount || 0);
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(post.isBookmarked);
  const [optimisticReposted, setOptimisticReposted] = useState(post.isReposted);
  const [optimisticRepostsCount, setOptimisticRepostsCount] = useState(post.repostsCount || 0);

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
    profileImageUrl: post.author?.profileImageUrl || null,
    coverImageUrl: null,
    isVerified: post.author?.isVerified || false,
    isAdmin: post.author?.isAdmin || false,
    isSuperAdmin: post.author?.isSuperAdmin || false,
    userRole: post.author?.userRole || 'reader',
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

    // Instant optimistic update
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const endpoint = wasLiked ? `/api/posts/${post.id}/like` : `/api/posts/${post.id}/like`;
      
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
      console.error('Like error:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
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

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          genre: editGenre,
        }),
      });

      if (response.ok) {
        toast({
          title: "Post updated",
          description: "Your post has been updated successfully",
        });
        setShowEditModal(false);
        window.location.reload();
      } else {
        throw new Error('Failed to update post');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
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
  const displayContent: string = shouldTruncate && !showFullContent
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
              
              {(author as any)?.userRole && (
                <Badge variant="outline" className="text-xs">
                  {(author as any).userRole === 'writer' ? 'Writer' : 'Reader'}
                </Badge>
              )}

              <span className="text-muted-foreground text-sm">
                @{author.username}
              </span>

              {/* Instagram-style collaborators display */}
              {(post as any).collaborators && (post as any).collaborators.length > 0 && (
                <>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm">with</span>
                  {(post as any).collaborators.map((collaborator: any, index: number) => (
                    <span key={collaborator.id || index} className="text-sm">
                      <Link href={`/profile/${collaborator.username}`} className="text-blue-500 hover:underline">
                        @{collaborator.username}
                      </Link>
                      {index < (post as any).collaborators.length - 1 && <span className="text-muted-foreground">, </span>}
                    </span>
                  ))}
                </>
              )}

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

          {(isOwnPost || canModerate) && (
            <div className="flex items-center space-x-2">
              {isOwnPost && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setShowEditModal(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-red-500 hover:text-red-700"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </>
              )}
              {canModerate && !isOwnPost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-red-500 hover:text-red-700"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
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
              <span>{displayContent}</span>
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
        {post.spotifyTrackData && typeof post.spotifyTrackData === 'object' && post.spotifyTrackData !== null && (
          <div className="mb-4">
            <SpotifyPlayer track={post.spotifyTrackData as any} />
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
                className={`h-8 space-x-2 transition-colors ${optimisticLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={handleLike}
                data-testid={`button-like-${post.id}`}
              >
                <Heart className={`w-4 h-4 ${optimisticLiked ? 'fill-current' : ''}`} />
                <span>{optimisticLikesCount.toLocaleString()}</span>
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
                className={`h-8 space-x-2 transition-colors ${optimisticReposted ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'}`}
                onClick={handleRepost}
                data-testid={`button-repost-${post.id}`}
              >
                <Repeat2 className="w-4 h-4" />
                <span>{optimisticRepostsCount.toLocaleString()}</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 transition-colors ${optimisticBookmarked ? 'text-blue-500 hover:text-blue-600' : 'text-muted-foreground hover:text-blue-500'}`}
                onClick={handleBookmark}
                data-testid={`button-bookmark-${post.id}`}
              >
                <Bookmark className={`w-4 h-4 ${optimisticBookmarked ? 'fill-current' : ''}`} />
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

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title (optional)</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What's on your mind?"
                className="min-h-[120px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <Select value={editGenre} onValueChange={setEditGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="poetry">Poetry</SelectItem>
                  <SelectItem value="drama">Drama</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="sci-fi">Science Fiction</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="biography">Biography</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
              >
                {isEditing ? "Updating..." : "Update Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export { PostCard };
export default PostCard;