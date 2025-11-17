import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { getProfileImageUrl } from "@/lib/defaultImages";
import type { Post, User } from "@shared/schema";

interface PostCardProps {
  post: Post & {
    author?: User;
  };
}

function PostCard({ post }: PostCardProps) {
  const [, navigate] = useLocation();

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

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover-elevate transition-all"
      onClick={handleCardClick}
      data-testid={`card-post-${post.id}`}
    >
      {/* Cover Image */}
      {coverImage && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img
            src={coverImage}
            alt={post.title || 'Article cover'}
            className="w-full h-full object-cover"
            data-testid={`img-cover-${post.id}`}
          />
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage 
              src={getProfileImageUrl(author.profileImageUrl)} 
              alt={author.displayName}
            />
            <AvatarFallback>
              {author.displayName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground" data-testid={`text-author-${post.id}`}>
              {author.displayName}
            </span>
            {author.isVerified && (
              <CheckCircle className="w-4 h-4 text-blue-500" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold leading-tight" data-testid={`text-title-${post.id}`}>
          {post.title || 'Untitled'}
        </h2>

        {/* Excerpt */}
        <p className="text-muted-foreground line-clamp-3" data-testid={`text-excerpt-${post.id}`}>
          {post.excerpt || post.content}
        </p>

        {/* Metadata Line */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {post.category && (
            <>
              <Badge variant="secondary" className="text-xs">
                {post.category}
              </Badge>
              <span>•</span>
            </>
          )}
          
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span data-testid={`text-readtime-${post.id}`}>
              {readTime} min read
            </span>
          </div>

          <span>•</span>

          <time data-testid={`text-date-${post.id}`}>
            {formatPublishDate(post.publishedAt || post.createdAt || new Date())}
          </time>
        </div>
      </div>
    </Card>
  );
}

export { PostCard };
export default PostCard;