CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 2,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomBooking" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "checkIn" TIMESTAMP(3) NOT NULL,
  "checkOut" TIMESTAMP(3) NOT NULL,
  "guestCount" INTEGER NOT NULL DEFAULT 2,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoomBooking_roomId_checkIn_key" UNIQUE ("roomId", "checkIn")
);

CREATE TABLE "AccommodationConfig" (
  "id" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "wantsStay" BOOLEAN,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccommodationConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccommodationConfig_weddingId_key" UNIQUE ("weddingId")
);

ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccommodationConfig" ADD CONSTRAINT "AccommodationConfig_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
