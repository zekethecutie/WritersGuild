import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import SpotifyPlayer from "@/components/spotify-player";
import ImageGallery from "@/components/image-gallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Trash2
} from "lucide-react";
import type { Post, User } from "@shared/schema";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock author data if not provided (in real app, this would be joined in the query)
  const author = post.author || {
    id: post.authorId,
    username: `user${post.authorId.slice(-4)}`,
    firstName: "Writer",
    lastName: `${post.authorId.slice(-4)}`,
    profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`,
    isVerified: false,
  } as User;

  const likeMutation = useMutation({
    mutationFn: async () => {
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
      toast({
        title: "Action failed",
        description: "There was an error processing your request.",
        variant: "destructive",
      });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (comment?: string) => {
      return apiRequest("POST", `/api/posts/${post.id}/repost`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Reposted!",
        description: "Post has been shared to your profile.",
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
      toast({
        title: "Repost failed",
        description: "There was an error reposting this post.",
        variant: "destructive",
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Bookmarked!",
        description: "Post saved to your bookmarks.",
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
      toast({
        title: "Bookmark failed",
        description: "There was an error bookmarking this post.",
        variant: "destructive",
      });
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
            {displayContent.split('\n').map((line, index) => (
              <p key={index} className="poetry-line">
                {line || <br />}
              </p>
            ))}
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
            <p className="italic text-foreground/90 leading-relaxed">
              "{displayContent}"
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
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

  return (
    <article className="border-b border-border p-6 hover:bg-card/50 transition-colors">
      <div className="flex space-x-3">
        <img
          src={author.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username}`}
          alt={`${author.firstName} ${author.lastName} profile`}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          data-testid="img-post-author-avatar"
        />
        <div className="flex-1 min-w-0">
          {/* Author Info */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold hover:underline cursor-pointer" data-testid="text-author-name">
                {author.firstName} {author.lastName}
              </h3>
              <span className="text-muted-foreground text-sm" data-testid="text-author-username">
                @{author.username}
              </span>
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
              {author.isVerified && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white fill-current" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold">
                    Verified
                  </Badge>
                </div>
              )}
            </div>

            {/* Time and post type */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
          
          {/* Post Content */}
          {renderFormattedContent()}

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
              <SpotifyPlayer
                track={post.spotifyTrackData}
                compact
              />
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
          <div className="flex items-center justify-between text-muted-foreground -mx-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className={`engagement-btn ${post.isLiked ? "liked" : ""} hover:text-red-400 group`}
              data-testid="button-like-post"
            >
              <div className="p-2 rounded-full group-hover:bg-red-400/10 transition-colors">
                <Heart className={`w-5 h-5 ${post.isLiked ? "fill-current" : ""}`} />
              </div>
              <span className="text-sm">{post.likesCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="engagement-btn hover:text-blue-400 group"
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
              onClick={() => repostMutation.mutate()}
              disabled={repostMutation.isPending}
              className={`engagement-btn ${post.isReposted ? "text-green-400" : ""} hover:text-green-400 group`}
              data-testid="button-repost"
            >
              <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                <Repeat2 className="w-5 h-5" />
              </div>
              <span className="text-sm">{post.repostsCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="engagement-btn hover:text-purple-400 group"
              data-testid="button-share-post"
            >
              <div className="p-2 rounded-full group-hover:bg-purple-400/10 transition-colors">
                <Share className="w-5 h-5" />
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              className={`engagement-btn ${post.isBookmarked ? "text-yellow-400" : ""} hover:text-yellow-400 group`}
              data-testid="button-bookmark-post"
            >
              <div className="p-2 rounded-full group-hover:bg-yellow-400/10 transition-colors">
                <Bookmark className={`w-5 h-5 ${post.isBookmarked ? "fill-current" : ""}`} />
              </div>
            </Button>

            {(user?.isAdmin || user?.isSuperAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adminDeleteMutation.mutate()}
                disabled={adminDeleteMutation.isPending}
                className="engagement-btn hover:text-red-400 group"
                data-testid="button-admin-delete"
              >
                <div className="p-2 rounded-full group-hover:bg-red-400/10 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </div>
              </Button>
            )}

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
          </div>
        </div>
      </div>
    </article>
  );
}
