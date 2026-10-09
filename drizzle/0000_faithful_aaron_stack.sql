CREATE TABLE `meal_choices` (
	`workspace` text NOT NULL,
	`student` text NOT NULL,
	`date` text NOT NULL,
	`choice` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`workspace`, `student`, `date`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`workspace` text NOT NULL,
	`date` text NOT NULL,
	`normal` text NOT NULL,
	`vegetarian` text NOT NULL,
	`soup` text NOT NULL,
	`dessert` text NOT NULL,
	PRIMARY KEY(`workspace`, `date`)
);
