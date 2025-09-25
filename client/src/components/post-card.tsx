import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useGuestPermissions } from "@/hooks/useGuestPermissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import SpotifyPlayer from "@/components/spotify-player";
import ImageGallery from "@/components/image-gallery";
import PostDownload from "@/components/post-download";
import SavePostImage from "@/components/save-post-image";
import CommentThread from "@/components/comment-thread";
import ReportPostButton from "@/components/report-post-button";
import RichTextEditor from "@/components/rich-text-editor";
import SpotifyPlayer from "@/components/spotify-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  MoreHorizontal,
  Quote,
  Clock,
  Eye,
  Crown,
  CheckCircle,
  Trash2,
  Edit,
  Type,
  Music,
  Image as ImageIcon
} from "lucide-react";
import type { Post, User } from "@shared/schema";
import { getProfileImageUrl } from "@/lib/defaultImages";
import AuthDialog from "@/components/auth-dialog";
import FollowButton from "@/components/follow-button";

interface PostCardProps {
  post: Post & {
    author?: User;
    isLiked?: boolean;
    isBookmarked?: boolean;
    isReposted?: boolean;
  };
}

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const permissions = useGuestPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(post.spotifyTrackData || null);
  const [selectedImages, setSelectedImages] = useState<string[]>(post.imageUrls || []);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const postRef = useRef<HTMLDivElement>(null);

  // Use author data from post or fallback for display
  const author = post.author || {
    id: post.authorId || 'unknown',
    username: `user${(post.authorId || 'unknown').slice(-4)}`,
    displayName: `User ${(post.authorId || 'unknown').slice(-4)}`,
    email: null,
    password: null,
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
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as User;

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        setShowAuthDialog(true);
        return Promise.reject(new Error("User not logged in"));
      }
      if (post.isLiked) {
        return apiRequest("DELETE", `/api/posts/${post.id}/like`);
      } else {
        return apiRequest("POST", `/api/posts/${post.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error.message !== "User not logged in") {
        toast({
          title: "Action failed",
          description: "There was an error processing your request.",
          variant: "destructive",
        });
      }
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (comment?: string) => {
      if (!user) {
        setShowAuthDialog(true);
        return Promise.reject(new Error("User not logged in"));
      }
      return apiRequest("POST", `/api/posts/${post.id}/repost`, { comment });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/topics"] });

      toast({
        title: response.reposted ? "Reposted!" : "Repost removed",
        description: response.reposted ? "Post has been shared to your profile." : "Repost has been removed.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error.message !== "User not logged in") {
        toast({
          title: "Repost failed",
          description: "There was an error reposting this post.",
          variant: "destructive",
        });
      }
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        setShowAuthDialog(true);
        return Promise.reject(new Error("User not logged in"));
      }
      return apiRequest("POST", `/api/posts/${post.id}/bookmark`);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });

      toast({
        title: response.bookmarked ? "Bookmarked!" : "Bookmark removed",
        description: response.bookmarked ? "Post saved to your bookmarks." : "Post removed from bookmarks.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error.message !== "User not logged in") {
        toast({
          title: "Bookmark failed",
          description: "There was an error bookmarking this post.",
          variant: "destructive",
        });
      }
    },
  });

  const adminDeleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/admin/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });
      toast({
        title: "Post deleted",
        description: "Post has been removed by admin.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting this post.",
        variant: "destructive",
      });
    },
  });

  const reportPostMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      if (!user) {
        setShowAuthDialog(true);
        return Promise.reject(new Error("User not logged in"));
      }
      return apiRequest("POST", `/api/posts/${post.id}/report`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Post reported",
        description: "Thank you for your report. Our team will review it.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error.message !== "User not logged in") {
        toast({
          title: "Report failed",
          description: "There was an error reporting this post.",
          variant: "destructive",
        });
      }
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", post.authorId, "posts"] });
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Delete post error:", error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting your post.",
        variant: "destructive",
      });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async (data: { title?: string; content: string }) => {
      return apiRequest("PUT", `/api/posts/${post.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", post.authorId, "posts"] });
      setShowEditDialog(false);
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Edit post error:", error);
      toast({
        title: "Edit failed",
        description: "There was an error updating your post.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (files: FileList) => {
    // Validate files
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format.`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('images', file);
    });

    setIsUploadingImages(true);
    try {
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      setSelectedImages(prev => [...prev, ...data.imageUrls]);

      toast({
        title: "Images uploaded!",
        description: `${validFiles.length} image(s) added to your post.`,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleEditSave = () => {
    if (!editContent.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (editContent.length > 10000) {
      toast({
        title: "Post too long",
        description: "Posts must be under 10,000 characters.",
        variant: "destructive",
      });
      return;
    }

    if (isUploadingImages) {
      toast({
        title: "Images uploading",
        description: "Please wait for image uploads to complete.",
        variant: "destructive",
      });
      return;
    }

    editPostMutation.mutate({
      title: editTitle || undefined,
      content: editContent,
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      spotifyTrackData: selectedTrack ? {
        name: selectedTrack.name,
        artist: selectedTrack.artists?.[0]?.name || selectedTrack.artist,
        album: selectedTrack.album?.name || selectedTrack.album,
        image: selectedTrack.album?.images?.[0]?.url || selectedTrack.image,
        preview_url: selectedTrack.preview_url,
        external_urls: selectedTrack.external_urls
      } : undefined,
    });
  };

  const getPostTypeStyle = () => {
    switch (post.postType) {
      case "poetry":
        return "bg-gradient-to-br from-purple-900/20 to-purple-600/20 border border-purple-500/20";
      case "story":
        return "bg-gradient-to-br from-blue-900/20 to-blue-600/20 border border-blue-500/20";
      case "challenge":
        return "bg-gradient-to-br from-green-900/20 to-green-600/20 border border-green-500/20";
      default:
        return "";
    }
  };

  const renderFormattedContent = () => {
    const shouldExpand = post.content.length > 300;
    const displayContent = shouldExpand && !isExpanded
      ? post.content.substring(0, 300) + "..."
      : post.content;

    // Check if content contains HTML tags (indicates rich text editor was used)
    const isRichText = /<[^>]*>/g.test(post.content);

    if (post.postType === "poetry") {
      return (
        <div className={`rounded-xl p-6 mb-4 ${getPostTypeStyle()}`}>
          {post.genre && (
            <div className="text-center mb-4">
              <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10">
                {post.genre}
              </Badge>
            </div>
          )}
          <div className="poetry-container space-y-3 text-foreground/90">
            {isRichText ? (
              <div
                className="prose prose-sm max-w-none break-words overflow-hidden"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            ) : (
              displayContent.split('\n').map((line, index) => (
                <p key={index} className="poetry-line break-words overflow-hidden">
                  {line || <br />}
                </p>
              ))
            )}
          </div>
        </div>
      );
    }

    if (post.postType === "story" && post.content.length > 100) {
      return (
        <div className="mb-4">
          <p className="text-base leading-relaxed mb-3">
            {post.genre && (
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-400/10 mr-2">
                {post.genre}
              </Badge>
            )}
            Working on a new {post.genre || "story"}. Here's an excerpt:
          </p>

          <div className={`rounded-xl p-5 font-serif ${getPostTypeStyle()}`}>
            {isRichText ? (
              <div
                className="prose prose-sm max-w-none italic text-foreground/90 leading-relaxed break-words overflow-hidden"
                dangerouslySetInnerHTML={{ __html: `"${displayContent}"` }}
              />
            ) : (
              <p className="italic text-foreground/90 leading-relaxed break-words overflow-hidden">
                "{displayContent}"
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        {isRichText ? (
          <div
            className="prose prose-sm max-w-none text-base leading-relaxed break-words overflow-hidden"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        ) : (
          <p className="text-base leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
            {displayContent}
          </p>
        )}
        {shouldExpand && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-expand-content"
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
    );
  };

  if (!post || !post.author) return null;

  return (
    <article
      ref={postRef}
      data-post-download
      data-post-id={post.id}
      className="border-b border-border p-6 hover:bg-card/50 transition-colors"
    >
      <div className="flex space-x-3">
        <img
          src={getProfileImageUrl(author.profileImageUrl)}
          alt={`${author.displayName} profile`}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          data-testid="img-post-author-avatar"
          onClick={() => window.location.href = `/profile/${author.username}`}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Author Info */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold hover:underline cursor-pointer"
                onClick={() => window.location.href = `/profile/${author.username}`}
              >
                    {author.displayName}
                  </span>
              <span className="text-muted-foreground text-sm" data-testid="text-author-username">
                @{author.username}
              </span>
              {author.isVerified && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white fill-current" />
                  </div>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1">
              {author.isSuperAdmin && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30 font-semibold">
                    Owner
                  </Badge>
                </div>
              )}
              {author.isAdmin && !author.isSuperAdmin && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30 font-semibold">
                    Admin
                  </Badge>
                </div>
              )}
            </div>

            {/* Time and post type */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(post.createdAt || new Date()), { addSuffix: true })}
              </span>
              {post.postType !== "text" && (
                <>
                  <div className={`w-2 h-2 rounded-full ${
                    post.postType === "poetry" ? "bg-purple-400" :
                    post.postType === "story" ? "bg-blue-400" :
                    post.postType === "challenge" ? "bg-green-400" : "bg-muted-foreground"
                  }`} />
                  <span className={`text-xs font-medium ${
                    post.postType === "poetry" ? "text-purple-400" :
                    post.postType === "story" ? "text-blue-400" :
                    post.postType === "challenge" ? "text-green-400" : "text-muted-foreground"
                  }`}>
                    {post.postType.charAt(0).toUpperCase() + post.postType.slice(1)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Post Title */}
          {post.title && post.title.trim() && (
            <div className="mb-4">
              <h2 className="text-xl font-bold leading-tight text-foreground break-words" data-testid="post-title">
                {post.title}
              </h2>
            </div>
          )}

          {/* Post Content */}
          <div>{renderFormattedContent()}</div>

          {/* Images */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="mb-4">
              <ImageGallery
                images={post.imageUrls}
                className="rounded-xl overflow-hidden"
                data-testid="post-image-gallery"
              />
            </div>
          )}

          {/* Spotify Integration */}
          {post.spotifyTrackData && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-green-500/10 to-green-400/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.48.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-green-400">Now Playing</span>
                </div>
                <SpotifyPlayer
                  track={post.spotifyTrackData}
                  compact
                />
              </div>
            </div>
          )}

          {/* Post Stats */}
          {(post.viewsCount || 0) > 0 && (
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <Eye className="w-3 h-3 mr-1" />
              <span>{post.viewsCount?.toLocaleString()} views</span>
            </div>
          )}

          {/* Engagement Buttons */}
          <div className="flex items-center justify-between text-muted-foreground -mx-2" data-hide-in-image="true">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (permissions.showAuthPrompt('like')) {
                  setShowAuthDialog(true);
                } else {
                  likeMutation.mutate();
                }
              }}
              disabled={likeMutation.isPending}
              className={`engagement-btn ${post.isLiked ? "text-red-400" : ""} hover:text-red-400 group`}
              data-testid="button-like-post"
            >
              <div className="p-2 rounded-full group-hover:bg-red-400/10 transition-colors">
                <Heart className={`w-5 h-5 ${post.isLiked ? "fill-current text-red-400" : ""}`} />
              </div>
              <span className="text-sm">{post.likesCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className={`engagement-btn hover:text-blue-400 group ${showComments ? "text-blue-400" : ""}`}
              data-testid="button-comment-post"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm">{post.commentsCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (permissions.showAuthPrompt('repost')) {
                  setShowAuthDialog(true);
                } else {
                  repostMutation.mutate("");
                }
              }}
              disabled={repostMutation.isPending}
              className={`engagement-btn ${post.isReposted ? "text-green-400" : ""} hover:text-green-400 group`}
              data-testid="button-repost"
            >
              <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                <Repeat2 className={`w-5 h-5 ${post.isReposted ? "text-green-400" : ""}`} />
              </div>
              <span className="text-sm">{post.repostsCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="engagement-btn hover:text-purple-400 group"
              data-testid="button-share-post"
              onClick={() => navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`)}
            >
              <div className="p-2 rounded-full group-hover:bg-purple-400/10 transition-colors">
                <Share className="w-5 h-5" />
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (permissions.showAuthPrompt('bookmark')) {
                  setShowAuthDialog(true);
                } else {
                  bookmarkMutation.mutate();
                }
              }}
              disabled={bookmarkMutation.isPending}
              className={`engagement-btn ${post.isBookmarked ? "text-yellow-400" : ""} hover:text-yellow-400 group`}
              data-testid="button-bookmark-post"
            >
              <div className="p-2 rounded-full group-hover:bg-yellow-400/10 transition-colors">
                <Bookmark className={`w-5 h-5 ${post.isBookmarked ? "fill-current text-yellow-400" : ""}`} />
              </div>
            </Button>

            {/* Admin Actions & User Actions */}
            <div className="flex items-center">
              <PostDownload post={post} postRef={postRef} />

              <SavePostImage postRef={postRef} postId={post.id} disabled={!user} />

              {/* Follow button */}
              {user && user.id !== author.id && (
                <FollowButton userId={author.id} />
              )}

              {/* Delete button - for post owner or admin */}
              {(user?.id === author.id || (user as any)?.isAdmin) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="engagement-btn hover:text-red-400 group"
                      data-testid="button-delete-post"
                    >
                      <div className="p-2 rounded-full group-hover:bg-red-400/10 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Post</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this post? This action cannot be undone and will permanently remove the post and all its comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (user?.id === author.id) {
                            deletePostMutation.mutate();
                          } else if ((user as any)?.isAdmin) {
                            adminDeleteMutation.mutate();
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Post
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <ReportPostButton
                postId={post.id}
                disabled={reportPostMutation.isPending}
                onReport={(reason) => reportPostMutation.mutate({ reason })}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="engagement-btn hover:text-muted-foreground group"
                    data-testid="button-post-menu"
                  >
                    <div className="p-2 rounded-full group-hover:bg-muted/10 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user?.id === author.id && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditTitle(post.title || "");
                        setEditContent(post.content);
                        setSelectedImages(post.imageUrls || []);
                        setSelectedTrack(post.spotifyTrackData || null);
                        setIsRichEditor(false);
                        setShowSpotify(false);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`)}>
                    <Share className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border mt-4 pt-4">
          <CommentThread postId={post.id} initialCount={post.commentsCount || 0} />
        </div>
      )}

      {/* Edit Post Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex space-x-3">
              <img
                src={getProfileImageUrl(user?.profileImageUrl)}
                alt="Your profile"
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                {/* Post Type and Privacy */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant="outline" className={`text-xs ${
                        post.postType === "poetry" ? "text-purple-400 border-purple-400/30 bg-purple-400/10" :
                        post.postType === "story" ? "text-blue-400 border-blue-400/30 bg-blue-400/10" :
                        post.postType === "challenge" ? "text-green-400 border-green-400/30 bg-green-400/10" :
                        "text-muted-foreground border-border bg-muted/50"
                      }`}>
                        {post.postType.charAt(0).toUpperCase() + post.postType.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Title Field */}
                {(post.postType === "story" || post.postType === "poetry") && (
                  <div className="mb-4">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={`${post.postType === "story" ? "Story" : "Poem"} title (optional)`}
                      className="text-lg font-medium bg-transparent border-none outline-none placeholder-muted-foreground"
                      maxLength={255}
                    />
                  </div>
                )}

                {/* Editor */}
                {isRichEditor ? (
                  <div className="mb-4">
                    <RichTextEditor
                      content={editContent}
                      onChange={setEditContent}
                      placeholder="Share your thoughts, poetry, or stories..."
                      className="min-h-[120px]"
                      postType={post.postType}
                    />
                  </div>
                ) : (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Share your thoughts, poetry, or stories..."
                    className="resize-none border-none outline-none bg-transparent text-base placeholder-muted-foreground min-h-[120px] p-0"
                  />
                )}

                {/* Media Attachments */}
                {selectedImages.length > 0 && (
                  <div className="mb-4">
                    <ImageGallery
                      images={selectedImages}
                      onRemove={(index) => {
                        setSelectedImages(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="rounded-xl overflow-hidden"
                    />
                  </div>
                )}

                {selectedTrack && (
                  <div className="mb-4">
                    <SpotifyPlayer
                      track={selectedTrack}
                      onRemove={() => setSelectedTrack(null)}
                      compact
                    />
                  </div>
                )}

                {showSpotify && (
                  <div className="mb-4">
                    <SpotifyPlayer
                      onTrackSelect={(track) => {
                        setSelectedTrack(track);
                        setShowSpotify(false);
                      }}
                      onClose={() => setShowSpotify(false)}
                      searchMode
                    />
                  </div>
                )}

                <Separator className="my-4" />

                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRichEditor(!isRichEditor)}
                      className={`p-2 rounded-lg transition-colors ${
                        isRichEditor ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                      title="Rich Text Formatting"
                    >
                      <Type className="w-5 h-5" />
                    </Button>

                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                      id="edit-image-upload"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById('edit-image-upload')?.click()}
                      disabled={isUploadingImages || selectedImages.length >= 4}
                      className={`p-2 rounded-lg transition-colors ${
                        isUploadingImages ? "text-blue-400 bg-blue-400/10" :
                        selectedImages.length >= 4 ? "text-muted-foreground/50 cursor-not-allowed" :
                        "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                      title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add Images"}
                    >
                      {isUploadingImages ? (
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSpotify(!showSpotify)}
                      className={`p-2 rounded-lg transition-colors ${
                        showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                      }`}
                      title="Add Music"
                    >
                      <Music className="w-5 h-5" />
                    </Button>

                    {post.postType === "poetry" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                        title="Poetry Formatting"
                      >
                        <Quote className="w-5 h-5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {editContent.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {editContent.length} characters
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setIsRichEditor(false);
              setSelectedImages(post.imageUrls || []);
              setSelectedTrack(post.spotifyTrackData || null);
              setShowSpotify(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editContent.trim() || editPostMutation.isPending || isUploadingImages}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {editPostMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {editPostMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostMutation.mutate()}
              disabled={deletePostMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        action="interact with posts"
      />
    </article>
  );
}