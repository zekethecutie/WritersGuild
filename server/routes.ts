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
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { insertPostSchema, insertCommentSchema } from "@shared/schema";
import { getSpotifyClient } from "./spotifyClient";
import spotifyRoutes from "./spotifyRoutes";
import { eq, or } from "drizzle-orm";
import { db } from "./db";
import { Request, Response, NextFunction } from "express";
import { generateId } from "./utils"; // Assuming generateId is defined elsewhere
import * as schema from "@shared/schema"; // Import unified schema

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
  // Generate fallback secret for development
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-writers-guild-' + Math.random().toString(36);

  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'sessions',
    pruneSessionInterval: 60 * 60 * 24, // 24 hours
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Secure cookies in production
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// Create single session middleware instance to share
const sessionMiddleware = createSessionMiddleware();

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check - Session:', req.session);
  console.log('Auth check - User ID:', req.session?.userId);

  if (!req.session?.userId) {
    console.log('No session or userId found');
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Optional auth middleware - allows both authenticated and unauthenticated users
function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just add user info to request if available, don't block
  next();
}

// WebSocket connections by user ID
const wsConnections = new Map<string, WebSocket[]>();

function broadcastToUser(userId: string, data: any) {
  const connections = wsConnections.get(userId) || [];
  const message = JSON.stringify(data);

  // Remove closed connections and broadcast to active ones
  const activeConnections = connections.filter(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      return true;
    }
    return false;
  });

  wsConnections.set(userId, activeConnections);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Test endpoint
  app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
  });

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

  // Trust proxy for session cookies
  app.set("trust proxy", 1);

  // Apply session middleware BEFORE other middlewares
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

  // Test route to create test user
  app.post('/api/create-test-user', async (req, res) => {
    try {
      // Check if test user already exists
      const existingUser = await storage.getUserByUsername('testuser');
      if (existingUser) {
        return res.json({ message: 'Test user already exists', user: { ...existingUser, password: undefined } });
      }

      const hashedPassword = await bcrypt.hash('test123', 10);

      const user = await storage.createUser({
        email: 'test@example.com',
        password: hashedPassword,
        displayName: 'Test User',
        username: 'testuser',
      });

      res.json({ message: 'Test user created successfully', user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Test user creation error:", error);
      res.status(500).json({ message: "Failed to create test user", error: (error as Error).message });
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password, displayName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate input
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "Username must be 3-30 characters long" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await db.select().from(schema.users).where(
        or(
          eq(schema.users.username, username),
          eq(schema.users.email, email)
        )
      ).limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(schema.users).values({
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
      }).returning();

      const { password: _, ...userWithoutPassword } = newUser;

      // Set session
      req.session.userId = newUser.id;
      req.session.username = newUser.username;

      console.log("User registered successfully:", username);
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
      }

      console.log("Login attempt for:", username);

      // Find user by username or email
      const [user] = await db.select().from(schema.users).where(
        or(
          eq(schema.users.username, username),
          eq(schema.users.email, username)
        )
      ).limit(1);

      if (!user || !user.password) {
        console.log("User not found:", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log("Invalid password for:", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;

      console.log("Login successful for:", username);
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
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

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        req.session.destroy(() => {});
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
      const updateData = req.body;

      const user = await storage.updateUserProfile(userId, updateData);
      res.json(user);
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
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Get posts with infinite scroll
  app.get("/api/posts", optionalAuth, async (req, res) => {
    try {
      const { limit = 20, offset = 0, userId } = req.query;
      const posts = await storage.getPosts(
        parseInt(limit as string),
        parseInt(offset as string),
        userId as string
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getPost(id);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
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
  app.post('/api/users/:id/follow', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const followerId = req.session.userId;
      const { id: followingId } = req.params;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following user" });
      }

      const follow = await storage.followUser(followerId, followingId);

      // Create follow notification
      const notification = await storage.createNotification({
        userId: followingId,
        type: 'follow',
        actorId: followerId,
        postId: null,
        isRead: false,
        data: {}
      });

      // Broadcast real-time notification
      if ((app as any).broadcastNotification) {
        (app as any).broadcastNotification(followingId, notification);
      }

      res.json(follow);
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

  // Repost routes
  app.post('/api/posts/:id/repost', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { comment } = req.body;

      const repost = await storage.repostPost(userId, postId, comment);

      // Get post to find the author for notification
      const post = await storage.getPost(postId);
      if (post && post.authorId !== userId) {
        // Create repost notification
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

      res.json(repost);
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

      const bookmark = await storage.bookmarkPost(userId, postId);
      res.json(bookmark);
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
  // Get trending posts
  app.get("/api/trending/posts", optionalAuth, async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const posts = await storage.getTrendingPosts(parseInt(limit as string));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching trending posts:", error);
      res.status(500).json({ message: "Failed to fetch trending posts" });
    }
  });

  // Get trending topics
  app.get("/api/explore/trending-topics", optionalAuth, async (req, res) => {
    try {
      const topics = await storage.getTrendingTopics();
      res.json(topics);
    } catch (error: any) {
      console.error("Error fetching trending topics:", error);
      if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      res.status(500).json({ message: "Failed to fetch trending topics" });
    }
  });

  app.get('/api/users/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;
      const stats = await storage.getUserStats(id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
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

  // Profile picture upload route
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

  // Cover photo upload route
  app.post('/api/upload/cover-photo', requireAuth, writeLimiter, upload.single('coverPhoto'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.session.userId;
      const filename = `cover-${userId}-${Date.now()}.webp`;
      const filepath = path.join(uploadsDir, filename);

      // Resize to 1080p (1920x1080 for cover photos)
      await sharp(req.file.buffer)
        .resize(1920, 1080, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(filepath);

      const imageUrl = `/uploads/${filename}`;

      // Update user's cover photo
      await storage.updateUserProfile(userId, { coverImageUrl: imageUrl });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading cover photo:", error);
      res.status(500).json({ message: "Failed to upload cover photo" });
    }
  });

  // Spotify integration routes
  app.get('/api/spotify/search', requireAuth, async (req, res) => {
    try {
      const { q: query, type = 'track', limit = 20 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const spotify = await getSpotifyClient();
      const searchLimit = Math.min(50, Math.max(1, parseInt(limit as string, 10)) || 20) as any;
      const results = await spotify.search(query as string, [type as any], 'US', searchLimit);
      res.json(results);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      res.status(500).json({ message: "Failed to search Spotify" });
    }
  });

  app.get('/api/spotify/track/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const spotify = await getSpotifyClient();
      const track = await spotify.tracks.get(id);
      res.json(track);
    } catch (error) {
      console.error("Error fetching Spotify track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  // Messaging routes
  app.get('/api/conversations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
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

  app.get('/api/conversations/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Verify user is part of the conversation
      const conversations = await storage.getUserConversations(userId);
      const userConversation = conversations.find(c => c.id === conversationId);

      if (!userConversation) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }

      const messages = await storage.getConversationMessages(
        conversationId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
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

      // Broadcast message to other participant
      const otherParticipantId = userConversation.otherParticipant.id;
      (app as any).broadcastMessage?.(otherParticipantId, {
        ...message,
        conversation: userConversation,
        sender: { id: userId }
      });

      res.json(message);
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

  // Explore routes (public access)
  // Get trending topics
  app.get("/api/explore/trending-topics", optionalAuth, async (req, res) => {
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

  // Get popular posts for explore page
  app.get("/api/explore/popular", optionalAuth, async (req, res) => {
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

  // Get trending users
  app.get("/api/users/trending", optionalAuth, async (req, res) => {
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

  // WebSocket server for real-time features - properly attach to HTTP server after it's listening
  const wss = new WebSocketServer({ 
    noServer: true
  });

  // Handle WebSocket upgrade on the HTTP server with proper session handling
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      // Parse session before upgrade
      sessionMiddleware(request as any, {} as any, () => {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

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