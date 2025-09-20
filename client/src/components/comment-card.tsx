import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  MessageCircle, 
  Crown, 
  CheckCircle,
  Clock,
  MoreHorizontal
} from "lucide-react";
import type { Comment, User } from "@shared/schema";

interface CommentCardProps {
  comment: Comment & {
    author?: User;
    replies?: Comment[];
    isLiked?: boolean;
  };
  level?: number;
  onReply?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
}

export default function CommentCard({ 
  comment, 
  level = 0, 
  onReply, 
  onLike 
}: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(false);

  const author = comment.author || {
    id: comment.userId,
    username: `user${comment.userId.slice(-4)}`,
    firstName: "User",
    lastName: `${comment.userId.slice(-4)}`,
    profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`,
    isVerified: false,
    isAdmin: false,
    isSuperAdmin: false,
    displayName: `User ${comment.userId.slice(-4)}`
  } as User;

  return (
    <div className={`comment-level-${Math.min(level, 5)} py-3 ${level > 0 ? 'border-l-2 border-border pl-4 ml-4' : ''}`}>
      <div className="flex space-x-3">
        <img
          src={author.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username}`}
          alt={`${author.firstName} ${author.lastName} profile`}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          {/* Author Info */}
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-sm">
                {author.displayName}
              </h4>
              <span className="text-muted-foreground text-xs">
                @{author.username}
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1">
              {author.isSuperAdmin && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30 px-1 py-0 h-4">
                    Owner
                  </Badge>
                </div>
              )}
              {author.isAdmin && !author.isSuperAdmin && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30 px-1 py-0 h-4">
                    Admin
                  </Badge>
                </div>
              )}
              {author.isVerified && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-2.5 h-2.5 text-white fill-current" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 px-1 py-0 h-4">
                    Verified
                  </Badge>
                </div>
              )}
            </div>

            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Comment Content */}
          <div className="mb-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike?.(comment.id)}
              className="text-muted-foreground hover:text-red-400 p-0 h-auto"
            >
              <Heart className={`w-4 h-4 mr-1 ${comment.isLiked ? 'fill-current text-red-400' : ''}`} />
              <span className="text-xs">{comment.likesCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply?.(comment.id)}
              className="text-muted-foreground hover:text-blue-400 p-0 h-auto"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">Reply</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-muted-foreground p-0 h-auto"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="text-primary text-xs p-0 h-auto"
              >
                {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
              </Button>

              {showReplies && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      level={level + 1}
                      onReply={onReply}
                      onLike={onLike}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}