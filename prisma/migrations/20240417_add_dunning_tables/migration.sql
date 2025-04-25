-- CreateTable
CREATE TABLE "dunning_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "stage" TEXT NOT NULL,
  "scheduled_date" TIMESTAMP(3) NOT NULL,
  "sent_date" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "failure_type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "dunning_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_subscription_cancellations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "scheduled_date" TIMESTAMP(3) NOT NULL,
  "payment_id" UUID NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processed_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "pending_subscription_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_cancellations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "reason" TEXT,
  "canceled_at" TIMESTAMP(3) NOT NULL,
  "effective_date" TIMESTAMP(3),
  "immediate" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "subscription_cancellations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dunning_notifications" ADD CONSTRAINT "dunning_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_notifications" ADD CONSTRAINT "dunning_notifications_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_subscription_cancellations" ADD CONSTRAINT "pending_subscription_cancellations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_subscription_cancellations" ADD CONSTRAINT "pending_subscription_cancellations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cancellations" ADD CONSTRAINT "subscription_cancellations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "dunning_notifications_user_id_idx" ON "dunning_notifications"("user_id");
CREATE INDEX "dunning_notifications_payment_id_idx" ON "dunning_notifications"("payment_id");
CREATE INDEX "dunning_notifications_status_scheduled_date_idx" ON "dunning_notifications"("status", "scheduled_date");

-- CreateIndex
CREATE INDEX "pending_subscription_cancellations_user_id_idx" ON "pending_subscription_cancellations"("user_id");
CREATE INDEX "pending_subscription_cancellations_subscription_id_idx" ON "pending_subscription_cancellations"("subscription_id");
CREATE INDEX "pending_subscription_cancellations_processed_scheduled_date_idx" ON "pending_subscription_cancellations"("processed", "scheduled_date");

-- CreateIndex
CREATE INDEX "subscription_cancellations_user_id_idx" ON "subscription_cancellations"("user_id");
CREATE INDEX "subscription_cancellations_subscription_id_idx" ON "subscription_cancellations"("subscription_id"); 