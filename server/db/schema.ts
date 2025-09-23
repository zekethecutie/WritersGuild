
import { pgTable, text, timestamp, boolean, integer, uuid } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

const generateId = () => nanoid();

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  coverImageUrl: text("cover_image_url"),
  location: text("location"),
  website: text("website"),
  isVerified: boolean("is_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  postsCount: integer("posts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrls: text("image_urls").array(),
  postType: text("post_type").default("regular"),
  genre: text("genre"),
  tags: text("tags").array(),
  collaborators: text("collaborators").array(),
  isPublic: boolean("is_public").default(true),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  bookmarksCount: integer("bookmarks_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  content: text("content").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references(() => comments.id, { onDelete: "cascade" }),
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentLikes = pgTable("comment_likes", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reposts = pgTable("reposts", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'comment', 'follow', 'repost'
  actorId: text("actor_id").references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  participant1Id: text("participant1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participant2Id: text("participant2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'image', 'file'
  attachmentUrls: text("attachment_urls").array(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const series = pgTable("series", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  title: text("title").notNull(),
  description: text("description"),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url"),
  genre: text("genre"),
  tags: text("tags").array(),
  isCompleted: boolean("is_completed").default(false),
  totalChapters: integer("total_chapters").default(0),
  followersCount: integer("followers_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
