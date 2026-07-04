-- Migration: Fix social_links path column to support SVG path data
-- The path column stores SVG icon paths which can exceed VARCHAR(255)

ALTER TABLE social_links MODIFY COLUMN path TEXT NOT NULL;
