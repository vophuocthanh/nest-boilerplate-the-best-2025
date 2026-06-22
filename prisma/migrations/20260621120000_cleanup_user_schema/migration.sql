-- Bỏ các cột không nên persist / không dùng
ALTER TABLE "users" DROP COLUMN IF EXISTS "confirmPassword";
ALTER TABLE "users" DROP COLUMN IF EXISTS "points";

-- Chuẩn hoá date_of_birth: TEXT -> TIMESTAMP.
-- Chuỗi rỗng không cast được nên đưa về NULL trước.
UPDATE "users" SET "date_of_birth" = NULL WHERE "date_of_birth" = '';
ALTER TABLE "users"
  ALTER COLUMN "date_of_birth" TYPE TIMESTAMP(3)
  USING "date_of_birth"::timestamp(3);
