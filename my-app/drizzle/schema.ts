import { pgTable, serial, text, timestamp, integer, boolean, jsonb, varchar, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: varchar("phone", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull().unique(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  skillLevel: text("skill_level"),
  experience: text("experience"),
  learningObjectives: text("learning_objectives"),
  preferredLearningStyle: text("preferred_learning_style"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blueprints table
export const blueprints = pgTable("blueprints", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  content: jsonb("content").notNull(),
  status: text("status").default("draft").notNull(),
  isAutomated: boolean("is_automated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: jsonb("content"),
  authorId: uuid("author_id").notNull().references(() => users.id),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  blueprints: many(blueprints),
  authoredCourses: many(courses, { relationName: "courseAuthor" }),
  enrollments: many(enrollments),
}));

export const blueprintsRelations = relations(blueprints, ({ one }) => ({
  user: one(users, {
    fields: [blueprints.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  author: one(users, {
    fields: [courses.authorId],
    references: [users.id],
    relationName: "courseAuthor",
  }),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
})); 