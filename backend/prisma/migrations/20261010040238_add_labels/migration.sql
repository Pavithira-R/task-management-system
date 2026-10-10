-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#118B95',
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_labels" (
    "taskId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("taskId","labelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "labels_projectId_name_key" ON "labels"("projectId", "name");

-- CreateIndex
CREATE INDEX "task_labels_labelId_idx" ON "task_labels"("labelId");

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
