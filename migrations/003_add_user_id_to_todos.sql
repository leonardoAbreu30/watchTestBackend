ALTER TABLE todos
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Update existing todos to belong to a default user if needed
-- This is optional and can be removed if you want to start fresh
UPDATE todos SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;

-- Make user_id required for future inserts
ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL; 