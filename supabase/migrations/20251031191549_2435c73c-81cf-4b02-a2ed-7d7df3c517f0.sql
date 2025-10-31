-- Update press_clippings embedding column to match Gemini's 768-dimension output
-- This fixes the dimension mismatch that was preventing clippings from being saved

ALTER TABLE press_clippings 
ALTER COLUMN embedding TYPE vector(768);