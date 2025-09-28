import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import rateLimit from "express-rate-limit";
import { eq, desc, asc, like, ilike, and, or, isNull, sql, gt, lt, gte, lte, ne, count, inArray } from "drizzle-orm";
import { db } from "./db"; // Assuming db is your Drizzle client instance
import { conversations, messages, users, posts, comments, notifications, series, chapters, bookmarks, likes, follows, reposts } from "../shared/schema"; // Import necessary tables and schema
import { insertPostSchema, insertCommentSchema } from "@shared/schema";
import { DatabaseStorage } from "./storage";
import { getSpotifyClient } from "./spotifyClient";
import spotifyRoutes from "./spotifyRoutes";

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Session middleware - single instance to reuse across HTTP and WebSocket
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

function createSessionMiddleware() {
  // Require SESSION_SECRET - no fallback for security
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for security');
  }

  const memoryStore = MemoryStore(session);
  const sessionStore = new memoryStore({
    checkPeriod: sessionTtl, // prune expired entries every 24h
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

// Create single session middleware instance to share
const sessionMiddleware = createSessionMiddleware();

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create storage instance
  const storage = new DatabaseStorage();

  // Initialize admin account
  await storage.initializeAdminAccount();

  // Retry admin account creation after a delay (in case database wasn't ready)
  setTimeout(async () => {
    try {
      await storage.initializeAdminAccount();
    } catch (error) {
      console.log("Delayed admin initialization attempt completed");
    }
  }, 5000);

  // Rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for auth endpoints
    message: { message: "Too many authentication attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs for general endpoints
    message: { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 write requests per minute
    message: { message: "Too many write requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Session middleware
  app.set("trust proxy", 1);
  app.use(sessionMiddleware);

  // Apply general rate limiting to all routes
  app.use('/api', generalLimiter);

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploadsDir));

  // Auth routes (with rate limiting)
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { email, password, displayName, username } = req.body;

      if (!displayName || !username || !password) {
        return res.status(400).json({ message: "Display name, username, and password are required" });
      }

      // Check if email is provided and user already exists
      if (email) {
        try {
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
          }
        } catch (error: any) {
          console.error("Database error checking email:", error.message);
          if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: "Database connection failed. Please try again later." });
          }
        }
      }

      // Check if username is taken
      try {
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username is already taken" });
        }
      } catch (error: any) {
        console.error("Database error checking username:", error.message);
        if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
          return res.status(503).json({ message: "Database connection failed. Please try again later." });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email: email || undefined,
        password: hashedPassword,
        displayName,
        username,
      });

      // Set session
      (req.session as any).userId = user.id;

      console.log(`✅ User registered successfully: ${user.username} (${user.id})`);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email/username and password are required" });
      }

      // Find user by email or username
      let user = null;
      try {
        if (email.includes('@')) {
          user = await storage.getUserByEmail(email);
        } else {
          user = await storage.getUserByUsername(email);
        }
      } catch (error: any) {
        console.error("Database error during login:", error.message);
        if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
          return res.status(503).json({ message: "Database connection failed. Please try again later." });
        }
        return res.status(500).json({ message: "Database error, please try again" });
      }

      if (!user) {
        console.log(`Login attempt failed: user not found for "${email}"`);
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      if (!user.password) {
        console.log(`Login attempt failed: no password set for user "${email}"`);
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`Login attempt failed: invalid password for user "${email}"`);
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Save session explicitly
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      console.log(`✅ User logged in successfully: ${user.username} (${user.id})`);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login. Please try again." });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.patch('/api/users/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { displayName, bio, location, website, genres, userRole, preferredGenres } = req.body;

      const updatedUser = await storage.updateUserProfile(userId, {
        displayName,
        bio,
        location,
        website,
        genres,
        userRole,
        preferredGenres,
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Post routes
  app.post('/api/posts', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const postData = insertPostSchema.parse({
        ...req.body,
        authorId: userId,
      });

      const post = await storage.createPost(postData);

      // Update daily word count and post count
      const wordCount = postData.content.split(/\s+/).filter(word => word.length > 0).length;
      await storage.updateDailyWritingGoals(userId, wordCount, 1);

      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Get posts with engagement data
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = req.session?.user?.id;

      const postsQuery = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          postType: posts.postType,
          genre: posts.genre,
          spotifyTrackData: posts.spotifyTrackData,
          imageUrls: posts.imageUrls,
          isPrivate: posts.isPrivate,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          repostsCount: posts.repostsCount,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          // Include author data directly in the query
          authorDisplayName: users.displayName,
          authorUsername: users.username,
          authorProfileImageUrl: users.profileImageUrl,
          authorIsVerified: users.isVerified,
          authorIsAdmin: users.isAdmin,
          authorIsSuperAdmin: users.isSuperAdmin,
          authorUserRole: users.userRole,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.isPrivate, false))
        .orderBy(desc(posts.createdAt))
        .limit(50);

      const postsData = await postsQuery;

      // Get engagement data for current user if logged in
      let userLikes: any[] = [];
      let userBookmarks: any[] = [];
      let userReposts: any[] = [];

      if (userId) {
        const postIds = postsData.map(post => post.id);

        [userLikes, userBookmarks, userReposts] = await Promise.all([
          db.select({ postId: likes.postId }).from(likes)
            .where(and(eq(likes.userId, userId), inArray(likes.postId, postIds))),
          db.select({ postId: bookmarks.postId }).from(bookmarks)
            .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.postId, postIds))),
          db.select({ postId: reposts.postId }).from(reposts)
            .where(and(eq(reposts.userId, userId), inArray(reposts.postId, postIds)))
        ]);
      }

      const likedPostIds = new Set(userLikes.map(like => like.postId));
      const bookmarkedPostIds = new Set(userBookmarks.map(bookmark => bookmark.postId));
      const repostedPostIds = new Set(userReposts.map(repost => repost.postId));

      const postsWithEngagement = postsData.map(post => ({
        id: post.id,
        authorId: post.authorId,
        title: post.title,
        content: post.content,
        postType: post.postType,
        genre: post.genre,
        spotifyTrackData: post.spotifyTrackData,
        imageUrls: post.imageUrls,
        isPrivate: post.isPrivate,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        repostsCount: post.repostsCount,
        viewsCount: post.viewsCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          id: post.authorId,
          displayName: post.authorDisplayName,
          username: post.authorUsername,
          profileImageUrl: post.authorProfileImageUrl,
          isVerified: post.authorIsVerified,
          isAdmin: post.authorIsAdmin,
          isSuperAdmin: post.authorIsSuperAdmin,
          userRole: post.authorUserRole,
        },
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
        isReposted: repostedPostIds.has(post.id),
      }));

      res.json(postsWithEngagement);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Popular music posts route - must come before general :id route
  app.get('/api/posts/popular-music', async (req: any, res) => {
    try {
      const { limit = 20 } = req.query;
      const userId = req.session?.userId;
      const posts = await storage.getPopularMusicPosts(parseInt(limit as string), userId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching popular music posts:", error);
      res.status(500).json({ message: "Failed to fetch popular music posts" });
    }
  });

  // Get single post with comments
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session?.user?.id;

      // Get the post with author data in one query
      const [postData] = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          postType: posts.postType,
          genre: posts.genre,
          spotifyTrackData: posts.spotifyTrackData,
          imageUrls: posts.imageUrls,
          isPrivate: posts.isPrivate,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          repostsCount: posts.repostsCount,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          // Author data
          authorDisplayName: users.displayName,
          authorUsername: users.username,
          authorProfileImageUrl: users.profileImageUrl,
          authorIsVerified: users.isVerified,
          authorIsAdmin: users.isAdmin,
          authorIsSuperAdmin: users.isSuperAdmin,
          authorUserRole: users.userRole,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.id, postId))
        .limit(1);

      if (!postData) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Get engagement data for current user if logged in
      let isLiked = false;
      let isBookmarked = false;
      let isReposted = false;

      if (userId) {
        const [userLike, userBookmark, userRepost] = await Promise.all([
          db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId))).limit(1),
          db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))).limit(1),
          db.select().from(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId))).limit(1)
        ]);

        isLiked = userLike.length > 0;
        isBookmarked = userBookmark.length > 0;
        isReposted = userRepost.length > 0;
      }

      const postWithEngagement = {
        id: postData.id,
        authorId: postData.authorId,
        title: postData.title,
        content: postData.content,
        postType: postData.postType,
        genre: postData.genre,
        spotifyTrackData: postData.spotifyTrackData,
        imageUrls: postData.imageUrls,
        isPrivate: postData.isPrivate,
        likesCount: postData.likesCount,
        commentsCount: postData.commentsCount,
        repostsCount: postData.repostsCount,
        viewsCount: postData.viewsCount,
        createdAt: postData.createdAt,
        updatedAt: postData.updatedAt,
        author: {
          id: postData.authorId,
          displayName: postData.authorDisplayName,
          username: postData.authorUsername,
          profileImageUrl: postData.authorProfileImageUrl,
          isVerified: postData.authorIsVerified,
          isAdmin: postData.authorIsAdmin,
          isSuperAdmin: postData.authorIsSuperAdmin,
          userRole: postData.authorUserRole,
        },
        isLiked,
        isBookmarked,
        isReposted,
      };

      res.json(postWithEngagement);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get('/api/users/:userId/posts', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const posts = await storage.getPostsByUser(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  // Like routes
  app.post('/api/posts/:id/like', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      const hasLiked = await storage.hasUserLikedPost(userId, postId);
      if (hasLiked) {
        return res.status(400).json({ message: "Post already liked" });
      }

      const like = await storage.likePost(userId, postId);

      // Get post to find the author for notification
      const post = await storage.getPost(postId);
      if (post && post.authorId !== userId) {
        // Create and broadcast notification
        const notification = await storage.createNotification({
          userId: post.authorId,
          type: 'like',
          actorId: userId,
          postId: postId,
          isRead: false,
          data: {}
        });

        // Broadcast real-time notification
        if ((app as any).broadcastNotification) {
          (app as any).broadcastNotification(post.authorId, notification);
        }
      }

      res.json(like);
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.delete('/api/posts/:id/like', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      await storage.unlikePost(userId, postId);
      res.json({ message: "Post unliked" });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  // Comment routes
  app.post('/api/posts/:id/comments', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId,
        postId,
      });

      const comment = await storage.createComment(commentData);

      // Get post to find the author for notification
      const post = await storage.getPost(postId);
      if (post && post.authorId !== userId) {
        // Create and broadcast notification
        const notification = await storage.createNotification({
          userId: post.authorId,
          type: 'comment',
          actorId: userId,
          postId: postId,
          isRead: false,
          data: {}
        });

        // Broadcast real-time notification
        if ((app as any).broadcastNotification) {
          (app as any).broadcastNotification(post.authorId, notification);
        }
      }

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = (req as any).session?.userId; // Get user ID if authenticated
      const comments = await storage.getCommentsByPost(postId, userId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/comments/:id/reply', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: parentId } = req.params;
      const { content, postId } = req.body;

      const reply = await storage.createReply({
        userId,
        postId,
        content,
        parentId,
      });
      res.json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  app.get('/api/comments/:id/replies', async (req, res) => {
    try {
      const { id: commentId } = req.params;
      const replies = await storage.getRepliesForComment(commentId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  app.post('/api/comments/:id/like', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: commentId } = req.params;

      const hasLiked = await storage.hasUserLikedComment(userId, commentId);

      if (hasLiked) {
        await storage.unlikeComment(userId, commentId);
        res.json({ liked: false, message: "Comment unliked" });
      } else {
        await storage.likeComment(userId, commentId);
        res.json({ liked: true, message: "Comment liked" });
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
      res.status(500).json({ message: "Failed to toggle comment like" });
    }
  });

  // Follow routes
  // New follow routes with correct endpoints
  app.post('/api/follows', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { followingId } = req.body;

      if (!followingId) {
        return res.status(400).json({ message: "followingId is required" });
      }

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);

      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following this user" });
      }

      // Follow the user
      const follow = await storage.followUser(followerId, followingId);

      // Create and broadcast follow notification
      const notification = await storage.createNotification({
        userId: followingId,
        type: 'follow',
        actorId: followerId,
        isRead: false,
        postId: null,
        data: {}
      });

      // Broadcast real-time notification
      if ((app as any).broadcastNotification) {
        (app as any).broadcastNotification(followingId, notification);
      }

      res.json({ following: true, follow, message: "Following user" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete('/api/follows/:followingId', requireAuth, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { followingId } = req.params;

      await storage.unfollowUser(followerId, followingId);
      res.json({ following: false, message: "Unfollowed user" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  app.post('/api/users/:id/follow', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { id: followingId } = req.params;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);

      if (isAlreadyFollowing) {
        // Unfollow if already following
        await storage.unfollowUser(followerId, followingId);
        res.json({ following: false, message: "Unfollowed user" });
      } else {
        // Follow if not following
        const follow = await storage.followUser(followerId, followingId);

        // Only create notification when following (not unfollowing)
        const notification = await storage.createNotification({
          userId: followingId,
          type: 'follow',
          actorId: followerId,
          isRead: false,
          postId: null,
          data: {}
        });

        // Broadcast real-time notification
        if ((app as any).broadcastNotification) {
          (app as any).broadcastNotification(followingId, notification);
        }

        res.json({ following: true, follow, message: "Following user" });
      }
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete('/api/users/:id/follow', requireAuth, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { id: followingId } = req.params;

      await storage.unfollowUser(followerId, followingId);
      res.json({ message: "User unfollowed" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Check follow status
  app.get('/api/users/:id/follow-status', requireAuth, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { id: followingId } = req.params;

      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  // Repost routes
  app.post('/api/posts/:id/repost', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { comment } = req.body;

      // Check if already reposted
      const isReposted = await storage.hasUserReposted(userId, postId);

      if (isReposted) {
        await storage.unrepost(userId, postId);
        res.json({ reposted: false, message: "Repost removed" });
      } else {
        const repost = await storage.repostPost(userId, postId, comment);

        // Get post to find the author for notification
        const post = await storage.getPost(postId);
        if (post && post.authorId !== userId) {
          // Create and broadcast notification
          const notification = await storage.createNotification({
            userId: post.authorId,
            type: 'repost',
            actorId: userId,
            postId: postId,
            isRead: false,
            data: {}
          });

          // Broadcast real-time notification
          if ((app as any).broadcastNotification) {
            (app as any).broadcastNotification(post.authorId, notification);
          }
        }

        res.json({ reposted: true, repost });
      }
    } catch (error) {
      console.error("Error reposting:", error);
      res.status(500).json({ message: "Failed to repost" });
    }
  });

  // Bookmark routes
  app.post('/api/posts/:id/bookmark', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      // Check if already bookmarked
      const isBookmarked = await storage.isPostBookmarked(userId, postId);

      if (isBookmarked) {
        await storage.removeBookmark(userId, postId);
        res.json({ bookmarked: false, message: "Bookmark removed" });
      } else {
        const bookmark = await storage.bookmarkPost(userId, postId);
        res.json({ bookmarked: true, bookmark });
      }
    } catch (error) {
      console.error("Error bookmarking post:", error);
      res.status(500).json({ message: "Failed to bookmark post" });
    }
  });

  app.get('/api/bookmarks', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const bookmarks = await storage.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error: any) {
      console.error("Error fetching bookmarks:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.delete('/api/posts/:id/bookmark', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      await storage.removeBookmark(userId, postId);
      res.json({ message: "Bookmark removed" });
    } catch (error: any) {
      console.error("Error removing bookmark:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });

  app.delete('/api/bookmarks/clear', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.clearAllBookmarks(userId);
      res.json({ message: "All bookmarks cleared" });
    } catch (error: any) {
      console.error("Error clearing bookmarks:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to clear bookmarks" });
    }
  });

  // Search routes
  app.get('/api/users/search', async (req, res) => {
    try {
      const { q: query, limit = 10 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const users = await storage.searchUsers(query as string, parseInt(limit as string));
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/search/users', async (req, res) => {
    try {
      const { q: query, limit = 10 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const users = await storage.searchUsers(query as string, parseInt(limit as string));
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/search/posts', async (req, res) => {
    try {
      const { q: query, limit = 20 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const posts = await storage.searchPosts(query as string, parseInt(limit as string));
      res.json(posts);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });

  // Trending and discovery routes
  app.get('/api/trending/posts', async (req: any, res) => {
    try {
      const { limit = 20 } = req.query;
      const userId = req.session?.userId;
      const posts = await storage.getTrendingPosts(parseInt(limit as string), userId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching trending posts:", error);
      res.status(500).json({ message: "Failed to fetch trending posts" });
    }
  });

  app.get('/api/trending/topics', async (req, res) => {
    try {
      const topics = await storage.getTrendingTopics();
      res.json(topics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ message: "Failed to fetch trending topics" });
    }
  });

  app.get("/api/users/:id/stats", async (req, res) => {
    try {
      const userId = req.params.id;

      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Get user's stories
  app.get("/api/users/:id/stories", async (req, res) => {
    try {
      const userId = req.params.id;
      const stories = await storage.getUserStories(userId);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ error: "Failed to fetch user stories" });
    }
  });

  // Series routes
  // Get public series
  app.get("/api/series", async (req, res) => {
    try {
      const { genre, limit = "20", offset = "0" } = req.query;
      const seriesList = await storage.getPublicSeries(
        parseInt(limit as string),
        parseInt(offset as string),
        genre as string
      );
      res.json(seriesList);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({ error: "Failed to fetch series" });
    }
  });

  // Get my stories (user's own stories) - must come before /:id route
  app.get("/api/series/my-stories", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const userStories = await storage.getUserStories(userId);
      res.json(userStories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ error: "Failed to fetch user stories" });
    }
  });

  // Get series by ID
  app.get("/api/series/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session?.userId;
      const series = await storage.getSeriesById(id, userId);
      if (!series) {
        return res.status(404).json({ error: "Series not found" });
      }
      res.json(series);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({ error: "Failed to fetch series" });
    }
  });

  app.post('/api/series', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const seriesData = { ...req.body, authorId: userId };
      const series = await storage.createSeries(seriesData);
      res.json(series);
    } catch (error) {
      console.error("Error creating series:", error);
      res.status(500).json({ error: "Failed to create series" });
    }
  });

  app.get('/api/series/:id/chapters', async (req, res) => {
    try {
      const { id } = req.params;
      const chapters = await storage.getSeriesChapters(id);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ error: "Failed to fetch chapters" });
    }
  });

  // Delete series
  app.delete("/api/series/:id", requireAuth, async (req: any, res) => {
    try {
      const seriesId = req.params.id;
      const userId = req.session.userId;

      // Check if user owns the series
      const seriesData = await storage.getSeriesById(seriesId);
      if (!seriesData || seriesData.authorId !== userId) {
        return res.status(403).json({ error: "You can only delete your own series" });
      }

      await storage.deleteSeries(seriesId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting series:", error);
      res.status(500).json({ error: "Failed to delete series" });
    }
  });


  app.get('/api/users/:id/writing-goals', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      // Users can only see their own goals unless they're admin
      if (id !== userId) {
        const user = await storage.getUser(userId);
        if (!user?.isAdmin && !user?.isSuperAdmin) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const goals = await storage.getCurrentWritingGoals(id);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching writing goals:", error);
      res.status(500).json({ message: "Failed to fetch writing goals" });
    }
  });

  app.get('/api/suggested/users', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { limit = 5 } = req.query;

      const users = await storage.getSuggestedUsers(userId, parseInt(limit as string));
      res.json(users);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
      res.status(500).json({ message: "Failed to fetch suggested users" });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Image upload route
  app.post('/api/upload/images', requireAuth, writeLimiter, upload.array('images', 4), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const imageUrls = [];

      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filepath = path.join(uploadsDir, filename);

        // Process image with Sharp
        await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toFile(filepath);

        imageUrls.push(`/uploads/${filename}`);
      }

      res.json({ imageUrls });
    } catch (error) {
      console.error("Error uploading images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  // Upload user profile picture endpoint
  app.post('/api/upload/profile-picture', requireAuth, writeLimiter, upload.single('profilePicture'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.session.userId;
      const filename = `profile-${userId}-${Date.now()}.webp`;
      const filepath = path.join(uploadsDir, filename);

      // Resize to 720p (720x720 for profile pictures)
      await sharp(req.file.buffer)
        .resize(720, 720, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 90 })
        .toFile(filepath);

      const imageUrl = `/uploads/${filename}`;

      // Update user's profile picture
      await storage.updateUserProfile(userId, { profileImageUrl: imageUrl });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Upload user cover photo endpoint - separate from series covers
  app.post("/api/upload/user-cover", requireAuth, upload.single('coverPhoto'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.session.userId;
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const filename = `user-cover-${userId}-${timestamp}-${randomId}.webp`;
      const filepath = path.join(uploadsDir, filename);

      // Resize to banner aspect ratio (1920x1080 for user profile covers)
      await sharp(req.file.buffer)
        .resize(1920, 1080, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(filepath);

      const imageUrl = `/uploads/${filename}`;

      // Update user's cover image URL
      await storage.updateUserProfile(userId, { coverImageUrl: imageUrl });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading user cover photo:", error);
      res.status(500).json({ error: "Failed to upload user cover photo" });
    }
  });

  // Upload series cover photo endpoint - separate from user covers
  app.post("/api/upload/series-cover", requireAuth, upload.single('coverPhoto'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.session.userId;
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const filename = `series-cover-${userId}-${timestamp}-${randomId}.webp`;
      const filepath = path.join(uploadsDir, filename);

      // Resize to book cover aspect ratio (3:4 or 9:16)
      await sharp(req.file.buffer)
        .resize(720, 960, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 90 })
        .toFile(filepath);

      const imageUrl = `/uploads/${filename}`;

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading series cover:", error);
      res.status(500).json({ error: "Failed to upload series cover" });
    }
  });

  // Spotify integration routes - mount the spotify routes
  app.use('/api/spotify', spotifyRoutes);

  // Messaging routes
  // Get conversations for current user
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userConversations = await storage.getUserConversations(userId);
      res.json(userConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { participantId } = req.body;

      if (!participantId) {
        return res.status(400).json({ message: "Participant ID is required" });
      }

      if (userId === participantId) {
        return res.status(400).json({ message: "Cannot create conversation with yourself" });
      }

      // Check if conversation already exists
      let conversation = await storage.getConversation(userId, participantId);

      if (!conversation) {
        conversation = await storage.createConversation(userId, participantId);
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:conversationId/messages", requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;

      // Verify user is part of conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            or(
              eq(conversations.participantOneId, req.session.userId!),
              eq(conversations.participantTwoId, req.session.userId!)
            )
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const conversationMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          conversationId: messages.conversationId,
          createdAt: messages.createdAt,
          senderUsername: users.username,
          senderDisplayName: users.displayName,
          senderProfileImageUrl: users.profileImageUrl,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));

      // Format messages to include sender data
      const formattedMessages = conversationMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        sender: {
          id: msg.senderId,
          username: msg.senderUsername || 'unknown',
          displayName: msg.senderDisplayName || 'Unknown User',
          profileImageUrl: msg.senderProfileImageUrl,
        }
      }));

      res.json(formattedMessages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: conversationId } = req.params;
      const { content, messageType = "text", attachmentUrls = [] } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify user is part of the conversation
      const conversations = await storage.getUserConversations(userId);
      const userConversation = conversations.find(c => c.id === conversationId);

      if (!userConversation) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }

      const message = await storage.sendMessage(
        conversationId,
        userId,
        content.trim(),
        messageType,
        attachmentUrls
      );

      // Send response immediately for better UX
      res.json(message);

      // Broadcast message to other participant asynchronously
      const otherParticipantId = userConversation.otherParticipant.id;
      setImmediate(() => {
        (app as any).broadcastMessage?.(otherParticipantId, {
          ...message,
          conversation: userConversation,
          sender: { id: userId }
        });
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.put('/api/conversations/:id/read', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: conversationId } = req.params;

      // Verify user is part of the conversation
      const conversations = await storage.getUserConversations(userId);
      const userConversation = conversations.find(c => c.id === conversationId);

      if (!userConversation) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }

      await storage.markConversationAsRead(conversationId, userId);
      res.json({ message: "Conversation marked as read" });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ message: "Failed to mark conversation as read" });
    }
  });

  // Unsend message route
  app.delete('/api/messages/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: messageId } = req.params;

      // Get message to verify ownership
      const message = await storage.getMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only allow sender to delete their own message
      if (message.senderId !== userId) {
        return res.status(403).json({ message: "You can only delete your own messages" });
      }

      await storage.deleteMessage(messageId);
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Admin routes
  app.post('/api/admin/users/:id/admin', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = req.session.userId;
      const { id: targetUserId } = req.params;
      const { isAdmin } = req.body;

      const user = await storage.setUserAdmin(adminUserId, targetUserId, isAdmin);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Error setting admin status:", error);
      res.status(403).json({ message: (error as Error).message || 'Error setting admin status' });
    }
  });

  app.post('/api/admin/users/:id/verify', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = req.session.userId;
      const { id: targetUserId } = req.params;
      const { isVerified } = req.body;

      const user = await storage.setUserVerified(adminUserId, targetUserId, isVerified);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Error setting verification status:", error);
      res.status(403).json({ message: (error as Error).message || 'Error setting verification status' });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = req.session.userId;
      const { id: targetUserId } = req.params;

      await storage.deleteUserAsAdmin(adminUserId, targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(403).json({ message: (error as Error).message || 'Error deleting user' });
    }
  });

  app.delete('/api/admin/posts/:id', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = req.session.userId;
      const { id: postId } = req.params;

      await storage.deletePostAsAdmin(adminUserId, postId);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(403).json({ message: (error as Error).message || 'Error deleting post' });
    }
  });

  // Edit post route (for post owner)
  app.put('/api/posts/:id', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { title, content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Get post to verify ownership
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Only allow post owner to edit
      if (post.authorId !== userId) {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }

      const updatedPost = await storage.updatePost(postId, {
        title: title?.trim() || null,
        content: content.trim(),
      });

      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Delete post route (for post owner)
  app.delete('/api/posts/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      // Get post to verify ownership
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Only allow post owner to delete
      if (post.authorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      await storage.deletePost(postId);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Report post route
  app.post('/api/posts/:id/report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { reason = "Inappropriate content" } = req.body;

      // Get post to find the author
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Don't allow reporting own posts
      if (post.authorId === userId) {
        return res.status(400).json({ message: "Cannot report your own post" });
      }

      // Create notification for admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'report',
          actorId: userId,
          postId: postId,
          isRead: false,
          data: { reason }
        });
      }

      res.json({ message: "Post reported successfully" });
    } catch (error) {
      console.error("Error reporting post:", error);
      res.status(500).json({ message: "Failed to report post" });
    }
  });

  // Series routes
  app.post('/api/series', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { title, description, genre, tags, coverImageUrl } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      const series = await storage.createSeries({
        authorId: userId,
        title,
        description,
        genre,
        tags: tags || [],
        coverImageUrl
      });

      res.json(series);
    } catch (error) {
      console.error("Error creating series:", error);
      res.status(500).json({ message: "Failed to create series" });
    }
  });

  app.get('/api/series', async (req, res) => {
    try {
      const { limit = 20, offset = 0, genre } = req.query;
      const series = await storage.getPublicSeries(
        parseInt(limit as string),
        parseInt(offset as string),
        genre as string
      );
      res.json(series);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });

  app.get('/api/series/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const series = await storage.getSeriesById(id);

      if (!series) {
        return res.status(404).json({ message: "Series not found" });
      }

      res.json(series);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });

  app.post('/api/series/:id/chapters', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;
      const { title, content, chapterNumber } = req.body;

      // Verify user owns the series
      const series = await storage.getSeriesById(seriesId);
      if (!series || series.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const chapter = await storage.createChapter({
        seriesId,
        title,
        content,
        chapterNumber,
        wordCount: content.split(/\s+/).length
      });

      res.json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  // Get chapter by ID
  app.get('/api/chapters/:id', async (req, res) => {
    try {
      const { id: chapterId } = req.params;

      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chapterId)) {
        return res.status(400).json({ message: "Invalid chapter ID format" });
      }

      const chapter = await storage.getChapterById(chapterId);

      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  // Update chapter
  app.put('/api/chapters/:id', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: chapterId } = req.params;
      const { title, content, chapterNumber } = req.body;

      // Get chapter and verify ownership through series
      const chapter = await storage.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      const series = await storage.getSeriesById(chapter.seriesId);
      if (!series || series.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedChapter = await storage.updateChapter(chapterId, {
        title,
        content,
        chapterNumber,
        wordCount: content.split(/\s+/).length
      });

      res.json(updatedChapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  // Delete chapter
  app.delete('/api/chapters/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: chapterId } = req.params;

      // Get chapter and verify ownership through series
      const chapter = await storage.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      const series = await storage.getSeriesById(chapter.seriesId);
      if (!series || series.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteChapter(chapterId);
      res.json({ message: "Chapter deleted successfully" });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ message: "Failed to delete chapter" });
    }
  });

  // Update series
  app.put('/api/series/:id', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;
      const updateData = req.body;

      // Check if user owns the series
      const series = await storage.getSeriesById(seriesId);
      if (!series || series.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedSeries = await storage.updateSeries(seriesId, updateData);
      res.json(updatedSeries);
    } catch (error) {
      console.error("Error updating series:", error);
      res.status(500).json({ message: "Failed to update series" });
    }
  });

  app.get('/api/series/:id/chapters', async (req, res) => {
    try {
      const { id: seriesId } = req.params;
      const chapters = await storage.getSeriesChapters(seriesId);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.post('/api/series/:id/follow', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;

      const isFollowing = await storage.isFollowingSeries(userId, seriesId);

      if (isFollowing) {
        await storage.unfollowSeries(userId, seriesId);
        res.json({ following: false, message: "Unfollowed series" });
      } else {
        await storage.followSeries(userId, seriesId);
        res.json({ following: true, message: "Following series" });
      }
    } catch (error) {
      console.error("Error toggling series follow:", error);
      res.status(500).json({ message: "Failed to update series follow status" });
    }
  });

  app.post('/api/series/:id/bookmark', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;

      const isBookmarked = await storage.isSeriesBookmarked(userId, seriesId);

      if (isBookmarked) {
        await storage.removeSeriesBookmark(userId, seriesId);
        res.json({ bookmarked: false, message: "Bookmark removed" });
      } else {
        await storage.bookmarkSeries(userId, seriesId);
        res.json({ bookmarked: true, message: "Series bookmarked" });
      }
    } catch (error) {
      console.error("Error toggling series bookmark:", error);
      res.status(500).json({ message: "Failed to update bookmark status" });
    }
  });

  app.post('/api/series/:id/react', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;
      const { reaction } = req.body;

      await storage.reactToSeries(userId, seriesId, reaction);
      res.json({ message: "Reaction added" });
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.post('/api/series/:id/comments', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;
      const { content } = req.body;

      const comment = await storage.createSeriesComment(userId, seriesId, content);
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/series/:id/comments', async (req, res) => {
    try {
      const { id: seriesId } = req.params;
      const comments = await storage.getSeriesComments(seriesId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.get('/api/series/:id/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;

      const progress = await storage.getReadingProgress(userId, seriesId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching reading progress:", error);
      res.status(500).json({ message: "Failed to fetch reading progress" });
    }
  });

  app.put('/api/series/:id/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;
      const { chapterIndex } = req.body;

      await storage.updateReadingProgress(userId, seriesId, chapterIndex);
      res.json({ message: "Progress updated" });
    } catch (error) {
      console.error("Error updating reading progress:", error);
      res.status(500).json({ message: "Failed to update reading progress" });
    }
  });

  // Leaderboard routes (public access)
  app.get('/api/leaderboard/posts', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const topPosts = await storage.getTopPostsByLikes(parseInt(limit as string));
      res.json(topPosts);
    } catch (error: any) {
      console.error("Error fetching top posts:", error);
      res.status(500).json({ message: "Failed to fetch top posts" });
    }
  });

  app.get('/api/leaderboard/stories', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const topStories = await storage.getTopStoriesByLikes(parseInt(limit as string));
      res.json(topStories);
    } catch (error: any) {
      console.error("Error fetching top stories:", error);
      res.status(500).json({ message: "Failed to fetch top stories" });
    }
  });

  app.get('/api/leaderboard/authors', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const topAuthors = await storage.getTopAuthorsByStoryLikes(parseInt(limit as string));
      res.json(topAuthors);
    } catch (error: any) {
      console.error("Error fetching top authors:", error);
      res.status(500).json({ message: "Failed to fetch top authors" });
    }
  });

  // Series like route
  app.post('/api/series/:id/like', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: seriesId } = req.params;

      const hasLiked = await storage.hasUserLikedSeries(userId, seriesId);

      if (hasLiked) {
        await storage.unlikeSeries(userId, seriesId);
        res.json({ liked: false, message: "Series unliked" });
      } else {
        await storage.likeSeries(userId, seriesId);
        res.json({ liked: true, message: "Series liked" });
      }
    } catch (error) {
      console.error("Error toggling series like:", error);
      res.status(500).json({ message: "Failed to toggle series like" });
    }
  });

  // Explore routes (public access)
  app.get('/api/explore/trending-topics', async (req, res) => {
    try {
      const trendingTopics = await storage.getTrendingTopics();
      res.json(trendingTopics);
    } catch (error: any) {
      console.error("Error fetching trending topics:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch trending topics" });
    }
  });

  app.get('/api/explore/popular', async (req, res) => {
    try {
      const popularPosts = await storage.getPopularPosts();
      res.json(popularPosts);
    } catch (error: any) {
      console.error("Error fetching popular posts:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch popular posts" });
    }
  });

  // User discovery and search routes
  app.get('/api/users/recommended', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const recommendedUsers = await storage.getRecommendedUsers(userId);
      res.json(recommendedUsers);
    } catch (error: any) {
      console.error("Error fetching recommended users:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch recommended users" });
    }
  });

  app.get('/api/users/trending', async (req, res) => {
    try {
      const trendingUsers = await storage.getTrendingUsers();
      res.json(trendingUsers);
    } catch (error: any) {
      console.error("Error fetching trending users:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch trending users" });
    }
  });

  app.get('/api/posts/popular', requireAuth, async (req: any, res) => {
    try {
      const popularPosts = await storage.getPopularPosts();
      res.json(popularPosts);
    } catch (error: any) {
      console.error("Error fetching popular posts:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch popular posts" });
    }
  });

  app.get('/api/search', requireAuth, async (req: any, res) => {
    try {
      const { q: query } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await storage.searchContent(query.trim());
      res.json(results);
    } catch (error: any) {
      console.error("Error performing search:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket connection registry for broadcasting
  const userConnections = new Map<string, Set<WebSocket>>();

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    // Authenticate user using the same session middleware
    sessionMiddleware(req as any, {} as any, () => {
      const userId = (req as any).session?.userId;

      if (userId) {
        (ws as any).userId = userId;
        (ws as any).authenticated = true;
        console.log(`WebSocket authenticated for user: ${userId}`);

        // Add to user connections registry
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId)!.add(ws);

        // Send authentication success
        ws.send(JSON.stringify({
          type: 'auth_success',
          userId: userId
        }));
      } else {
        console.log('WebSocket connection rejected: not authenticated');
        ws.close(4001, 'Authentication required');
        return;
      }
    });

    ws.on('message', (message) => {
      try {
        // Only process messages from authenticated connections
        if (!(ws as any).authenticated) {
          ws.close(4001, 'Not authenticated');
          return;
        }

        const data = JSON.parse(message.toString());

        // Handle different types of real-time events
        switch (data.type) {
          case 'ping':
            // Heartbeat to keep connection alive
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'typing_start':
            // Broadcast typing indicator
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'user_typing',
                  userId: data.userId,
                  postId: data.postId,
                }));
              }
            });
            break;

          case 'typing_stop':
            // Broadcast typing stop
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'user_stopped_typing',
                  userId: data.userId,
                  postId: data.postId,
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const userId = (ws as any).userId;
      console.log(`WebSocket connection closed for user: ${userId}`);

      // Remove from user connections registry
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId)!.delete(ws);
        if (userConnections.get(userId)!.size === 0) {
          userConnections.delete(userId);
        }
      }
    });
  });

  // Decoupled notification broadcaster
  const broadcastNotification = (userId: string, notification: any) => {
    const connections = userConnections.get(userId);
    if (connections) {
      const message = JSON.stringify({
        type: 'notification',
        data: notification,
      });

      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  // Decoupled message broadcaster
  const broadcastMessage = (userId: string, message: any) => {
    const connections = userConnections.get(userId);
    if (connections) {
      const payload = JSON.stringify({
        type: 'new_message',
        data: message,
      });

      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  };

  // Expose broadcasters for use in API routes
  (app as any).broadcastNotification = broadcastNotification;
  (app as any).broadcastMessage = broadcastMessage;

  return httpServer;
}