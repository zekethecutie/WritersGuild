import {
  users,
  posts,
  likes,
  comments,
  commentLikes,
  follows,
  reposts,
  bookmarks,
  notifications,
  writingGoals,
  conversations,
  messages,
  series,
  chapters,
  seriesFollowers,
  seriesLikes,
  readingProgress,
  type User,
  type UpsertUser,
  type InsertPost,
  type Post,
  type InsertComment,
  type Comment,
  type CommentLike,
  type InsertCommentLike,
  type Like,
  type Follow,
  type Repost,
  type Bookmark,
  type Notification,
  type WritingGoal,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, exists, asc, ne, isNotNull, gte, ilike } from "drizzle-orm";
import crypto from 'crypto'; // Import crypto for UUID generation

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User profile operations
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPosts(limit?: number, offset?: number, userId?: string): Promise<Post[]>;
  getPostsByUser(userId: string, limit?: number, offset?: number): Promise<Post[]>;
  updatePost(id: string, data: Partial<Post>): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // Engagement operations
  likePost(userId: string, postId: string): Promise<Like>;
  unlikePost(userId: string, postId: string): Promise<void>;
  hasUserLikedPost(userId: string, postId: string): Promise<boolean>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: string, userId?: string): Promise<Comment[]>;

  // Follow operations
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;

  // Repost operations
  repostPost(userId: string, postId: string, comment?: string): Promise<Repost>;
  unrepost(userId: string, postId: string): Promise<void>;

  // Bookmark operations
  bookmarkPost(userId: string, postId: string): Promise<Bookmark>;
  unbookmarkPost(userId: string, postId: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<Post[]>;

  // Notification operations
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;

  // Writing goals
  updateWritingGoal(userId: string, date: Date, wordCount: number, postsCount: number): Promise<WritingGoal>;
  getUserWritingGoals(userId: string, startDate: Date, endDate: Date): Promise<WritingGoal[]>;

  // Search and discovery
  searchUsers(query: string, limit?: number): Promise<User[]>;
  searchPosts(query: string, limit?: number): Promise<Post[]>;
  getTrendingPosts(limit?: number): Promise<Post[]>;
  getSuggestedUsers(userId: string, limit?: number): Promise<User[]>;

  // Messaging operations
  createConversation(participantOneId: string, participantTwoId: string): Promise<Conversation>;
  getConversation(participantOneId: string, participantTwoId: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<(Conversation & { otherParticipant: User; lastMessage?: Message })[]>;
  sendMessage(conversationId: string, senderId: string, content: string, messageType?: string, attachmentUrls?: string[]): Promise<Message>;
  getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<void>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;

  // Series management methods
  createSeries(seriesData: any): Promise<any>;
  getPublicSeries(limit?: number, offset?: number, genre?: string): Promise<any[]>;
  getSeriesById(seriesId: string, userId?: string): Promise<any>;
  createChapter(chapterData: any): Promise<any>;
  getSeriesChapters(seriesId: string): Promise<any[]>;
  followSeries(userId: string, seriesId: string): Promise<any>;
  unfollowSeries(userId: string, seriesId: string): Promise<void>;
  isFollowingSeries(userId: string, seriesId: string): Promise<boolean>;
  getUserStories(userId: string): Promise<any[]>;
  deleteSeries(seriesId: string): Promise<void>;
  updateReadingProgress(userId: string, seriesId: string, chapterIndex: number): Promise<void>;

  // Leaderboard methods
  getTopPostsByLikes(limit?: number): Promise<any[]>;
  getTopStoriesByLikes(limit?: number): Promise<any[]>;
  getTopAuthorsByStoryLikes(limit?: number): Promise<any[]>;

  // Series likes methods
  hasUserLikedSeries(userId: string, seriesId: string): Promise<boolean>;
  likeSeries(userId: string, seriesId: string): Promise<any>;
  unlikeSeries(userId: string, seriesId: string): Promise<void>;

  // Guest access restriction
  isGuestReadable(entityType: string, entityId: string, userId?: string): Promise<boolean>;
  isGuestInteractable(entityType: string, entityId: string, userId?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Initialize hardcoded admin account
  async initializeAdminAccount(): Promise<void> {
    try {
      // Add a delay to ensure database is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test basic connection first
      try {
        await db.select().from(users).limit(1);
        console.log("✅ Database connection successful");
      } catch (error: any) {
        console.log("⚠️ Database connection failed:", error.code || error.message);
        if (error.code === '28P01') {
          console.log("💡 Authentication failed - check your DATABASE_URL in Secrets");
        } else if (error.code === '42P01') {
          console.log("💡 Tables don't exist yet - run: npm run db:push");
        }
        return;
      }

      // Check if admin account exists
      let existingAdmin;
      try {
        existingAdmin = await this.getUserByUsername("itsicxrus");
      } catch (error: any) {
        // If column doesn't exist or database connection fails, database schema isn't ready
        if (error.code === '42703' || error.code === '42P01' || error.code === '28P01' || error.code === 'ECONNREFUSED') {
          console.log("⏳ Database schema not ready yet, skipping admin creation");
          return;
        }
        console.log("Admin check failed, will attempt to create:", error.message);
      }

      if (!existingAdmin) {
        // Use dynamic import for ES modules
        const bcrypt = await import("bcrypt");
        const adminPassword = process.env.ADMIN_PASSWORD || "defaultAdminPassword123!";
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await db.insert(users).values({
          username: "itsicxrus",
          email: "admin@writersguild.com",
          password: hashedPassword,
          displayName: "Super Admin",
          bio: "Owner and Super Administrator of Writers Guild",
          isVerified: true,
          isAdmin: true,
          isSuperAdmin: true,
          profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=itsicxrus",
        });
        console.log("✅ Admin account created: @itsicxrus");
        console.log("🔑 Admin login configured via ADMIN_PASSWORD environment variable");
      } else {
        console.log("✅ Admin account @itsicxrus already exists");
      }
    } catch (error: any) {
      if (error.code === '42703') {
        console.log("⏳ Database columns not ready yet, will retry on next startup");
      } else if (error.code === '23505') {
        console.log("✅ Admin account @itsicxrus already exists (duplicate key)");
      } else if (error.code === '28P01') {
        console.log("❌ Database authentication failed - please check DATABASE_URL in Secrets");
        console.log("💡 Make sure to use your Supabase connection string with the correct password");
      } else {
        console.error("❌ Error creating admin account:", error.message);
      }
      // Don't throw, let the app continue running
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, userData.id))
        .returning();
      if (user) return user;
    }

    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const userList = await db.select().from(users).where(eq(users.username, username));
      return userList[0];
    } catch (error) {
      console.error("Error fetching user by username:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const userList = await db.select().from(users).where(eq(users.email, email));
      return userList[0];
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw error;
    }
  }

  async createUser(userData: { email?: string; password: string; displayName: string; username: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        username: userData.username,
      })
      .returning();
    return user;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();

    // Increment user's posts count
    await db
      .update(users)
      .set({ postsCount: sql`${users.postsCount} + 1` })
      .where(eq(users.id, post.authorId));

    // Check auto verification
    await this.checkAutoVerification(post.authorId);

    return newPost;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPosts(limit: number = 20, offset: number = 0, userId?: string): Promise<(Post & { author?: User; isLiked?: boolean; isBookmarked?: boolean; isReposted?: boolean })[]> {
    const postsQuery = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        formattedContent: posts.formattedContent,
        postType: posts.postType,
        genre: posts.genre,
        spotifyTrackId: posts.spotifyTrackId,
        spotifyTrackData: posts.spotifyTrackData,
        imageUrls: posts.imageUrls,
        isPrivate: posts.isPrivate,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          password: users.password,
          bio: users.bio,
          location: users.location,
          website: users.website,
          profileImageUrl: users.profileImageUrl,
          coverImageUrl: users.coverImageUrl,
          genres: users.genres,
          writingStreak: users.writingStreak,
          wordCountGoal: users.wordCountGoal,
          weeklyPostsGoal: users.weeklyPostsGoal,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin,
          postsCount: users.postsCount,
          commentsCount: users.commentsCount,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        isLiked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${likes} 
          WHERE ${likes.userId} = ${userId} 
          AND ${likes.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isBookmarked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookmarks} 
          WHERE ${bookmarks.userId} = ${userId} 
          AND ${bookmarks.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isReposted: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${reposts} 
          WHERE ${reposts.userId} = ${userId} 
          AND ${reposts.postId} = ${posts.id}
        )` : sql<boolean>`false`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.isPrivate, false))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await postsQuery;

    return results.map(row => ({
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      formattedContent: row.formattedContent,
      postType: row.postType,
      genre: row.genre,
      spotifyTrackId: row.spotifyTrackId,
      spotifyTrackData: row.spotifyTrackData,
      imageUrls: row.imageUrls,
      isPrivate: row.isPrivate,
      likesCount: row.likesCount,
      commentsCount: row.commentsCount,
      repostsCount: row.repostsCount,
      viewsCount: row.viewsCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author || undefined,
      isLiked: row.isLiked,
      isBookmarked: row.isBookmarked,
      isReposted: row.isReposted,
    }));
  }

  async getPostsByUser(userId: string, limit = 20, offset = 0): Promise<(Post & { author?: User; isLiked?: boolean; isBookmarked?: boolean; isReposted?: boolean })[]> {
    const postsQuery = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        formattedContent: posts.formattedContent,
        postType: posts.postType,
        genre: posts.genre,
        spotifyTrackId: posts.spotifyTrackId,
        spotifyTrackData: posts.spotifyTrackData,
        imageUrls: posts.imageUrls,
        isPrivate: posts.isPrivate,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          password: users.password,
          bio: users.bio,
          location: users.location,
          website: users.website,
          profileImageUrl: users.profileImageUrl,
          coverImageUrl: users.coverImageUrl,
          genres: users.genres,
          writingStreak: users.writingStreak,
          wordCountGoal: users.wordCountGoal,
          weeklyPostsGoal: users.weeklyPostsGoal,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin,
          postsCount: users.postsCount,
          commentsCount: users.commentsCount,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await postsQuery;

    return results.map(row => ({
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      formattedContent: row.formattedContent,
      postType: row.postType,
      genre: row.genre,
      spotifyTrackId: row.spotifyTrackId,
      spotifyTrackData: row.spotifyTrackData,
      imageUrls: row.imageUrls,
      isPrivate: row.isPrivate,
      likesCount: row.likesCount,
      commentsCount: row.commentsCount,
      repostsCount: row.repostsCount,
      viewsCount: row.viewsCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author || undefined,
      isLiked: false,
      isBookmarked: false,
      isReposted: false,
    }));
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(postId: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, postId));
  }

  // Engagement operations
  async likePost(userId: string, postId: string): Promise<Like> {
    const [like] = await db.insert(likes).values({ userId, postId }).returning();

    // Increment likes count
    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));

    return like;
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));

    // Decrement likes count
    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} - 1` })
      .where(eq(posts.id, postId));
  }

  async hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();

    // Increment comments count on post
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, comment.postId));

    // Increment user's comments count
    await db
      .update(users)
      .set({ commentsCount: sql`${users.commentsCount} + 1` })
      .where(eq(users.id, comment.userId));

    // Check auto verification
    await this.checkAutoVerification(comment.userId);

    return newComment;
  }

  async getCommentsByPost(postId: string, userId?: string): Promise<Comment[]> {
    // Get base comments with authors
    const baseComments = await db.select({
      id: comments.id,
      userId: comments.userId,
      postId: comments.postId,
      content: comments.content,
      parentId: comments.parentId,
      level: comments.level,
      likesCount: comments.likesCount,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        isVerified: users.isVerified,
      }
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));

    if (!userId || baseComments.length === 0) {
      return baseComments;
    }

    // Get like status for current user
    const commentIds = baseComments.map(c => c.id);
    const userLikes = await db.select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(and(
        eq(commentLikes.userId, userId),
        sql`${commentLikes.commentId}::text = ANY(ARRAY[${commentIds.map(id => `'${id}'`).join(',')}])`
      ));

    const likedCommentIds = new Set(userLikes.map(like => like.commentId));

    // Add isLiked status to comments
    return baseComments.map(comment => ({
      ...comment,
      isLiked: likedCommentIds.has(comment.id)
    }));
  }

  async getRepliesForComment(commentId: string): Promise<Comment[]> {
    return db.select()
      .from(comments)
      .where(eq(comments.parentId, commentId))
      .orderBy(asc(comments.createdAt));
  }

  async createReply(reply: InsertComment & { parentId: string }): Promise<Comment> {
    // Get parent comment to determine level
    const parentComment = await db.select()
      .from(comments)
      .where(eq(comments.id, reply.parentId))
      .limit(1);

    const level = parentComment[0] ? (parentComment[0].level || 0) + 1 : 0;

    const [newReply] = await db.insert(comments).values({
      ...reply,
      level: Math.min(level, 5) // Max 5 levels deep
    }).returning();

    // Increment comments count on post
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, reply.postId));

    // Increment user's comments count
    await db
      .update(users)
      .set({ commentsCount: sql`${users.commentsCount} + 1` })
      .where(eq(users.id, reply.userId));

    // Check auto verification
    await this.checkAutoVerification(reply.userId);

    return newReply;
  }

  // Comment engagement operations
  async likeComment(userId: string, commentId: string): Promise<void> {
    // Insert like record (ignore if already exists)
    await db
      .insert(commentLikes)
      .values({ userId, commentId })
      .onConflictDoNothing();

    // Increment likes count
    await db
      .update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, commentId));
  }

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    // Delete like record
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));

    // Decrement likes count (prevent negative)
    await db
      .update(comments)
      .set({ likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)` })
      .where(eq(comments.id, commentId));
  }

  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
    return !!like;
  }

  // Follow operations
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const [follow] = await db.insert(follows).values({ followerId, followingId }).returning();
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return !!follow;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      displayName: users.displayName,
      username: users.username,
      bio: users.bio,
      location: users.location,
      website: users.website,
      profileImageUrl: users.profileImageUrl,
      coverImageUrl: users.coverImageUrl,
      genres: users.genres,
      writingStreak: users.writingStreak,
      wordCountGoal: users.wordCountGoal,
      weeklyPostsGoal: users.weeklyPostsGoal,
      isVerified: users.isVerified,
      isAdmin: users.isAdmin,
      isSuperAdmin: users.isSuperAdmin,
      postsCount: users.postsCount,
      commentsCount: users.commentsCount,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
      .from(users)
      .innerJoin(follows, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result;
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      displayName: users.displayName,
      username: users.username,
      bio: users.bio,
      location: users.location,
      website: users.website,
      profileImageUrl: users.profileImageUrl,
      coverImageUrl: users.coverImageUrl,
      genres: users.genres,
      writingStreak: users.writingStreak,
      wordCountGoal: users.wordCountGoal,
      weeklyPostsGoal: users.weeklyPostsGoal,
      isVerified: users.isVerified,
      isAdmin: users.isAdmin,
      isSuperAdmin: users.isSuperAdmin,
      postsCount: users.postsCount,
      commentsCount: users.commentsCount,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
      .from(users)
      .innerJoin(follows, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result;
  }

  // Repost operations
  async repostPost(userId: string, postId: string, comment?: string): Promise<Repost> {
    const [repost] = await db.insert(reposts).values({ userId, postId, comment }).returning();

    // Increment reposts count
    await db
      .update(posts)
      .set({ repostsCount: sql`${posts.repostsCount} + 1` })
      .where(eq(posts.id, postId));

    return repost;
  }

  async unrepost(userId: string, postId: string): Promise<void> {
    await db.delete(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));

    // Decrement reposts count
    await db
      .update(posts)
      .set({ repostsCount: sql`${posts.repostsCount} - 1` })
      .where(eq(posts.id, postId));
  }

  // Bookmark operations
  async bookmarkPost(userId: string, postId: string): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values({ userId, postId }).returning();
    return bookmark;
  }

  async unbookmarkPost(userId: string, postId: string): Promise<void> {
    await db.delete(bookmarks).where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))
    );
  }

  async removeBookmark(userId: string, postId: string): Promise<void> {
    await db.delete(bookmarks).where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))
    );
  }

  async isPostBookmarked(userId: string, postId: string): Promise<boolean> {
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    return !!bookmark;
  }

  async hasUserReposted(userId: string, postId: string): Promise<boolean> {
    const [repost] = await db
      .select()
      .from(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    return !!repost;
  }

  async clearAllBookmarks(userId: string): Promise<void> {
    await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
  }

  async getUserBookmarks(userId: string): Promise<Post[]> {
    return db.select({
      id: posts.id,
      authorId: posts.authorId,
      title: posts.title,
      content: posts.content,
      formattedContent: posts.formattedContent,
      postType: posts.postType,
      genre: posts.genre,
      spotifyTrackId: posts.spotifyTrackId,
      spotifyTrackData: posts.spotifyTrackData,
      imageUrls: posts.imageUrls,
      isPrivate: posts.isPrivate,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      repostsCount: posts.repostsCount,
      viewsCount: posts.viewsCount,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
      .from(posts)
      .innerJoin(bookmarks, eq(bookmarks.postId, posts.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    const result = await db.select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      actorId: notifications.actorId,
      postId: notifications.postId,
      isRead: notifications.isRead,
      data: notifications.data,
      createdAt: notifications.createdAt,
      actor: notifications.actorId ? {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        isVerified: users.isVerified,
      } : null,
      post: notifications.postId ? {
        id: posts.id,
        content: posts.content,
      } : null,
    })
      .from(notifications)
      .leftJoin(users, and(eq(notifications.actorId, users.id), isNotNull(notifications.actorId)))
      .leftJoin(posts, and(eq(notifications.postId, posts.id), isNotNull(notifications.postId)))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      actorId: row.actorId,
      postId: row.postId,
      isRead: row.isRead,
      data: row.data,
      createdAt: row.createdAt,
      actor: row.actor,
      post: row.post,
    }));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // Writing goals
  async updateWritingGoal(userId: string, date: Date, wordCount: number, postsCount: number): Promise<WritingGoal> {
    const [goal] = await db
      .insert(writingGoals)
      .values({ userId, date, wordCount, postsCount })
      .onConflictDoUpdate({
        target: [writingGoals.userId, writingGoals.date],
        set: { wordCount, postsCount, goalMet: sql`${wordCount} >= (SELECT word_count_goal FROM users WHERE id = ${userId})` },
      })
      .returning();
    return goal;
  }

  async getUserWritingGoals(userId: string, startDate: Date, endDate: Date): Promise<WritingGoal[]> {
    return db.select()
      .from(writingGoals)
      .where(
        and(
          eq(writingGoals.userId, userId),
          sql`${writingGoals.date} >= ${startDate}`,
          sql`${writingGoals.date} <= ${endDate}`
        )
      )
      .orderBy(desc(writingGoals.date));
  }

  // Search and discovery
  async searchUsers(query: string, limit = 10): Promise<User[]> {
    return db.select()
      .from(users)
      .where(
        or(
          sql`${users.username} ILIKE ${`%${query}%`}`,
          sql`${users.displayName} ILIKE ${`%${query}%`}`,
          sql`${users.bio} ILIKE ${`%${query}%`}`
        )
      )
      .limit(limit);
  }

  async searchPosts(query: string, limit = 20): Promise<Post[]> {
    return db.select()
      .from(posts)
      .where(
        and(
          eq(posts.isPrivate, false),
          sql`${posts.content} ILIKE ${`%${query}%`}`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async getTrendingPosts(limit: number = 20, userId?: string): Promise<(Post & { author?: User; isLiked?: boolean; isBookmarked?: boolean; isReposted?: boolean })[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trendingPosts = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        formattedContent: posts.formattedContent,
        postType: posts.postType,
        genre: posts.genre,
        spotifyTrackId: posts.spotifyTrackId,
        spotifyTrackData: posts.spotifyTrackData,
        imageUrls: posts.imageUrls,
        isPrivate: posts.isPrivate,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          password: users.password,
          bio: users.bio,
          location: users.location,
          website: users.website,
          profileImageUrl: users.profileImageUrl,
          coverImageUrl: users.coverImageUrl,
          genres: users.genres,
          writingStreak: users.writingStreak,
          wordCountGoal: users.wordCountGoal,
          weeklyPostsGoal: users.weeklyPostsGoal,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin,
          postsCount: users.postsCount,
          commentsCount: users.commentsCount,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        isLiked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${likes} 
          WHERE ${likes.userId} = ${userId} 
          AND ${likes.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isBookmarked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookmarks} 
          WHERE ${bookmarks.userId} = ${userId} 
          AND ${bookmarks.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isReposted: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${reposts} 
          WHERE ${reposts.userId} = ${userId} 
          AND ${reposts.postId} = ${posts.id}
        )` : sql<boolean>`false`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(gte(posts.createdAt, oneDayAgo))
      .orderBy(
        desc(sql`${posts.likesCount} + ${posts.commentsCount} + ${posts.repostsCount}`)
      )
      .limit(limit);

    return trendingPosts.map(row => ({
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      formattedContent: row.formattedContent,
      postType: row.postType,
      genre: row.genre,
      spotifyTrackId: row.spotifyTrackId,
      spotifyTrackData: row.spotifyTrackData,
      imageUrls: row.imageUrls,
      isPrivate: row.isPrivate,
      likesCount: row.likesCount,
      commentsCount: row.commentsCount,
      repostsCount: row.repostsCount,
      viewsCount: row.viewsCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author || undefined,
      isLiked: row.isLiked,
      isBookmarked: row.isBookmarked,
      isReposted: row.isReposted,
    }));
  }

  async getSuggestedUsers(userId: string, limit = 5): Promise<User[]> {
    // Get users not followed by the current user, ordered by follower count
    return db.select()
      .from(users)
      .where(
        and(
          ne(users.id, userId), // Exclude current user
          sql`${users.id} NOT IN (
            SELECT following_id FROM follows WHERE follower_id = ${userId}
          )`
        )
      )
      .limit(limit);
  }

  async getTrendingTopics(): Promise<{ rank: number; category: string; hashtag: string; posts: string }[]> {
    // Get trending topics based on post genres and activity
    const topicData = await db.select({
      genre: posts.genre,
      count: sql<number>`count(*)::int`,
    })
      .from(posts)
      .where(
        and(
          eq(posts.isPrivate, false),
          sql`${posts.createdAt} >= NOW() - INTERVAL '7 days'`
        )
      )
      .groupBy(posts.genre)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Format the results to match the expected structure
    return topicData.map((item, index) => ({
      rank: index + 1,
      category: item.genre || "General",
      hashtag: `#${(item.genre || "WritersCommunity").replace(/\s+/g, '')}`,
      posts: item.count.toLocaleString(),
    }));
  }

  async getUserStats(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
    postsCount: number;
    likesReceived: number;
  }> {
    const [followersResult] = await db.select({
      count: sql<number>`count(*)::int`
    })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingResult] = await db.select({
      count: sql<number>`count(*)::int`
    })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const [postsResult] = await db.select({
      count: sql<number>`count(*)::int`
    })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const [likesResult] = await db.select({
      count: sql<number>`count(*)::int`
    })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .where(eq(posts.authorId, userId));

    return {
      followersCount: followersResult?.count || 0,
      followingCount: followingResult?.count || 0,
      postsCount: postsResult?.count || 0,
      likesReceived: likesResult?.count || 0,
    };
  }

  async getCurrentWritingGoals(userId: string): Promise<{
    dailyWordCount: { current: number; goal: number; percentage: number };
    weeklyPosts: { current: number; goal: number; percentage: number };
    currentStreak: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Get today's word count
    const [todayGoal] = await db.select()
      .from(writingGoals)
      .where(
        and(
          eq(writingGoals.userId, userId),
          sql`DATE(${writingGoals.date}) = ${today.toISOString().split('T')[0]}`
        )
      );

    // Get this week's posts
    const [weeklyPosts] = await db.select({
      count: sql<number>`count(*)::int`
    })
      .from(posts)
      .where(
        and(
          eq(posts.authorId, userId),
          sql`${posts.createdAt} >= ${startOfWeek.toISOString()}`
        )
      );

    const dailyWordGoal = user.wordCountGoal || 500;
    const weeklyPostGoal = user.weeklyPostsGoal || 5;
    const currentWordCount = todayGoal?.wordCount || 0;
    const currentWeeklyPosts = weeklyPosts?.count || 0;

    return {
      dailyWordCount: {
        current: currentWordCount,
        goal: dailyWordGoal,
        percentage: Math.min(100, Math.round((currentWordCount / dailyWordGoal) * 100)),
      },
      weeklyPosts: {
        current: currentWeeklyPosts,
        goal: weeklyPostGoal,
        percentage: Math.min(100, Math.round((currentWeeklyPosts / weeklyPostGoal) * 100)),
      },
      currentStreak: user.writingStreak || 0,
    };
  }

  // Admin operations
  async setUserAdmin(adminUserId: string, targetUserId: string, isAdmin: boolean): Promise<User | null> {
    // Check if user making request is super admin
    const adminUser = await this.getUser(adminUserId);
    if (!adminUser?.isSuperAdmin) {
      throw new Error("Only super admins can set admin status");
    }

    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning();
    return user;
  }

  async setUserVerified(adminUserId: string, targetUserId: string, isVerified: boolean): Promise<User | null> {
    // Check if user making request is admin
    const adminUser = await this.getUser(adminUserId);
    if (!adminUser?.isAdmin && !adminUser?.isSuperAdmin) {
      throw new Error("Only admins can set verification status");
    }

    const [user] = await db
      .update(users)
      .set({ isVerified, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning();
    return user;
  }

  async deleteUserAsAdmin(adminUserId: string, targetUserId: string): Promise<void> {
    // Check if user making request is admin
    const adminUser = await this.getUser(adminUserId);
    if (!adminUser?.isAdmin && !adminUser?.isSuperAdmin) {
      throw new Error("Only admins can delete users");
    }

    await db.delete(users).where(eq(users.id, targetUserId));
  }

  async deletePostAsAdmin(adminUserId: string, postId: string): Promise<void> {
    // Check if user making request is admin
    const adminUser = await this.getUser(adminUserId);
    if (!adminUser?.isAdmin && !adminUser?.isSuperAdmin) {
      throw new Error("Only admins can delete posts");
    }

    await db.delete(posts).where(eq(posts.id, postId));
  }

  // Check if user should be auto-verified (100 posts + 100 comments)
  async checkAutoVerification(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.isVerified) return;

    if ((user.postsCount || 0) >= 100 && (user.commentsCount || 0) >= 100) {
      await db
        .update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
  }

  async getAdminUsers(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(or(eq(users.isAdmin, true), eq(users.isSuperAdmin, true)));
  }

  // Messaging implementation
  async createConversation(participantOneId: string, participantTwoId: string): Promise<Conversation> {
    // Ensure consistent ordering to prevent duplicate conversations
    const [firstId, secondId] = [participantOneId, participantTwoId].sort();

    const [conversation] = await db
      .insert(conversations)
      .values({
        participantOneId: firstId,
        participantTwoId: secondId,
      })
      .returning();
    return conversation;
  }

  async getConversation(participantOneId: string, participantTwoId: string): Promise<Conversation | undefined> {
    // Ensure consistent ordering
    const [firstId, secondId] = [participantOneId, participantTwoId].sort();

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.participantOneId, firstId),
          eq(conversations.participantTwoId, secondId)
        )
      );
    return conversation;
  }

  async getUserConversations(userId: string): Promise<(Conversation & { otherParticipant: User; lastMessage?: Message })[]> {
    // Get conversations with participant data in one query
    const userConversations = await db
      .select({
        id: conversations.id,
        participantOneId: conversations.participantOneId,
        participantTwoId: conversations.participantTwoId,
        lastMessageId: conversations.lastMessageId,
        lastMessageAt: conversations.lastMessageAt,
        isArchived: conversations.isArchived,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        // Participant one data
        participantOneDisplayName: sql<string>`p1.display_name`.as('p1_display_name'),
        participantOneUsername: sql<string>`p1.username`.as('p1_username'),
        participantOneProfileImageUrl: sql<string>`p1.profile_image_url`.as('p1_profile_image_url'),
        // Participant two data
        participantTwoDisplayName: sql<string>`p2.display_name`.as('p2_display_name'),
        participantTwoUsername: sql<string>`p2.username`.as('p2_username'),
        participantTwoProfileImageUrl: sql<string>`p2.profile_image_url`.as('p2_profile_image_url'),
      })
      .from(conversations)
      .leftJoin(sql`${users} p1`, sql`${conversations.participantOneId} = p1.id`)
      .leftJoin(sql`${users} p2`, sql`${conversations.participantTwoId} = p2.id`)
      .where(or(
        eq(conversations.participantOneId, userId),
        eq(conversations.participantTwoId, userId)
      ))
      .orderBy(desc(conversations.updatedAt));

    const conversationsWithData = await Promise.all(
      userConversations.map(async (conv) => {
        // Determine the other participant
        const isUserParticipantOne = conv.participantOneId === userId;
        const otherParticipant = {
          id: isUserParticipantOne ? conv.participantTwoId : conv.participantOneId,
          displayName: isUserParticipantOne ? conv.participantTwoDisplayName : conv.participantOneDisplayName,
          username: isUserParticipantOne ? conv.participantTwoUsername : conv.participantOneUsername,
          profileImageUrl: isUserParticipantOne ? conv.participantTwoProfileImageUrl : conv.participantOneProfileImageUrl,
        };

        // Get last message if exists
        let lastMessage: Message | undefined;
        if (conv.lastMessageId) {
          const [message] = await db
            .select()
            .from(messages)
            .where(eq(messages.id, conv.lastMessageId))
            .limit(1);
          lastMessage = message;
        }

        return {
          id: conv.id,
          participantOneId: conv.participantOneId,
          participantTwoId: conv.participantTwoId,
          lastMessageId: conv.lastMessageId,
          lastMessageAt: conv.lastMessageAt,
          isArchived: conv.isArchived,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          otherParticipant: otherParticipant as User,
          lastMessage,
        };
      })
    );

    return conversationsWithData;
  }

  async sendMessage(conversationId: string, senderId: string, content: string, messageType = "text", attachmentUrls: string[] = []): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
        messageType,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : null,
      })
      .returning();

    // Update conversation's last message
    await db
      .update(conversations)
      .set({
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return message;
  }

  async getConversationMessages(conversationId: string, limit = 50, offset = 0): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        attachmentUrls: messages.attachmentUrls,
        isRead: messages.isRead,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt)) // Changed to asc for chronological order
      .limit(limit)
      .offset(offset);

    return result;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await db
        .update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId),
            eq(messages.isRead, false)
          )
        );
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      throw error;
    }
  }

  async getMessageById(messageId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    return message;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.id, messageId));
  }

  async getConversationById(conversationId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conversation;
  }

  // User discovery and search methods
  async getRecommendedUsers(userId: string): Promise<any[]> {
    // Get users with similar genres or who are followed by people the user follows
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        location: users.location,
        profileImageUrl: users.profileImageUrl,
        genres: users.genres,
        postsCount: users.postsCount,
        createdAt: users.createdAt,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${follows} 
          WHERE ${follows.followingId} = ${users.id}
        )`.as('followersCount'),
        isFollowing: sql<boolean>`(
          SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END
          FROM ${follows} 
          WHERE ${follows.followerId} = ${userId} 
          AND ${follows.followingId} = ${users.id}
        )`.as('isFollowing'),
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId), // Exclude current user
          isNotNull(users.genres), // Only users with genres
        )
      )
      .orderBy(desc(users.postsCount))
      .limit(10);

    return result;
  }

  async getTrendingUsers(): Promise<any[]> {
    // Users with highest engagement in the last 30 days
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        location: users.location,
        profileImageUrl: users.profileImageUrl,
        genres: users.genres,
        postsCount: users.postsCount,
        createdAt: users.createdAt,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${follows} 
          WHERE ${follows.followingId} = ${users.id}
        )`.as('followersCount'),
        recentActivity: sql<number>`(
          SELECT COUNT(*) FROM ${posts} 
          WHERE ${posts.authorId} = ${users.id} 
          AND ${posts.createdAt} > NOW() - INTERVAL '30 days'
        )`.as('recentActivity'),
      })
      .from(users)
      .orderBy(
        desc(sql`(
          SELECT COUNT(*) FROM ${follows} 
          WHERE ${follows.followingId} = ${users.id}
        ) + (
          SELECT COALESCE(SUM(${posts.likesCount}), 0) FROM ${posts} 
          WHERE ${posts.authorId} = ${users.id} 
          AND ${posts.createdAt} > NOW() - INTERVAL '30 days'
        )`)
      )
      .limit(10);

    return result;
  }

  async getPopularPosts(): Promise<any[]> {
    // Posts with highest engagement in the last 7 days
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        genre: posts.genre,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(posts.isPrivate, false),
          gte(posts.createdAt, sql`NOW() - INTERVAL '7 days'`)
        )
      )
      .orderBy(
        desc(sql`${posts.likesCount} + ${posts.commentsCount} + ${posts.repostsCount}`)
      )
      .limit(20);

    return result;
  }

  async getPopularMusicPosts(limit: number = 20, userId?: string): Promise<(Post & { author?: User; isLiked?: boolean; isBookmarked?: boolean; isReposted?: boolean })[]> {
    // Posts with Spotify tracks and highest engagement in the last 7 days
    const result = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        formattedContent: posts.formattedContent,
        postType: posts.postType,
        genre: posts.genre,
        spotifyTrackId: posts.spotifyTrackId,
        spotifyTrackData: posts.spotifyTrackData,
        imageUrls: posts.imageUrls,
        isPrivate: posts.isPrivate,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified,
        },
        isLiked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${likes} 
          WHERE ${likes.userId} = ${userId} 
          AND ${likes.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isBookmarked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookmarks} 
          WHERE ${bookmarks.userId} = ${userId} 
          AND ${bookmarks.postId} = ${posts.id}
        )` : sql<boolean>`false`,
        isReposted: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${reposts} 
          WHERE ${reposts.userId} = ${userId} 
          AND ${reposts.postId} = ${posts.id}
        )` : sql<boolean>`false`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(posts.isPrivate, false),
          isNotNull(posts.spotifyTrackData), // Only posts with Spotify track data
          gte(posts.createdAt, sql`NOW() - INTERVAL '7 days'`)
        )
      )
      .orderBy(
        desc(sql`${posts.likesCount} + ${posts.commentsCount} + ${posts.repostsCount}`)
      )
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      formattedContent: row.formattedContent,
      postType: row.postType as any,
      genre: row.genre,
      spotifyTrackId: row.spotifyTrackId,
      spotifyTrackData: row.spotifyTrackData,
      imageUrls: row.imageUrls,
      isPrivate: row.isPrivate,
      likesCount: row.likesCount,
      commentsCount: row.commentsCount,
      repostsCount: row.repostsCount,
      viewsCount: row.viewsCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author,
      isLiked: row.isLiked,
      isBookmarked: row.isBookmarked,
      isReposted: row.isReposted,
    }));
  }

  async searchContent(query: string): Promise<{ users: any[]; posts: any[] }> {
    const searchTerm = `%${query.toLowerCase()}%`;

    // Search users
    const searchUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        location: users.location,
        profileImageUrl: users.profileImageUrl,
        genres: users.genres,
        postsCount: users.postsCount,
        createdAt: users.createdAt,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${follows} 
          WHERE ${follows.followingId} = ${users.id}
        )`.as('followersCount'),
      })
      .from(users)
      .where(
        or(
          ilike(users.displayName, searchTerm),
          ilike(users.username, searchTerm),
          ilike(users.bio, searchTerm),
        )
      )
      .orderBy(desc(users.postsCount))
      .limit(20);

    // Search posts
    const searchPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        genre: posts.genre,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(posts.isPrivate, false),
          or(
            ilike(posts.content, searchTerm),
            ilike(posts.genre, searchTerm),
          )
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(30);

    return { users: searchUsers, posts: searchPosts };
  }

  // Series management methods
  async createSeries(seriesData: any): Promise<any> {
    try {
      const [newSeries] = await db.insert(series).values({
        ...seriesData,
        authorId: seriesData.authorId,
        isPrivate: seriesData.isPrivate || false,
        chaptersCount: 0,
        followersCount: 0,
        likesCount: 0,
        viewsCount: 0
      }).returning();

      return newSeries;
    } catch (error) {
      console.error("Error creating series:", error);
      throw error;
    }
  }

  async getPublicSeries(limit = 20, offset = 0, genre?: string): Promise<any[]> {
    try {
      let query = db.select({
        id: series.id,
        authorId: series.authorId,
        title: series.title,
        description: series.description,
        coverImageUrl: series.coverImageUrl,
        genre: series.genre,
        tags: series.tags,
        isCompleted: series.isCompleted,
        viewsCount: series.viewsCount,
        likesCount: series.likesCount,
        chaptersCount: series.chaptersCount,
        followersCount: series.followersCount,
        createdAt: series.createdAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified,
        }
      })
        .from(series)
        .leftJoin(users, eq(series.authorId, users.id))
        .where(eq(series.isPrivate, false));

      if (genre) {
        query = query.where(and(eq(series.isPrivate, false), eq(series.genre, genre)));
      }

      const result = await query
        .orderBy(desc(series.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      console.error("Error fetching public series:", error);
      return [];
    }
  }

  async getSeriesById(seriesId: string, userId?: string): Promise<any> {
    try {
      const [result] = await db.select({
        id: series.id,
        authorId: series.authorId,
        title: series.title,
        description: series.description,
        coverImageUrl: series.coverImageUrl,
        genre: series.genre,
        tags: series.tags,
        isCompleted: series.isCompleted,
        isPrivate: series.isPrivate,
        viewsCount: series.viewsCount,
        likesCount: series.likesCount,
        chaptersCount: series.chaptersCount,
        followersCount: series.followersCount,
        createdAt: series.createdAt,
        updatedAt: series.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified,
        },
        isLiked: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${seriesLikes} 
          WHERE ${seriesLikes.userId} = ${userId} 
          AND ${seriesLikes.seriesId} = ${series.id}
        )` : sql<boolean>`false`,
        isFollowing: userId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${seriesFollowers} 
          WHERE ${seriesFollowers.userId} = ${userId} 
          AND ${seriesFollowers.seriesId} = ${series.id}
        )` : sql<boolean>`false`,
        isBookmarked: userId ? sql<boolean>`false` : sql<boolean>`false` // TODO: Implement series bookmarks
      })
      .from(series)
      .leftJoin(users, eq(series.authorId, users.id))
      .where(eq(series.id, seriesId));

      if (!result) {
        return null;
      }

      return result;
    } catch (error) {
      console.error("Error fetching series by ID:", error);
      return null;
    }
  }

  async createChapter(chapterData: any): Promise<any> {
    const [newChapter] = await db.insert(chapters).values(chapterData).returning();

    // Update series chapters count
    await db
      .update(series)
      .set({ chaptersCount: sql`${series.chaptersCount} + 1` })
      .where(eq(series.id, chapterData.seriesId));

    return newChapter;
  }

  async getChapterById(chapterId: string): Promise<any> {
    try {
      const [chapter] = await db.select()
        .from(chapters)
        .where(eq(chapters.id, chapterId));

      return chapter;
    } catch (error) {
      console.error("Error fetching chapter by ID:", error);
      return null;
    }
  }

  async updateChapter(chapterId: string, chapterData: any): Promise<any> {
    const [updatedChapter] = await db
      .update(chapters)
      .set({ ...chapterData, updatedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .returning();

    return updatedChapter;
  }

  async getSeriesChapters(seriesId: string): Promise<any[]> {
    try {
      const result = await db.select()
        .from(chapters)
        .where(eq(chapters.seriesId, seriesId))
        .orderBy(asc(chapters.chapterNumber));

      return result;
    } catch (error) {
      console.error("Error fetching series chapters:", error);
      return [];
    }
  }

  async followSeries(userId: string, seriesId: string): Promise<any> {
    const [follow] = await db.insert(seriesFollowers).values({ userId, seriesId }).returning();

    // Update series followers count
    await db
      .update(series)
      .set({ followersCount: sql`${series.followersCount} + 1` })
      .where(eq(series.id, seriesId));

    return follow;
  }

  async unfollowSeries(userId: string, seriesId: string): Promise<void> {
    await db.delete(seriesFollowers).where(
      and(eq(seriesFollowers.userId, userId), eq(seriesFollowers.seriesId, seriesId))
    );

    // Update series followers count
    await db
      .update(series)
      .set({ followersCount: sql`${series.followersCount} - 1` })
      .where(eq(series.id, seriesId));
  }

  async isFollowingSeries(userId: string, seriesId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(seriesFollowers)
      .where(and(eq(seriesFollowers.userId, userId), eq(seriesFollowers.seriesId, seriesId)));
    return !!follow;
  }

  async getUserStories(userId: string): Promise<any[]> {
    try {
      const result = await db.select({
        id: series.id,
        title: series.title,
        description: series.description,
        coverImageUrl: series.coverImageUrl,
        genre: series.genre,
        tags: series.tags,
        isCompleted: series.isCompleted,
        viewsCount: series.viewsCount,
        likesCount: series.likesCount,
        chaptersCount: series.chaptersCount,
        followersCount: series.followersCount,
        createdAt: series.createdAt,
      })
        .from(series)
        .where(eq(series.authorId, userId))
        .orderBy(desc(series.createdAt));

      return result;
    } catch (error) {
      console.error("Error fetching user stories:", error);
      return [];
    }
  }

  async deleteSeries(seriesId: string): Promise<void> {
    await db.delete(series).where(eq(series.id, seriesId));
  }

  async updateReadingProgress(userId: string, seriesId: string, chapterIndex: number): Promise<void> {
    // Get total chapters count for progress calculation
    const totalChapters = await db.select({ count: sql<number>`count(*)` })
      .from(chapters)
      .where(eq(chapters.seriesId, seriesId));

    const progressPercentage = totalChapters[0]?.count > 0
      ? Math.round(((chapterIndex + 1) / totalChapters[0].count) * 100)
      : 0;

    await db
      .insert(readingProgress)
      .values({
        userId,
        seriesId,
        lastChapterIndex: chapterIndex,
        progressPercentage,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.seriesId],
        set: {
          lastChapterIndex: chapterIndex,
          progressPercentage,
          lastReadAt: new Date(),
          updatedAt: new Date()
        }
      });
  }

  async getReadingProgress(userId: string, seriesId: string): Promise<any> {
    const [progress] = await db.select()
      .from(readingProgress)
      .where(and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.seriesId, seriesId)
      ));

    return progress;
  }

  // Add missing method for series comments
  async getSeriesComments(seriesId: string): Promise<any[]> {
    // For now, return empty array - implement series comments later
    return [];
  }

  // Duplicate getSeriesComments removed

  async createSeriesComment(userId: string, seriesId: string, content: string): Promise<any> {
    // For now, return a placeholder - implement series comments later
    return {
      id: crypto.randomUUID(),
      userId,
      seriesId,
      content,
      createdAt: new Date()
    };
  }

  async isSeriesBookmarked(userId: string, seriesId: string): Promise<boolean> {
    // For now, return false - implement series bookmarks later
    return false;
  }

  async bookmarkSeries(userId: string, seriesId: string): Promise<any> {
    // For now, return a placeholder - implement series bookmarks later
    return {
      id: crypto.randomUUID(),
      userId,
      seriesId,
      createdAt: new Date()
    };
  }

  async removeSeriesBookmark(userId: string, seriesId: string): Promise<void> {
    // For now, do nothing - implement series bookmarks later
  }

  async updateSeries(seriesId: string, updateData: any): Promise<any> {
    try {
      const [updated] = await db
        .update(series)
        .set({
          title: updateData.title,
          description: updateData.description,
          genre: updateData.genre,
          tags: updateData.tags,
          coverImageUrl: updateData.coverImageUrl,
          isCompleted: updateData.isCompleted,
          isPrivate: updateData.isPrivate,
          updatedAt: new Date()
        })
        .where(eq(series.id, seriesId))
        .returning();

      return updated;
    } catch (error) {
      console.error("Error updating series:", error);
      throw error;
    }
  }

  async deleteChapter(chapterId: string): Promise<void> {
    try {
      // Get chapter info before deleting to update series count
      const chapter = await this.getChapterById(chapterId);

      await db.delete(chapters)
        .where(eq(chapters.id, chapterId));

      // Update series chapters count
      if (chapter) {
        await db
          .update(series)
          .set({ chaptersCount: sql`${series.chaptersCount} - 1` })
          .where(eq(series.id, chapter.seriesId));
      }
    } catch (error) {
      console.error("Error deleting chapter:", error);
      throw error;
    }
  }

  async getChapterById(chapterId: string): Promise<any> {
    try {
      const [chapter] = await db.select()
        .from(chapters)
        .where(eq(chapters.id, chapterId));

      return chapter || null;
    } catch (error) {
      console.error("Error fetching chapter:", error);
      throw error;
    }
  }

  async updateChapter(chapterId: string, updateData: any): Promise<any> {
    try {
      const [updated] = await db
        .update(chapters)
        .set({
          title: updateData.title,
          content: updateData.content,
          chapterNumber: updateData.chapterNumber,
          wordCount: updateData.wordCount,
          updatedAt: new Date()
        })
        .where(eq(chapters.id, chapterId))
        .returning();

      return updated;
    } catch (error) {
      console.error("Error updating chapter:", error);
      throw error;
    }
  }

  async reactToSeries(userId: string, seriesId: string, reaction: string): Promise<any> {
    // For now, return a placeholder - implement series reactions later
    return {
      id: crypto.randomUUID(),
      userId,
      seriesId,
      reaction,
      createdAt: new Date()
    };
  }

  // Leaderboard methods
  async getTopPostsByLikes(limit: number = 20): Promise<any[]> {
    const topPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        postType: posts.postType,
        genre: posts.genre,
        imageUrls: posts.imageUrls,
        spotifyTrackData: posts.spotifyTrackData,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        likesCount: sql<number>`COUNT(${likes.id})`,
        commentsCount: sql<number>`(
          SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id}
        )`,
        repostsCount: sql<number>`(
          SELECT COUNT(*) FROM ${reposts} WHERE ${reposts.postId} = ${posts.id}
        )`,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin
        }
      })
      .from(posts)
      .leftJoin(likes, eq(likes.postId, posts.id))
      .leftJoin(users, eq(users.id, posts.authorId))
      .groupBy(posts.id, users.id)
      .having(sql`COUNT(${likes.id}) > 0`)
      .orderBy(desc(sql`COUNT(${likes.id})`))
      .limit(limit);

    return topPosts;
  }

  async getTopStoriesByLikes(limit: number = 20): Promise<any[]> {
    const topStories = await db
      .select({
        id: series.id,
        title: series.title,
        description: series.description,
        genre: series.genre,
        tags: series.tags,
        coverImageUrl: series.coverImageUrl,
        isCompleted: series.isCompleted,
        createdAt: series.createdAt,
        likesCount: sql<number>`COUNT(${seriesLikes.id})`,
        chaptersCount: sql<number>`(
          SELECT COUNT(*) FROM ${chapters} WHERE ${chapters.seriesId} = ${series.id}
        )`,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${seriesFollowers} WHERE ${seriesFollowers.seriesId} = ${series.id}
        )`,
        viewsCount: sql<number>`COALESCE(${series.viewsCount}, 0)`,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          isVerified: users.isVerified
        }
      })
      .from(series)
      .leftJoin(seriesLikes, eq(seriesLikes.seriesId, series.id))
      .leftJoin(users, eq(users.id, series.authorId))
      .groupBy(series.id, users.id)
      .having(sql`COUNT(${seriesLikes.id}) > 0`)
      .orderBy(desc(sql`COUNT(${seriesLikes.id})`))
      .limit(limit);

    return topStories;
  }

  async getTopAuthorsByStoryLikes(limit: number = 20): Promise<any[]> {
    const topAuthors = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        isVerified: users.isVerified,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${follows} WHERE ${follows.followingId} = ${users.id}
        )`,
        storiesCount: sql<number>`COUNT(DISTINCT ${series.id})`,
        totalLikes: sql<number>`COUNT(${seriesLikes.id})`,
        avgLikesPerStory: sql<number>`ROUND(CAST(COUNT(${seriesLikes.id}) AS FLOAT) / NULLIF(COUNT(DISTINCT ${series.id}), 0), 1)`
      })
      .from(users)
      .leftJoin(series, eq(series.authorId, users.id))
      .leftJoin(seriesLikes, eq(seriesLikes.seriesId, series.id))
      .groupBy(users.id)
      .having(sql`COUNT(${seriesLikes.id}) > 0`)
      .orderBy(desc(sql`COUNT(${seriesLikes.id})`))
      .limit(limit);

    return topAuthors;
  }

  // Delete post method
  async deletePost(postId: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, postId));
  }

  // Update daily writing goals
  async updateDailyWritingGoals(userId: string, wordCount: number, postsCount: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if goal exists for today
    const existingGoal = await db
      .select()
      .from(writingGoals)
      .where(and(
        eq(writingGoals.userId, userId),
        eq(writingGoals.date, today)
      ))
      .limit(1);

    if (existingGoal.length > 0) {
      // Update existing goal
      await db
        .update(writingGoals)
        .set({
          wordCount: existingGoal[0].wordCount + wordCount,
          postsCount: existingGoal[0].postsCount + postsCount,
        })
        .where(eq(writingGoals.id, existingGoal[0].id));
    } else {
      // Create new goal
      await db
        .insert(writingGoals)
        .values({
          userId,
          date: today,
          wordCount,
          postsCount,
          goalMet: false,
        });
    }
  }

  // Series likes methods
  async hasUserLikedSeries(userId: string, seriesId: string): Promise<boolean> {
    const like = await db
      .select()
      .from(seriesLikes)
      .where(and(
        eq(seriesLikes.userId, userId),
        eq(seriesLikes.seriesId, seriesId)
      ))
      .limit(1);

    return like.length > 0;
  }

  async likeSeries(userId: string, seriesId: string): Promise<any> {
    const like = {
      id: crypto.randomUUID(),
      userId,
      seriesId,
      createdAt: new Date()
    };

    await db.insert(seriesLikes).values(like);
    return like;
  }

  async unlikeSeries(userId: string, seriesId: string): Promise<void> {
    await db
      .delete(seriesLikes)
      .where(and(
        eq(seriesLikes.userId, userId),
        eq(seriesLikes.seriesId, seriesId)
      ));
  }

  // Guest access restriction methods
  async isGuestReadable(entityType: string, entityId: string, userId?: string): Promise<boolean> {
    if (userId) return true; // Logged-in users can always read

    switch (entityType) {
      case 'post':
        const [post] = await db.select({ isPrivate: posts.isPrivate }).from(posts).where(eq(posts.id, entityId));
        return !post?.isPrivate;
      case 'series':
        const [series] = await db.select({ isPrivate: series.isPrivate }).from(series).where(eq(series.id, entityId));
        return !series?.isPrivate;
      default:
        return true; // Default to readable if not specified
    }
  }

  async isGuestInteractable(entityType: string, entityId: string, userId?: string): Promise<boolean> {
    if (userId) return true; // Logged-in users can interact

    // Guests cannot interact with any social features
    return false;
  }
}

export const storage = new DatabaseStorage();