import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
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
import { users as usersTable, posts, comments, notifications, series, chapters, bookmarks, likes, follows, reposts, postCollaborators } from "../shared/schema"; // Import necessary tables and schema
import { insertPostSchema, insertCommentSchema } from "@shared/schema";
import { DatabaseStorage } from "./storage";
import { getSpotifyClient } from "./spotifyClient";
import spotifyRoutes from "./spotifyRoutes";
import crypto from 'crypto';

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

// Session type extension
declare module 'express-session' {
  interface SessionData {
    userId: string;
    user: any;
  }
}

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Require admin middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin && !user?.isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Internal server error during admin check" });
  }
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

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('GET /api/auth/user - Session ID:', req.session?.userId);
      console.log('GET /api/auth/user - Session data:', req.session);

      if (!req.session?.userId) {
        console.log('No session found, user not authenticated');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found in database:', userId);
        return res.status(401).json({ message: "User not found" });
      }

      console.log('User found, returning user data:', user.username);
      res.json({ user: { ...user, password: undefined } });
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

  // Search users
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const searchTerm = q.toLowerCase().trim();

      const users = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(usersTable)
        .where(
          sql`LOWER(${usersTable.username}) LIKE ${`%${searchTerm}%`} OR LOWER(${usersTable.displayName}) LIKE ${`%${searchTerm}%`}`
        )
        .limit(10);

      res.json(users);
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get user profile
  app.get("/api/users/:username", async (req, res) => {
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
      const { title, content, category, excerpt, coverImageUrl, privacy, imageUrls, spotifyTrackData, collaborators: collaboratorIds, mentions, hashtags } = req.body;

      // Validate content presence
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Placeholder for content processing (e.g., markdown to HTML)
      const processedContent = content; // Replace with actual processing if needed

      // Count words in content for tracking
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Auto-generate excerpt if not provided
      const finalExcerpt = excerpt?.trim() || content.replace(/<[^>]*>/g, '').slice(0, 200);

      // Calculate read time (average 200 words per minute)
      const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

      // Create the post
      const postData = {
        authorId: userId,
        title: title || null,
        content,
        formattedContent: processedContent,
        excerpt: finalExcerpt,
        category: category || 'general',
        coverImageUrl: coverImageUrl || null,
        readTimeMinutes,
        publishedAt: new Date(),
        spotifyTrackId: spotifyTrackData?.id || null,
        spotifyTrackData: spotifyTrackData || null,
        imageUrls: imageUrls || [],
        isPrivate: privacy === "private",
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        viewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newPost = await storage.createPost(postData);

      // Send collaboration invitations
      if (collaboratorIds && collaboratorIds.length > 0) {
        for (const collaboratorId of collaboratorIds) {
          // Create collaborator invitation
          const [collaboration] = await db.insert(postCollaborators).values({
            postId: newPost.id,
            collaboratorId,
            invitedById: userId,
            status: 'pending'
          }).returning();

          // Send notification to collaborator with collaboration ID
          const notification = await storage.createNotification({
            userId: collaboratorId,
            type: 'collaboration_invite',
            actorId: userId,
            postId: newPost.id,
            isRead: false,
            data: { postTitle: title || 'Untitled Post', collaborationId: collaboration.id }
          });

          // Broadcast real-time notification
          if ((app as any).broadcastNotification) {
            (app as any).broadcastNotification(collaboratorId, notification);
          }
        }
      }

      // Send notifications to mentioned users
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        for (const username of mentions) {
          try {
            const mentionedUser = await storage.getUserByUsername(username);
            if (mentionedUser && mentionedUser.id !== userId) {
              // Create and broadcast notification
              const notification = await storage.createNotification({
                userId: mentionedUser.id,
                type: 'mention',
                actorId: userId,
                postId: newPost.id,
                isRead: false,
                data: { postTitle: title || 'Untitled Post' }
              });

              // Broadcast real-time notification
              if ((app as any).broadcastNotification) {
                (app as any).broadcastNotification(mentionedUser.id, notification);
              }
            }
          } catch (error) {
            console.error(`Failed to notify mentioned user @${username}:`, error);
          }
        }
      }

      // Update word count for today
      if (wordCount > 0) {
        await storage.updateDailyWordCount(userId, wordCount);
      }

      res.json(newPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Get single post with collaborators
  app.get('/api/posts/:id', async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = (req as any).session?.userId;

      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Get author data
      const author = await storage.getUser(post.authorId);

      // Get accepted collaborators
      const collaborators = await storage.getPostCollaborators(postId);

      // Get engagement data for current user if logged in
      let isLiked = false;
      let isBookmarked = false;
      let isReposted = false;

      if (userId) {
        const [hasLiked, hasBookmarked, hasReposted] = await Promise.all([
          storage.hasUserLikedPost(userId, postId),
          storage.isPostBookmarked(userId, postId),
          storage.hasUserReposted(userId, postId),
        ]);
        isLiked = hasLiked;
        isBookmarked = hasBookmarked;
        isReposted = hasReposted;
      }

      res.json({
        ...post,
        author,
        collaborators,
        isLiked,
        isBookmarked,
        isReposted,
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Get posts with engagement data
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = req.session?.userId;

      const postsQuery = db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          excerpt: posts.excerpt,
          category: posts.category,
          coverImageUrl: posts.coverImageUrl,
          readTimeMinutes: posts.readTimeMinutes,
          publishedAt: posts.publishedAt,
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
          authorDisplayName: usersTable.displayName,
          authorUsername: usersTable.username,
          authorProfileImageUrl: usersTable.profileImageUrl,
          authorIsVerified: usersTable.isVerified,
          authorIsAdmin: usersTable.isAdmin,
          authorIsSuperAdmin: usersTable.isSuperAdmin,
          authorUserRole: usersTable.userRole,
        })
        .from(posts)
        .leftJoin(usersTable, eq(posts.authorId, usersTable.id))
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

      // Get collaborators for all posts
      const postIds = postsData.map(post => post.id);
      const collaboratorsData = await db
        .select({
          postId: postCollaborators.postId,
          collaboratorId: postCollaborators.collaboratorId,
          collaboratorUsername: usersTable.username,
          collaboratorDisplayName: usersTable.displayName,
          collaboratorProfileImageUrl: usersTable.profileImageUrl,
          status: postCollaborators.status
        })
        .from(postCollaborators)
        .leftJoin(usersTable, eq(postCollaborators.collaboratorId, usersTable.id))
        .where(and(
          inArray(postCollaborators.postId, postIds),
          eq(postCollaborators.status, 'accepted')
        ));

      // Group collaborators by post ID
      const collaboratorsByPost = collaboratorsData.reduce((acc, collab) => {
        if (!acc[collab.postId]) {
          acc[collab.postId] = [];
        }
        acc[collab.postId].push({
          id: collab.collaboratorId,
          username: collab.collaboratorUsername,
          displayName: collab.collaboratorDisplayName,
          profileImageUrl: collab.collaboratorProfileImageUrl
        });
        return acc;
      }, {} as Record<string, any[]>);

      const postsWithEngagement = postsData.map(post => ({
        id: post.id,
        authorId: post.authorId,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        readTimeMinutes: post.readTimeMinutes,
        publishedAt: post.publishedAt,
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
        collaborators: collaboratorsByPost[post.id] || [],
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

  // Get popular music from posts - specific route for home page
  app.get("/api/posts/popular-music", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      const musicPosts = await db
        .select({
          spotifyTrackData: posts.spotifyTrackData,
          likesCount: posts.likesCount
        })
        .from(posts)
        .where(and(
          eq(posts.isPrivate, false),
          sql`${posts.spotifyTrackData} IS NOT NULL`
        ))
        .orderBy(desc(posts.likesCount))
        .limit(parseInt(limit as string));

      // Extract unique Spotify tracks
      const tracks = musicPosts
        .filter(post => post.spotifyTrackData)
        .map(post => {
          const trackData = post.spotifyTrackData as any;
          return {
            id: trackData.id,
            name: trackData.name,
            artist: trackData.artist,
            album: trackData.album,
            image: trackData.image,
            preview_url: trackData.preview_url,
            external_urls: trackData.external_urls
          };
        })
        .filter((track, index, self) => 
          index === self.findIndex(t => t?.id === track?.id)
        )
        .slice(0, parseInt(limit as string));

      res.json(tracks);
    } catch (error) {
      console.error("Error fetching popular music:", error);
      res.status(500).json([]);
    }
  });

  // Get single post with comments
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session?.userId;

      // Get the post with author data in one query
      const [postData] = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          excerpt: posts.excerpt,
          category: posts.category,
          coverImageUrl: posts.coverImageUrl,
          readTimeMinutes: posts.readTimeMinutes,
          publishedAt: posts.publishedAt,
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
          authorDisplayName: usersTable.displayName,
          authorUsername: usersTable.username,
          authorProfileImageUrl: usersTable.profileImageUrl,
          authorIsVerified: usersTable.isVerified,
          authorIsAdmin: usersTable.isAdmin,
          authorIsSuperAdmin: usersTable.isSuperAdmin,
          authorUserRole: usersTable.userRole,
        })
        .from(posts)
        .leftJoin(usersTable, eq(posts.authorId, usersTable.id))
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
        excerpt: postData.excerpt,
        category: postData.category,
        coverImageUrl: postData.coverImageUrl,
        readTimeMinutes: postData.readTimeMinutes,
        publishedAt: postData.publishedAt,
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

  // Get user's reposts
  app.get('/api/users/:userId/reposts', async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.session?.userId;

      const repostedPosts = await storage.getUserReposts(userId);

      // Fetch author data and collaborators for each post
      const postsWithAuthors = await Promise.all(
        repostedPosts.map(async (post) => {
          const author = await storage.getUser(post.authorId);
          const collaborators = await storage.getPostCollaborators(post.id);

          // Get engagement data for current user if logged in
          let isLiked = false;
          let isBookmarked = false;
          let isReposted = true; // Always true for reposts page

          if (currentUserId) {
            const [hasLiked, hasBookmarked] = await Promise.all([
              storage.hasUserLikedPost(currentUserId, post.id),
              storage.isPostBookmarked(currentUserId, post.id),
            ]);
            isLiked = hasLiked;
            isBookmarked = hasBookmarked;
          }

          return {
            ...post,
            author,
            collaborators,
            isLiked,
            isBookmarked,
            isReposted,
          };
        })
      );

      res.json(postsWithAuthors);
    } catch (error) {
      console.error("Error fetching user reposts:", error);
      res.status(500).json({ message: "Failed to fetch user reposts" });
    }
  });

  // Get user's bookmarks
  app.get('/api/users/:userId/bookmarks', async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.session?.userId;

      // Only allow users to see their own bookmarks
      if (!currentUserId || currentUserId !== userId) {
        return res.status(403).json({ message: "You can only view your own bookmarks" });
      }

      const bookmarkedPosts = await storage.getUserBookmarks(userId);

      // Fetch author data for each post
      const postsWithAuthors = await Promise.all(
        bookmarkedPosts.map(async (post) => {
          const author = await storage.getUser(post.authorId);

          // Get engagement data for current user if logged in
          let isLiked = false;
          let isBookmarked = true; // Always true for bookmarks page
          let isReposted = false;

          if (currentUserId) {
            const [hasLiked, hasReposted] = await Promise.all([
              storage.hasUserLikedPost(currentUserId, post.id),
              storage.hasUserReposted(currentUserId, post.id),
            ]);
            isLiked = hasLiked;
            isReposted = hasReposted;
          }

          return {
            ...post,
            author,
            isLiked,
            isBookmarked,
            isReposted,
          };
        })
      );

      res.json(postsWithAuthors);
    } catch (error) {
      console.error("Error fetching user bookmarks:", error);
      res.status(500).json({ message: "Failed to fetch user bookmarks" });
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
        
        // Decrement repost count
        await db
          .update(posts)
          .set({ repostsCount: sql`${posts.repostsCount} - 1` })
          .where(eq(posts.id, postId));
        
        res.json({ reposted: false, message: "Repost removed" });
      } else {
        const repost = await storage.repostPost(userId, postId, comment);

        // Increment repost count
        await db
          .update(posts)
          .set({ repostsCount: sql`${posts.repostsCount} + 1` })
          .where(eq(posts.id, postId));

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
  app.get('/api/users/search', requireAuth, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }

      const searchQuery = q.trim();
      if (searchQuery.length === 0) {
        return res.json([]);
      }

      const searchResults = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          profileImageUrl: usersTable.profileImageUrl,
          bio: usersTable.bio,
        })
        .from(usersTable)
        .where(
          or(
            ilike(usersTable.username, `%${searchQuery}%`),
            ilike(usersTable.displayName, `%${searchQuery}%`)
          )
        )
        .limit(10);

      console.log(`User search for "${searchQuery}" found ${searchResults.length} results`);
      res.json(searchResults);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/search/users', async (req, res) => {
    try {
      const { q: query, limit = 10 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const users = await storage.searchUsers(query as string, req.session?.userId, parseInt(limit as string));
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
  // Get all series (public)
  app.get("/api/series", async (req, res) => {
    try {
      const { authorId } = req.query;

      let whereCondition;
      
      if (authorId && typeof authorId === 'string') {
        whereCondition = and(eq(series.isPrivate, false), eq(series.authorId, authorId));
      } else {
        whereCondition = eq(series.isPrivate, false);
      }

      const query = db
        .select({
          series: series,
          author: {
            id: usersTable.id,
            username: usersTable.username,
            displayName: usersTable.displayName,
            profileImageUrl: usersTable.profileImageUrl,
            isVerified: usersTable.isVerified,
          },
        })
        .from(series)
        .leftJoin(usersTable, eq(series.authorId, usersTable.id))
        .where(whereCondition)
        .orderBy(desc(series.createdAt))
        .limit(50);

      const result = await query;

      const formattedSeries = result.map((s) => ({
        ...s.series,
        author: s.author,
      }));

      res.json(formattedSeries);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({ error: "Failed to fetch series" });
    }
  });

  // Get user's own series (authenticated)
  app.get("/api/series/my-series", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await db
        .select({
          series: series,
          author: {
            id: usersTable.id,
            username: usersTable.username,
            displayName: usersTable.displayName,
            profileImageUrl: usersTable.profileImageUrl,
            isVerified: usersTable.isVerified,
          },
        })
        .from(series)
        .leftJoin(usersTable, eq(series.authorId, usersTable.id))
        .where(eq(series.authorId, userId))
        .orderBy(desc(series.createdAt));

      const formattedSeries = result.map((s) => ({
        ...s.series,
        author: s.author,
      }));

      console.log(`Fetched ${formattedSeries.length} series for user ${userId}`);
      res.json(formattedSeries);
    } catch (error) {
      console.error("Error fetching user's series:", error);
      res.status(500).json({ error: "Failed to fetch series" });
    }
  });

  // Get my published posts (articles)
  app.get("/api/my-posts", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const posts = await storage.getPostsByUser(userId, 100, 0);
      res.json(posts || []);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ error: "Failed to fetch user posts" });
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

  // Collaboration routes
  app.post('/api/collaborations/:id/accept', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: collaborationId } = req.params;

      // Get collaboration details
      const [collaboration] = await db
        .select()
        .from(postCollaborators)
        .where(eq(postCollaborators.id, collaborationId));

      if (!collaboration) {
        return res.status(404).json({ message: "Collaboration invitation not found" });
      }

      // Verify the user is the collaborator
      if (collaboration.collaboratorId !== userId) {
        return res.status(403).json({ message: "Unauthorized to accept this invitation" });
      }

      // Update status to accepted
      await db
        .update(postCollaborators)
        .set({ 
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(postCollaborators.id, collaborationId));

      // Create notification for the inviter
      const notification = await storage.createNotification({
        userId: collaboration.invitedById,
        type: 'collaboration_accepted',
        actorId: userId,
        postId: collaboration.postId,
        isRead: false,
        data: {}
      });

      // Broadcast real-time notification
      if ((app as any).broadcastNotification) {
        (app as any).broadcastNotification(collaboration.invitedById, notification);
      }

      res.json({ message: "Collaboration accepted" });
    } catch (error) {
      console.error("Error accepting collaboration:", error);
      res.status(500).json({ message: "Failed to accept collaboration" });
    }
  });

  app.post('/api/collaborations/:id/decline', requireAuth, writeLimiter, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: collaborationId } = req.params;

      // Get collaboration details
      const [collaboration] = await db
        .select()
        .from(postCollaborators)
        .where(eq(postCollaborators.id, collaborationId));

      if (!collaboration) {
        return res.status(404).json({ message: "Collaboration invitation not found" });
      }

      // Verify the user is the collaborator
      if (collaboration.collaboratorId !== userId) {
        return res.status(403).json({ message: "Unauthorized to decline this invitation" });
      }

      // Update status to declined
      await db
        .update(postCollaborators)
        .set({ status: 'declined' })
        .where(eq(postCollaborators.id, collaborationId));

      res.json({ message: "Collaboration declined" });
    } catch (error) {
      console.error("Error declining collaboration:", error);
      res.status(500).json({ message: "Failed to decline collaboration" });
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

  // Collaborator routes
  app.post('/api/posts/:id/collaborators', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { collaboratorIds } = req.body;

      if (!Array.isArray(collaboratorIds) || collaboratorIds.length === 0) {
        return res.status(400).json({ message: "Collaborator IDs are required" });
      }

      // Verify user owns the post
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post || post.authorId !== userId) {
        return res.status(403).json({ message: "You can only add collaborators to your own posts" });
      }

      // Remove existing pending collaborators
      await db.delete(postCollaborators).where(
        and(
          eq(postCollaborators.postId, postId),
          eq(postCollaborators.status, 'pending')
        )
      );

      // Add new collaborators with pending status
      if (collaboratorIds.length > 0) {
        for (const collaboratorId of collaboratorIds) {
          await db.insert(postCollaborators).values({
            postId,
            collaboratorId,
            invitedById: userId,
            status: 'pending'
          });

          // Send notification
          const notification = await storage.createNotification({
            userId: collaboratorId,
            type: 'collaboration_invite',
            actorId: userId,
            postId: postId,
            isRead: false,
            data: {}
          });

          if ((app as any).broadcastNotification) {
            (app as any).broadcastNotification(collaboratorId, notification);
          }
        }
      }

      res.json({ message: "Collaboration invitations sent" });
    } catch (error) {
      console.error("Error updating collaborators:", error);
      res.status(500).json({ message: "Failed to update collaborators" });
    }
  });

  // Accept collaboration invitation
  app.post('/api/collaborations/:postId/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { postId } = req.params;

      await db
        .update(postCollaborators)
        .set({ status: 'accepted' })
        .where(
          and(
            eq(postCollaborators.postId, postId),
            eq(postCollaborators.collaboratorId, userId),
            eq(postCollaborators.status, 'pending')
          )
        );

      res.json({ message: "Collaboration accepted" });
    } catch (error) {
      console.error("Error accepting collaboration:", error);
      res.status(500).json({ message: "Failed to accept collaboration" });
    }
  });

  // Reject collaboration invitation
  app.post('/api/collaborations/:postId/reject', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { postId } = req.params;

      await db
        .delete(postCollaborators)
        .where(
          and(
            eq(postCollaborators.postId, postId),
            eq(postCollaborators.collaboratorId, userId),
            eq(postCollaborators.status, 'pending')
          )
        );

      res.json({ message: "Collaboration rejected" });
    } catch (error) {
      console.error("Error rejecting collaboration:", error);
      res.status(500).json({ message: "Failed to reject collaboration" });
    }
  });

  app.get('/api/posts/:id/collaborators', async (req, res) => {
    try {
      const { id: postId } = req.params;

      const collaborators = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          profileImageUrl: usersTable.profileImageUrl,
          status: postCollaborators.status
        })
        .from(postCollaborators)
        .leftJoin(usersTable, eq(postCollaborators.collaboratorId, usersTable.id))
        .where(eq(postCollaborators.postId, postId));

      res.json(collaborators);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  app.delete('/api/posts/:id/collaborators/:userId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId, userId: collaboratorId } = req.params;

      // Verify user owns the post
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post || post.authorId !== userId) {
        return res.status(403).json({ message: "You can only remove collaborators from your own posts" });
      }

      await db
        .delete(postCollaborators)
        .where(and(
          eq(postCollaborators.postId, postId),
          eq(postCollaborators.collaboratorId, collaboratorId)
        ));

      res.json({ message: "Collaborator removed successfully" });
    } catch (error) {
      console.error("Error removing collaborator:", error);
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const userCount = await db.select().from(usersTable);
      const postCount = await db.select().from(posts);
      const commentCount = await db.select().from(comments);

      res.json({
        users: userCount.length,
        posts: postCount.length,
        comments: commentCount.length
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Create test user for admin testing
  app.post('/api/admin/create-test-user', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { username, displayName, email } = req.body;

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      const [newUser] = await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        username,
        displayName,
        email,
        passwordHash: hashedPassword,
        role: 'user',
        bio: 'Test user for collaboration testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      res.json({ 
        message: "Test user created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName,
          email: newUser.email
        }
      });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

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
      const { title, content, category, excerpt, coverImageUrl, privacy, imageUrls, spotifyTrackData, collaborators } = req.body;

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

      const updateData: any = {
        title: title?.trim() || null,
        content: content.trim(),
      };

      if (category) updateData.category = category;
      if (excerpt) updateData.excerpt = excerpt;
      if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
      if (privacy !== undefined) updateData.isPrivate = privacy === 'private';
      if (imageUrls) updateData.imageUrls = imageUrls;
      if (spotifyTrackData) updateData.spotifyTrackData = spotifyTrackData;

      const updatedPost = await storage.updatePost(postId, updateData);

      // Handle collaborators separately if provided
      if (collaborators !== undefined) {
        // Remove existing collaborators
        await db.delete(postCollaborators).where(eq(postCollaborators.postId, postId));

        // Add new collaborators
        if (collaborators && collaborators.length > 0) {
          await db.insert(postCollaborators).values(
            collaborators.map((collaboratorId: string) => ({
              postId,
              collaboratorId,
              invitedById: userId,
              status: 'accepted'
            }))
          );
        }
      }

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

  // Settings endpoints
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { displayName, bio, location, website } = req.body;

      const updatedUser = await storage.updateUserProfile(userId, {
        displayName,
        bio,
        location,
        website,
      });
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put('/api/user/privacy', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { profileVisibility, showEmail, showFollowers, showFollowing, allowMessages, allowCollaborations } = req.body;

      // Store privacy settings in session for now (would be database in production)
      if (!req.session) req.session = {};
      req.session.privacySettings = {
        profileVisibility,
        showEmail,
        showFollowers,
        showFollowing,
        allowMessages,
        allowCollaborations,
      };

      res.json({ success: true, message: "Privacy settings updated" });
    } catch (error: any) {
      console.error("Error updating privacy settings:", error);
      res.status(500).json({ message: "Failed to update privacy settings" });
    }
  });

  app.put('/api/user/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { emailNotifications, pushNotifications, commentNotifications, followNotifications, collaborationNotifications, weeklyDigest } = req.body;

      // Store notification settings in session for now (would be database in production)
      if (!req.session) req.session = {};
      req.session.notificationSettings = {
        emailNotifications,
        pushNotifications,
        commentNotifications,
        followNotifications,
        collaborationNotifications,
        weeklyDigest,
      };

      res.json({ success: true, message: "Notification settings updated" });
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  app.put('/api/user/theme', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { colorScheme, fontSize, compactMode } = req.body;

      // Store theme settings in session for now (would be database in production)
      if (!req.session) req.session = {};
      req.session.themeSettings = {
        colorScheme,
        fontSize,
        compactMode,
      };

      res.json({ success: true, message: "Theme settings updated" });
    } catch (error: any) {
      console.error("Error updating theme settings:", error);
      res.status(500).json({ message: "Failed to update theme settings" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}