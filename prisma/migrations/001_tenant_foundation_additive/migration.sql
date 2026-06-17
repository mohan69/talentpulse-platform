-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('AGENCY', 'STAFFING_FIRM', 'EXECUTIVE_SEARCH', 'GCC', 'ENTERPRISE', 'RPO', 'OTHER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('DEFAULT', 'BUSINESS_UNIT', 'GEOGRAPHY', 'CLIENT_TEAM', 'HIRING_TEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'ORGANIZATION', 'WORKSPACE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultOrganizationId" TEXT,
ADD COLUMN     "defaultWorkspaceId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "PlatformSubscription" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "IntegrationSetting" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "VoiceScreening" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppTemplate" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EmailCampaign" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "CalendarConnection" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "NaukriImport" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "NaukriCandidate" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "SavedSearch" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'AGENCY',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "region" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "securityPolicy" JSONB,
    "dataRetentionPolicy" JSONB,
    "modelProviderPolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL DEFAULT 'DEFAULT',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "systemKey" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL DEFAULT 'ORGANIZATION',
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "workspaceId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "permissionDecision" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_type_region_idx" ON "Organization"("type", "region");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_status_idx" ON "Workspace"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_organizationId_slug_key" ON "Workspace"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Role_organizationId_scope_idx" ON "Role"("organizationId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_systemKey_key" ON "Role"("organizationId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_roleId_idx" ON "OrganizationMembership"("organizationId", "roleId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_status_idx" ON "OrganizationMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_organizationId_userId_idx" ON "WorkspaceMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_roleId_idx" ON "WorkspaceMembership"("workspaceId", "roleId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_status_idx" ON "WorkspaceMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "TenantAuditLog_organizationId_createdAt_idx" ON "TenantAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantAuditLog_organizationId_actorUserId_createdAt_idx" ON "TenantAuditLog"("organizationId", "actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantAuditLog_organizationId_resourceType_resourceId_idx" ON "TenantAuditLog"("organizationId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "TenantAuditLog_requestId_idx" ON "TenantAuditLog"("requestId");

-- CreateIndex
CREATE INDEX "User_defaultOrganizationId_idx" ON "User"("defaultOrganizationId");

-- CreateIndex
CREATE INDEX "User_defaultWorkspaceId_idx" ON "User"("defaultWorkspaceId");

-- CreateIndex
CREATE INDEX "Client_organizationId_isActive_idx" ON "Client"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Client_organizationId_name_idx" ON "Client"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Job_organizationId_workspaceId_status_idx" ON "Job"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "Job_organizationId_clientId_status_idx" ON "Job"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "Job_organizationId_recruiterId_status_idx" ON "Job"("organizationId", "recruiterId", "status");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_workspaceId_idx" ON "Candidate"("organizationId", "workspaceId");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_email_idx" ON "Candidate"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_phone_idx" ON "Candidate"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_source_idx" ON "Candidate"("organizationId", "source");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_ownerId_idx" ON "Candidate"("organizationId", "ownerId");

-- CreateIndex
CREATE INDEX "Project_organizationId_candidateId_idx" ON "Project"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "Application_organizationId_workspaceId_stage_idx" ON "Application"("organizationId", "workspaceId", "stage");

-- CreateIndex
CREATE INDEX "Application_organizationId_jobId_stage_idx" ON "Application"("organizationId", "jobId", "stage");

-- CreateIndex
CREATE INDEX "Application_organizationId_candidateId_idx" ON "Application"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "Interview_organizationId_workspaceId_scheduledAt_idx" ON "Interview"("organizationId", "workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Interview_organizationId_applicationId_idx" ON "Interview"("organizationId", "applicationId");

-- CreateIndex
CREATE INDEX "Interview_organizationId_candidateId_idx" ON "Interview"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "Offer_organizationId_workspaceId_status_idx" ON "Offer"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "Offer_organizationId_applicationId_idx" ON "Offer"("organizationId", "applicationId");

-- CreateIndex
CREATE INDEX "Offer_organizationId_candidateId_idx" ON "Offer"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "JobPosting_organizationId_workspaceId_status_idx" ON "JobPosting"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "JobPosting_organizationId_jobId_idx" ON "JobPosting"("organizationId", "jobId");

-- CreateIndex
CREATE INDEX "JobPosting_organizationId_platformId_idx" ON "JobPosting"("organizationId", "platformId");

-- CreateIndex
CREATE INDEX "PlatformSubscription_organizationId_workspaceId_isActive_idx" ON "PlatformSubscription"("organizationId", "workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "PlatformSubscription_organizationId_recruiterId_idx" ON "PlatformSubscription"("organizationId", "recruiterId");

-- CreateIndex
CREATE INDEX "PlatformSubscription_organizationId_platformId_idx" ON "PlatformSubscription"("organizationId", "platformId");

-- CreateIndex
CREATE INDEX "IntegrationSetting_organizationId_workspaceId_isActive_idx" ON "IntegrationSetting"("organizationId", "workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "VoiceScreening_organizationId_workspaceId_callStatus_idx" ON "VoiceScreening"("organizationId", "workspaceId", "callStatus");

-- CreateIndex
CREATE INDEX "VoiceScreening_organizationId_candidateId_idx" ON "VoiceScreening"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "VoiceScreening_organizationId_applicationId_idx" ON "VoiceScreening"("organizationId", "applicationId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_organizationId_workspaceId_isApproved_idx" ON "WhatsAppTemplate"("organizationId", "workspaceId", "isApproved");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_workspaceId_status_idx" ON "WhatsAppMessage"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_candidateId_idx" ON "WhatsAppMessage"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_phoneNumber_idx" ON "WhatsAppMessage"("organizationId", "phoneNumber");

-- CreateIndex
CREATE INDEX "EmailCampaign_organizationId_workspaceId_status_idx" ON "EmailCampaign"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "EmailCampaign_organizationId_createdById_idx" ON "EmailCampaign"("organizationId", "createdById");

-- CreateIndex
CREATE INDEX "CampaignRecipient_organizationId_campaignId_idx" ON "CampaignRecipient"("organizationId", "campaignId");

-- CreateIndex
CREATE INDEX "CalendarConnection_organizationId_userId_idx" ON "CalendarConnection"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Note_organizationId_workspaceId_candidateId_idx" ON "Note"("organizationId", "workspaceId", "candidateId");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_workspaceId_createdAt_idx" ON "ActivityLog"("organizationId", "workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_entityType_entityId_idx" ON "ActivityLog"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_userId_createdAt_idx" ON "ActivityLog"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailTemplate_organizationId_workspaceId_category_idx" ON "EmailTemplate"("organizationId", "workspaceId", "category");

-- CreateIndex
CREATE INDEX "EmailLog_organizationId_candidateId_idx" ON "EmailLog"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "EmailLog_organizationId_senderId_idx" ON "EmailLog"("organizationId", "senderId");

-- CreateIndex
CREATE INDEX "NaukriImport_organizationId_workspaceId_userId_idx" ON "NaukriImport"("organizationId", "workspaceId", "userId");

-- CreateIndex
CREATE INDEX "NaukriImport_organizationId_createdAt_idx" ON "NaukriImport"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "NaukriCandidate_organizationId_importId_idx" ON "NaukriCandidate"("organizationId", "importId");

-- CreateIndex
CREATE INDEX "NaukriCandidate_organizationId_status_idx" ON "NaukriCandidate"("organizationId", "status");

-- CreateIndex
CREATE INDEX "NaukriCandidate_organizationId_matchedJobId_idx" ON "NaukriCandidate"("organizationId", "matchedJobId");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_workspaceId_status_idx" ON "Prospect"("organizationId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_email_idx" ON "Prospect"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_phone_idx" ON "Prospect"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_source_idx" ON "Prospect"("organizationId", "source");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_ownerId_idx" ON "Prospect"("organizationId", "ownerId");

-- CreateIndex
CREATE INDEX "SavedSearch_organizationId_workspaceId_userId_idx" ON "SavedSearch"("organizationId", "workspaceId", "userId");

-- CreateIndex
CREATE INDEX "CompanyProfile_organizationId_idx" ON "CompanyProfile"("organizationId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

