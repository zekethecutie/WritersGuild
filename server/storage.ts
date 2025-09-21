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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, exists, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User profile operations
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;

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
}

export class DatabaseStorage implements IStorage {
  // Initialize hardcoded admin account
  async initializeAdminAccount(): Promise<void> {
    try {
      // Add a delay to ensure database is ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test basic connection first
      try {
        await db.select().from(users).limit(1);
      } catch (error: any) {
        console.log("⏳ Database connection failed, skipping admin creation:", error.code || error.message);
        return;
      }

      // Check if the admin account already exists
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
        const hashedPassword = await bcrypt.hash("122209", 10);

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
        console.log("✅ Hardcoded admin account created: @itsicxrus");
        console.log("🔑 Admin login: username='itsicxrus', password='122209'");
      } else {
        console.log("✅ Admin account @itsicxrus already exists");
      }
    } catch (error: any) {
      if (error.code === '42703') {
        console.log("⏳ Database columns not ready yet, will retry on next startup");
      } else if (error.code === '23505') {
        console.log("✅ Admin account @itsicxrus already exists (duplicate key)");
      } else if (error.code === '28P01') {
        console.log("⏳ Database authentication failed - please check DATABASE_URL in Secrets");
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
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error: any) {
      if (error.code === '42703') { // Column does not exist
        console.log("Database schema not ready, running migration...");
        return undefined;
      }
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error: any) {
      if (error.code === '42703') { // Column does not exist
        console.log("Database schema not ready, running migration...");
        return undefined;
      }
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

  async getPosts(limit = 20, offset = 0, userId?: string): Promise<Post[]> {
    let query = db.select().from(posts);

    if (userId) {
      // Get posts from followed users
      const followingSubquery = db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));

      query = query.where(
        or(
          eq(posts.authorId, userId),
          exists(
            db.select().from(follows)
              .where(and(
                eq(follows.followerId, userId),
                eq(follows.followingId, posts.authorId)
              ))
          )
        )
      );
    }

    return query
      .where(eq(posts.isPrivate, false))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostsByUser(userId: string, limit = 20, offset = 0): Promise<Post[]> {
    return db.select()
      .from(posts)
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
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
        sql`${commentLikes.commentId} = ANY(${sql.array(commentIds, 'uuid')})`
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
    return db.select()
      .from(users)
      .innerJoin(follows, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
  }

  async getFollowing(userId: string): Promise<User[]> {
    return db.select()
      .from(users)
      .innerJoin(follows, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
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

  async getUserBookmarks(userId: string): Promise<Post[]> {
    return db.select({
      id: posts.id,
      authorId: posts.authorId,
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

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
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

  async getTrendingPosts(limit = 20): Promise<Post[]> {
    return db.select()
      .from(posts)
      .where(eq(posts.isPrivate, false))
      .orderBy(desc(sql`${posts.likesCount} + ${posts.commentsCount} + ${posts.repostsCount}`))
      .limit(limit);
  }

  async getSuggestedUsers(userId: string, limit = 5): Promise<User[]> {
    // Get users not followed by the current user, ordered by follower count
    return db.select()
      .from(users)
      .where(
        and(
          sql`${users.id}::text != ${userId}`,
          sql`${users.id}::text NOT IN (
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
          sql`DATE(${writingGoals.date}) = DATE(${today})`
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
        sql`${posts.createdAt} >= ${startOfWeek}`
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
}

export const storage = new DatabaseStorage();