import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const mealChoices = sqliteTable('meal_choices', {
 workspace: text('workspace').notNull(), student: text('student').notNull(), date: text('date').notNull(), choice: text('choice').notNull(), updated: text('updated').notNull(),
}, t => [primaryKey({ columns: [t.workspace,t.student,t.date] })]);
export const menus = sqliteTable('menus', {
 workspace: text('workspace').notNull(), date: text('date').notNull(), normal: text('normal').notNull(), vegetarian: text('vegetarian').notNull(), soup: text('soup').notNull(), dessert: text('dessert').notNull(),
}, t => [primaryKey({ columns: [t.workspace,t.date] })]);
