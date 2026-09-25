-- CreateTable
CREATE TABLE "SearchKeyword" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "userId" INTEGER,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchKeyword_keyword_idx" ON "SearchKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SearchKeyword_userId_idx" ON "SearchKeyword"("userId");

-- AddForeignKey
ALTER TABLE "SearchKeyword" ADD CONSTRAINT "SearchKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
