-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ticket" (
    "number" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "userId" TEXT,
    "reservedAt" DATETIME,
    "transactionRef" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaffleState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'current',
    "winningNumber" TEXT,
    "drawnAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_transactionRef_key" ON "Ticket"("transactionRef");
