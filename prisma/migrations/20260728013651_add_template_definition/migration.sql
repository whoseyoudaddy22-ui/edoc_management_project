-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "templateDefinitionId" TEXT;

-- CreateTable
CREATE TABLE "TemplateDefinition" (
    "id" TEXT NOT NULL,
    "documentTypeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentKey" TEXT NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "defaultClosingText" "ClosingText",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateDefinition_documentTypeCode_key" ON "TemplateDefinition"("documentTypeCode");

-- AddForeignKey
ALTER TABLE "TemplateDefinition" ADD CONSTRAINT "TemplateDefinition_documentTypeCode_fkey" FOREIGN KEY ("documentTypeCode") REFERENCES "DocumentType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateDefinitionId_fkey" FOREIGN KEY ("templateDefinitionId") REFERENCES "TemplateDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
