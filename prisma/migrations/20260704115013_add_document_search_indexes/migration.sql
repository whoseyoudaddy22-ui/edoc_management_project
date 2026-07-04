-- CreateIndex
CREATE INDEX "Document_documentTypeCode_idx" ON "Document"("documentTypeCode");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Document_departmentCode_idx" ON "Document"("departmentCode");

-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");
