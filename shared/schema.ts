import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table  
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email").unique(),
  password: varchar("password"),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  bio: text("bio"),
  location: varchar("location"),
  website: varchar("website"),
  profileImageUrl: text("profile_image_url"),
  coverImageUrl: text("cover_image_url"),
  genres: text("genres").array(),
  writingStreak: integer("writing_streak").default(0),
  wordCountGoal: integer("word_count_goal").default(500),
  weeklyPostsGoal: integer("weekly_posts_goal").default(5),
  isVerified: boolean("is_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  postsCount: integer("posts_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content"), // Rich text formatting data
  postType: varchar("post_type").notNull().default("text"), // text, poetry, story, challenge
  genre: varchar("genre"),
  spotifyTrackId: varchar("spotify_track_id"),
  spotifyTrackData: jsonb("spotify_track_data"),
  imageUrls: text("image_urls").array(),
  isPrivate: boolean("is_private").default(false),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  viewsCount: integer("views_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Likes table
export const likes = pgTable("likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: uuid("parent_id"),
  level: integer("level").default(0), // For nested threading
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commentLikes = pgTable("comment_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserComment: unique().on(table.userId, table.commentId),
}));


// Follows table
export const follows = pgTable("follows", {
  id: uuid("id").defaultRandom().primaryKey(),
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reposts table
export const reposts = pgTable("reposts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  comment: text("comment"), // Quote repost comment
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookmarks table
export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post collaborators table for Instagram-style collaboration
export const postCollaborators = pgTable("post_collaborators", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  collaboratorId: uuid("collaborator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  invitedById: uuid("invited_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => ({
  uniquePostCollaborator: unique().on(table.postId, table.collaboratorId),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // like, comment, follow, repost, mention
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Writing goals table
export const writingGoals = pgTable("writing_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  wordCount: integer("word_count").default(0),
  postsCount: integer("posts_count").default(0),
  goalMet: boolean("goal_met").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Series table for Wattpad-like functionality
export const series = pgTable("series", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  genre: varchar("genre"),
  tags: text("tags").array(),
  isCompleted: boolean("is_completed").default(false),
  isPrivate: boolean("is_private").default(false),
  viewsCount: integer("views_count").default(0),
  likesCount: integer("likes_count").default(0),
  chaptersCount: integer("chapters_count").default(0),
  followersCount: integer("followers_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Series chapters table
export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  formattedContent: jsonb("formatted_content"),
  chapterNumber: integer("chapter_number").notNull(),
  wordCount: integer("word_count").default(0),
  viewsCount: integer("views_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Series followers table
export const seriesFollowers = pgTable("series_followers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Series likes table
export const seriesLikes = pgTable("series_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chapter likes table
export const chapterLikes = pgTable("chapter_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chapter comments table
export const chapterComments = pgTable("chapter_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: uuid("parent_id"),
  level: integer("level").default(0),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reading progress table
export const readingProgress = pgTable("reading_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  lastChapterId: uuid("last_chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  progressPercentage: integer("progress_percentage").default(0),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leaderboards table
export const leaderboards = pgTable("leaderboards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(), // 'weekly_posts', 'monthly_words', 'likes_received', 'series_followers', etc.
  period: varchar("period").notNull(), // 'daily', 'weekly', 'monthly', 'yearly', 'all_time'
  score: integer("score").default(0),
  rank: integer("rank"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" }),
  reposts: many(reposts),
  bookmarks: many(bookmarks),
  notifications: many(notifications),
  writingGoals: many(writingGoals),
  series: many(series),
  seriesFollowers: many(seriesFollowers),
  seriesLikes: many(seriesLikes),
  chapterLikes: many(chapterLikes),
  chapterComments: many(chapterComments),
  readingProgress: many(readingProgress),
  leaderboards: many(leaderboards),
  postCollaborations: many(postCollaborators, { relationName: "collaborations" }),
  invitedCollaborations: many(postCollaborators, { relationName: "invitations" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  likes: many(likes),
  comments: many(comments),
  reposts: many(reposts),
  bookmarks: many(bookmarks),
  collaborators: many(postCollaborators),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "parent",
  }),
  replies: many(comments, { relationName: "parent" }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "followers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Series relations
export const seriesRelations = relations(series, ({ one, many }) => ({
  author: one(users, {
    fields: [series.authorId],
    references: [users.id],
  }),
  chapters: many(chapters),
  followers: many(seriesFollowers),
  likes: many(seriesLikes),
  readingProgress: many(readingProgress),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  series: one(series, {
    fields: [chapters.seriesId],
    references: [series.id],
  }),
  likes: many(chapterLikes),
  comments: many(chapterComments),
}));

export const seriesFollowersRelations = relations(seriesFollowers, ({ one }) => ({
  user: one(users, {
    fields: [seriesFollowers.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [seriesFollowers.seriesId],
    references: [series.id],
  }),
}));

export const seriesLikesRelations = relations(seriesLikes, ({ one }) => ({
  user: one(users, {
    fields: [seriesLikes.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [seriesLikes.seriesId],
    references: [series.id],
  }),
}));

export const chapterLikesRelations = relations(chapterLikes, ({ one }) => ({
  user: one(users, {
    fields: [chapterLikes.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [chapterLikes.chapterId],
    references: [chapters.id],
  }),
}));

export const chapterCommentsRelations = relations(chapterComments, ({ one, many }) => ({
  user: one(users, {
    fields: [chapterComments.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [chapterComments.chapterId],
    references: [chapters.id],
  }),
  parent: one(chapterComments, {
    fields: [chapterComments.parentId],
    references: [chapterComments.id],
    relationName: "parent",
  }),
  replies: many(chapterComments, { relationName: "parent" }),
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, {
    fields: [readingProgress.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [readingProgress.seriesId],
    references: [series.id],
  }),
  lastChapter: one(chapters, {
    fields: [readingProgress.lastChapterId],
    references: [chapters.id],
  }),
}));

export const postCollaboratorsRelations = relations(postCollaborators, ({ one }) => ({
  post: one(posts, {
    fields: [postCollaborators.postId],
    references: [posts.id],
  }),
  collaborator: one(users, {
    fields: [postCollaborators.collaboratorId],
    references: [users.id],
    relationName: "collaborations",
  }),
  invitedBy: one(users, {
    fields: [postCollaborators.invitedById],
    references: [users.id],
    relationName: "invitations",
  }),
}));

export const leaderboardsRelations = relations(leaderboards, ({ one }) => ({
  user: one(users, {
    fields: [leaderboards.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = insertUserSchema.extend({
  id: z.string().optional(),
});

export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().optional().refine(val => !val || val.length <= 255, "Title must be less than 255 characters"),
  content: z.string().min(1, "Content is required").max(1000, "Content must be less than 1000 characters"),
  imageUrls: z.array(z.string()).optional(),
  spotifyTrack: z.object({
    id: z.string(),
    name: z.string(),
    artist: z.string(),
    preview_url: z.string().optional(),
    external_urls: z.object({
      spotify: z.string()
    }).optional()
  }).optional(),
  genre: z.string().optional(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
});

// Insert schemas for new tables
export const insertSeriesSchema = createInsertSchema(series).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
  chaptersCount: true,
  followersCount: true,
  viewsCount: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
  commentsCount: true,
  viewsCount: true,
  wordCount: true,
});

export const insertChapterCommentSchema = createInsertSchema(chapterComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
});

export const insertPostCollaboratorSchema = createInsertSchema(postCollaborators).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = typeof commentLikes.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Repost = typeof reposts.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type WritingGoal = typeof writingGoals.$inferSelect;

// New types for series functionality
export type Series = typeof series.$inferSelect;
export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type ChapterComment = typeof chapterComments.$inferSelect;
export type InsertChapterComment = z.infer<typeof insertChapterCommentSchema>;
export type SeriesFollower = typeof seriesFollowers.$inferSelect;
export type SeriesLike = typeof seriesLikes.$inferSelect;
export type ChapterLike = typeof chapterLikes.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type PostCollaborator = typeof postCollaborators.$inferSelect;
export type InsertPostCollaborator = z.infer<typeof insertPostCollaboratorSchema>;

// Conversations table for direct messaging
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantOneId: uuid("participant_one_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participantTwoId: uuid("participant_two_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageId: uuid("last_message_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.participantOneId, table.participantTwoId),
]);

// Messages table for direct messaging
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: varchar("message_type").notNull().default("text"), // text, image, file
  attachmentUrls: text("attachment_urls").array(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversation relations
export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  participantOne: one(users, {
    fields: [conversations.participantOneId],
    references: [users.id],
    relationName: "participantOne",
  }),
  participantTwo: one(users, {
    fields: [conversations.participantTwoId],
    references: [users.id],
    relationName: "participantTwo",
  }),
  lastMessage: one(messages, {
    fields: [conversations.lastMessageId],
    references: [messages.id],
  }),
}));

// Message relations
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Add message types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;