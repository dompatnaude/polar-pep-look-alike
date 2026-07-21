-- Fix cart ownership model so carts.user_id matches users.id (TEXT UUID).
-- Previously carts.user_id was INTEGER, which could not hold the TEXT UUID
-- user ids, so logged-in carts never worked. Existing cart data uses only
-- NULL user_id (guest/session carts), so the type change is safe.

-- 1 + 2 + 3. Change carts.user_id from INTEGER to TEXT.
--    All existing values are NULL, so the USING cast is a no-op on data.
ALTER TABLE carts
    ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. Add a foreign key so a cart's user_id must reference a real user.
--    Guest carts keep user_id NULL (NULLs are exempt from FK checks) and
--    continue to be tracked by session_id.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'carts_user_id_fkey'
    ) THEN
        ALTER TABLE carts
            ADD CONSTRAINT carts_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
END $$;
