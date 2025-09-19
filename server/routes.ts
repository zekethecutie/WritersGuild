
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
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { insertPostSchema, insertCommentSchema } from "@shared/schema";
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

// Session middleware
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize admin account
  await storage.initializeAdminAccount();

  // Session middleware
  app.set("trust proxy", 1);
  app.use(getSession());

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

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, username } = req.body;

      // Check if email is provided and user already exists
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists with this email" });
        }
      }

      // Check if username is taken
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email: email || undefined,
        password: hashedPassword,
        firstName,
        lastName,
        username,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email or username
      let user = null;
      if (email.includes('@')) {
        user = await storage.getUserByEmail(email);
      } else {
        user = await storage.getUserByUsername(email);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
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
  app.post('/api/posts', requireAuth, async (req: any, res) => {
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

  app.get('/api/posts', async (req, res) => {
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
  app.post('/api/posts/:id/like', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      const hasLiked = await storage.hasUserLikedPost(userId, postId);
      if (hasLiked) {
        return res.status(400).json({ message: "Post already liked" });
      }

      const like = await storage.likePost(userId, postId);
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
  app.post('/api/posts/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;

      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId,
        postId,
      });

      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const { id: postId } = req.params;
      const comments = await storage.getCommentsByPost(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/comments/:id/reply', requireAuth, async (req: any, res) => {
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

  // Follow routes
  app.post('/api/users/:id/follow', requireAuth, async (req: any, res) => {
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
  app.post('/api/posts/:id/repost', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id: postId } = req.params;
      const { comment } = req.body;

      const repost = await storage.repostPost(userId, postId, comment);
      res.json(repost);
    } catch (error) {
      console.error("Error reposting:", error);
      res.status(500).json({ message: "Failed to repost" });
    }
  });

  // Bookmark routes
  app.post('/api/posts/:id/bookmark', requireAuth, async (req: any, res) => {
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
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.status(500).json({ message: "Failed to fetch bookmarks" });
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
  app.get('/api/trending/posts', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const posts = await storage.getTrendingPosts(parseInt(limit as string));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching trending posts:", error);
      res.status(500).json({ message: "Failed to fetch trending posts" });
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

  // Image upload route
  app.post('/api/upload/images', requireAuth, upload.array('images', 4), async (req: any, res) => {
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

  // Spotify integration routes
  app.get('/api/spotify/search', requireAuth, async (req, res) => {
    try {
      const { q: query, type = 'track', limit = 20 } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const spotify = await getSpotifyClient();
      const results = await spotify.search(query as string, [type as any], 'US', parseInt(limit as string));
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
      res.status(403).json({ message: error.message });
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
      res.status(403).json({ message: error.message });
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
      res.status(403).json({ message: error.message });
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
      res.status(403).json({ message: error.message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle different types of real-time events
        switch (data.type) {
          case 'subscribe_notifications':
            // Store user connection for notifications
            (ws as any).userId = data.userId;
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
      console.log('WebSocket connection closed');
    });
  });

  // Function to broadcast notifications
  (app as any).broadcastNotification = (userId: string, notification: any) => {
    wss.clients.forEach((client) => {
      if ((client as any).userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: notification,
        }));
      }
    });
  };

  return httpServer;
}
