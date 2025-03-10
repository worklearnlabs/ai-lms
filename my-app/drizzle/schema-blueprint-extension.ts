import { pgTable, pgEnum, uuid, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// Define custom enum types
export const visibilityTypeEnum = pgEnum('visibility_type', ['private', 'public', 'team']);
export const skillLevelTypeEnum = pgEnum('skill_level_type', ['beginner', 'intermediate', 'advanced']);
export const complexityTypeEnum = pgEnum('complexity_type', ['low', 'medium', 'high']);
export const stepStatusTypeEnum = pgEnum('step_status_type', ['not_started', 'in_progress', 'completed']);
export const sessionStatusTypeEnum = pgEnum('session_status_type', ['active', 'completed', 'failed']);
export const messageRoleTypeEnum = pgEnum('message_role_type', ['system', 'user', 'assistant']);

// Enhanced blueprints table
export const blueprintsExtended = pgTable("blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  content: jsonb("content").notNull(),
  status: text("status").default("draft").notNull(),
  isAutomated: boolean("is_automated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // New fields
  searchQuery: text("search_query"),
  visibility: visibilityTypeEnum("visibility").default('private'),
  teamId: uuid("team_id"),
  skillLevel: skillLevelTypeEnum("skill_level"),
  learningObjective: text("learning_objective"),
  complexity: complexityTypeEnum("complexity"),
  estimatedTime: text("estimated_time"),
  prompt: text("prompt"),
  cloneCount: integer("clone_count").default(0),
  stepsCount: integer("steps_count"),
  isVerified: boolean("is_verified").default(false),
});

// Blueprint steps table
export const blueprintSteps = pgTable("blueprint_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  blueprintId: uuid("blueprint_id").notNull().references(() => blueprintsExtended.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  estimatedTime: text("estimated_time"),
  instructions: jsonb("instructions"), // Array of bullet-point instructions
  tools: jsonb("tools"), // Array of tool tags
  status: stepStatusTypeEnum("status").default('not_started'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blueprint subtasks table
export const blueprintSubtasks = pgTable("blueprint_subtasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  stepId: uuid("step_id").notNull().references(() => blueprintSteps.id, { onDelete: "cascade" }),
  taskNumber: integer("task_number").notNull(),
  description: text("description").notNull(),
  status: stepStatusTypeEnum("status").default('not_started'),
  estimatedTime: text("estimated_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blueprint comments table
export const blueprintComments = pgTable("blueprint_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  blueprintId: uuid("blueprint_id").notNull().references(() => blueprintsExtended.id, { onDelete: "cascade" }),
  stepId: uuid("step_id").references(() => blueprintSteps.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reasoning sessions table
export const reasoningSessions = pgTable("reasoning_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  blueprintId: uuid("blueprint_id").notNull().references(() => blueprintsExtended.id, { onDelete: "cascade" }),
  status: sessionStatusTypeEnum("status").default('active'),
  context: jsonb("context"), // Additional context for the session
  skillLevel: skillLevelTypeEnum("skill_level"),
  learningObjective: text("learning_objective"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reasoning messages table
export const reasoningMessages = pgTable("reasoning_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => reasoningSessions.id, { onDelete: "cascade" }),
  role: messageRoleTypeEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const blueprintsExtendedRelations = relations(blueprintsExtended, ({ one, many }) => ({
  user: one(users, {
    fields: [blueprintsExtended.userId],
    references: [users.id],
  }),
  steps: many(blueprintSteps),
  comments: many(blueprintComments),
  reasoningSessions: many(reasoningSessions),
}));

export const blueprintStepsRelations = relations(blueprintSteps, ({ one, many }) => ({
  blueprint: one(blueprintsExtended, {
    fields: [blueprintSteps.blueprintId],
    references: [blueprintsExtended.id],
  }),
  subtasks: many(blueprintSubtasks),
  comments: many(blueprintComments),
}));

export const blueprintSubtasksRelations = relations(blueprintSubtasks, ({ one }) => ({
  step: one(blueprintSteps, {
    fields: [blueprintSubtasks.stepId],
    references: [blueprintSteps.id],
  }),
}));

export const blueprintCommentsRelations = relations(blueprintComments, ({ one }) => ({
  blueprint: one(blueprintsExtended, {
    fields: [blueprintComments.blueprintId],
    references: [blueprintsExtended.id],
  }),
  step: one(blueprintSteps, {
    fields: [blueprintComments.stepId],
    references: [blueprintSteps.id],
  }),
  user: one(users, {
    fields: [blueprintComments.userId],
    references: [users.id],
  }),
}));

export const reasoningSessionsRelations = relations(reasoningSessions, ({ one, many }) => ({
  blueprint: one(blueprintsExtended, {
    fields: [reasoningSessions.blueprintId],
    references: [blueprintsExtended.id],
  }),
  messages: many(reasoningMessages),
}));

export const reasoningMessagesRelations = relations(reasoningMessages, ({ one }) => ({
  session: one(reasoningSessions, {
    fields: [reasoningMessages.sessionId],
    references: [reasoningSessions.id],
  }),
})); 