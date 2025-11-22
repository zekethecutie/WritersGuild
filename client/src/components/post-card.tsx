import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock, MoreVertical, Edit, Trash2, Eye, UserPlus, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { getProfileImageUrl } from "@/lib/defaultImages";
import type { Post, User } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import EditPostModal from "@/components/edit-post-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";


interface PostCardProps {
  post: Post & {
    author?: User;
    collaborators?: User[];
  };
  isLiked?: boolean;
  likesCount?: number;
  isBookmarked?: boolean;
  isReposted?: boolean;
  repostsCount?: number;
}

function PostCard({ post, isLiked, likesCount, isBookmarked, isReposted, repostsCount }: PostCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // State for modal and delete dialog
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked || false);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(likesCount || 0);
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(isBookmarked || false);
  const [optimisticReposted, setOptimisticReposted] = useState(isReposted || false);
  const [optimisticRepostsCount, setOptimisticRepostsCount] = useState(repostsCount || 0);

  // Calculate read time
  const calculateReadTime = (content: string | undefined | null) => {
    if (!content) return 1;
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  };

  const readTime = calculateReadTime(post.content);

  // Get cover image
  const coverImage = post.coverImageUrl || (post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : null);

  // Format publication date
  const formatPublishDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCardClick = () => {
    navigate(`/post/${post.id}`);
  };

  const getCategoryColor = (category?: string) => {
    switch(category?.toLowerCase()) {
      case 'literary': return 'bg-purple-500 dark:bg-purple-700 text-white';
      case 'news': return 'bg-blue-500 dark:bg-blue-700 text-white';
      case 'opinion': return 'bg-orange-500 dark:bg-orange-700 text-white';
      case 'personal column': return 'bg-pink-500 dark:bg-pink-700 text-white';
      case 'culture': return 'bg-teal-500 dark:bg-teal-700 text-white';
      case 'technology': return 'bg-green-500 dark:bg-green-700 text-white';
      default: return 'bg-gray-500 dark:bg-gray-700 text-white';
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "Your article has been permanently removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });


  return (
    <Card
      className="overflow-hidden cursor-pointer hover-elevate transition-all border-border post-card-hover"
      onClick={handleCardClick}
      data-testid={`card-post-${post.id}`}
    >
      {/* Cover Image with Category Badge */}
      {coverImage && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '21/9' }}>
          <img
            src={coverImage}
            alt={post.title || 'Article cover'}
            className="w-full h-full object-cover"
            data-testid={`img-cover-${post.id}`}
          />
          {post.category && (
            <Badge
              className={`absolute top-4 left-4 ${getCategoryColor(post.category)} font-semibold`}
              data-testid={`badge-category-${post.id}`}
            >
              {post.category}
            </Badge>
          )}
        </div>
      )}

      <div className="p-6 space-y-3">
        {/* Category badge when no cover image */}
        {!coverImage && post.category && (
          <Badge
            className={`${getCategoryColor(post.category)} font-semibold`}
            data-testid={`badge-category-${post.id}`}
          >
            {post.category}
          </Badge>
        )}
        {/* Title - Frontman style (larger, more prominent) */}
        <h2 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2" data-testid={`text-title-${post.id}`}>
          {post.title || 'Untitled'}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-excerpt-${post.id}`}>
            {post.excerpt}
          </p>
        )}

        {/* Author Info & Metadata - Frontman style */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage
                src={getProfileImageUrl(author.profileImageUrl)}
                alt={author.displayName}
              />
              <AvatarFallback className="text-xs">
                {author.displayName?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <span className="font-medium text-foreground truncate" data-testid={`text-author-${post.id}`}>
                {author.displayName}
                {post.collaborators && post.collaborators.length > 0 && (
                  <span>
                    {post.collaborators.map((collab, idx) => (
                      <span key={collab.id}> & {collab.displayName}</span>
                    ))}
                  </span>
                )}
              </span>
              {author.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span data-testid={`text-readtime-${post.id}`}>
              {readTime} min read
            </span>
            <span>•</span>
            <time data-testid={`text-date-${post.id}`}>
              {formatPublishDate(post.publishedAt || post.createdAt || new Date())}
            </time>
          </div>
        </div>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your article
              "{post.title || 'Untitled'}" and remove all associated data including comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(post.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Article"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export { PostCard };
export default PostCard;