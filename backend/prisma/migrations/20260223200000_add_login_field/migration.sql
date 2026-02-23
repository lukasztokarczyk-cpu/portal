ALTER TABLE "User" ADD COLUMN "login" TEXT;
UPDATE "User" SET "login" = "email";
ALTER TABLE "User" ALTER COLUMN "login" SET NOT NULL;
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
