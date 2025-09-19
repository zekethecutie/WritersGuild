import {
  users,
  posts,
  likes,
  comments,
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
  getCommentsByPost(postId: string): Promise<Comment[]>;
  
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
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
    
    // Increment comments count
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, comment.postId));
    
    return newComment;
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return db.select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));
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
    return db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      username: users.username,
      bio: users.bio,
      location: users.location,
      website: users.website,
      genres: users.genres,
      writingStreak: users.writingStreak,
      wordCountGoal: users.wordCountGoal,
      weeklyPostsGoal: users.weeklyPostsGoal,
      isVerified: users.isVerified,
      coverImageUrl: users.coverImageUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .innerJoin(follows, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
  }

  async getFollowing(userId: string): Promise<User[]> {
    return db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      username: users.username,
      bio: users.bio,
      location: users.location,
      website: users.website,
      genres: users.genres,
      writingStreak: users.writingStreak,
      wordCountGoal: users.wordCountGoal,
      weeklyPostsGoal: users.weeklyPostsGoal,
      isVerified: users.isVerified,
      coverImageUrl: users.coverImageUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
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
          sql`${users.firstName} ILIKE ${`%${query}%`}`,
          sql`${users.lastName} ILIKE ${`%${query}%`}`,
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
          sql`${users.id} != ${userId}`,
          sql`${users.id} NOT IN (
            SELECT following_id FROM follows WHERE follower_id = ${userId}
          )`
        )
      )
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
