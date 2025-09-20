import CommentCard from "@/components/comment-card";
import CommentComposer from "@/components/comment-composer";
import type { Comment, User } from "@shared/schema";

type TreeComment = Comment & { 
  replies: TreeComment[];
  author?: User;
  isLiked?: boolean;
};

interface CommentTreeNodeProps {
  comment: TreeComment;
  level: number;
  onReply: (commentId: string) => void;
  onLike: (commentId: string) => void;
  replyingTo: string | null;
  postId: string;
  onReplySuccess: () => void;
  onReplyCancel: () => void;
}

export default function CommentTreeNode({
  comment,
  level,
  onReply,
  onLike,
  replyingTo,
  postId,
  onReplySuccess,
  onReplyCancel,
}: CommentTreeNodeProps) {
  return (
    <div className="space-y-3">
      <CommentCard
        comment={comment}
        level={level}
        onReply={onReply}
        onLike={onLike}
      />
      
      {/* Reply Composer */}
      {replyingTo === comment.id && (
        <div className="mt-4" style={{ marginLeft: `${Math.min(level + 1, 6) * 2.75}rem` }}>
          <CommentComposer
            postId={postId}
            parentId={comment.id}
            replyingTo={comment.author?.displayName || `@${comment.author?.username}`}
            onSuccess={onReplySuccess}
            onCancel={onReplyCancel}
            placeholder="Write your reply..."
            compact={true}
          />
        </div>
      )}
      
      {/* Recursive Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3" style={{ marginLeft: `${Math.min(level + 1, 6) * 1.5}rem` }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} className="mb-3">
              <CommentTreeNode
                comment={reply}
                level={level + 1}
                onReply={onReply}
                onLike={onLike}
                replyingTo={replyingTo}
                postId={postId}
                onReplySuccess={onReplySuccess}
                onReplyCancel={onReplyCancel}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}