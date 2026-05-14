/**
 * Decoupage Module — مستودع المشاريع
 *
 * يستخدم جدول `appPersistenceRecords` الموحَّد القائم في `apps/backend/src/db/schema.ts`
 * بدل إنشاء جدول مستقل، فلا توجد migration جديدة.
 *
 * مفاتيح التخزين:
 *   appId      = "decoupage"
 *   scope      = userId
 *   recordKey  = projectId
 *   payload    = DecoupageProject (مع `id` ضمن payload أيضًا للراحة)
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appPersistenceRecords } from "@/db/schema";

import type { DecoupageProject, DecoupageProjectPayload } from "./types";

const APP_ID = "decoupage";

function generateProjectId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `proj_${Date.now().toString(36)}_${random}`;
}

function payloadToProject(
  raw: Record<string, unknown>,
  fallbackId: string,
  ownerId: string,
  createdAt: Date | null,
  updatedAt: Date | null,
): DecoupageProject {
  const rawId = raw["id"];
  return {
    ...(raw as unknown as DecoupageProjectPayload),
    id: typeof rawId === "string" ? rawId : fallbackId,
    ownerId,
    createdAt: (createdAt ?? new Date()).getTime(),
    updatedAt: (updatedAt ?? new Date()).getTime(),
  };
}

export const decoupageProjectRepository = {
  async list(ownerId: string): Promise<DecoupageProject[]> {
    const rows = await db
      .select()
      .from(appPersistenceRecords)
      .where(
        and(
          eq(appPersistenceRecords.appId, APP_ID),
          eq(appPersistenceRecords.scope, ownerId),
        ),
      );

    return rows.map((row) =>
      payloadToProject(
        row.payload,
        row.recordKey,
        ownerId,
        row.createdAt,
        row.updatedAt,
      ),
    );
  },

  async findById(
    ownerId: string,
    projectId: string,
  ): Promise<DecoupageProject | null> {
    const rows = await db
      .select()
      .from(appPersistenceRecords)
      .where(
        and(
          eq(appPersistenceRecords.appId, APP_ID),
          eq(appPersistenceRecords.scope, ownerId),
          eq(appPersistenceRecords.recordKey, projectId),
        ),
      )
      .limit(1);

    const first = rows[0];
    if (!first) return null;

    return payloadToProject(
      first.payload,
      first.recordKey,
      ownerId,
      first.createdAt,
      first.updatedAt,
    );
  },

  async upsert(
    ownerId: string,
    payload: DecoupageProjectPayload,
    existingId?: string,
  ): Promise<DecoupageProject> {
    const trimmed = existingId?.trim() ?? "";
    const projectId = trimmed.length > 0 ? trimmed : generateProjectId();
    const now = new Date();
    const enrichedPayload: Record<string, unknown> = {
      ...payload,
      id: projectId,
      ownerId,
    };

    const existing = await this.findById(ownerId, projectId);

    if (existing) {
      await db
        .update(appPersistenceRecords)
        .set({
          payload: enrichedPayload,
          updatedAt: now,
        })
        .where(
          and(
            eq(appPersistenceRecords.appId, APP_ID),
            eq(appPersistenceRecords.scope, ownerId),
            eq(appPersistenceRecords.recordKey, projectId),
          ),
        );
    } else {
      await db.insert(appPersistenceRecords).values({
        appId: APP_ID,
        scope: ownerId,
        recordKey: projectId,
        payload: enrichedPayload,
        createdAt: now,
        updatedAt: now,
      });
    }

    const refreshed = await this.findById(ownerId, projectId);
    if (!refreshed) {
      throw new Error("فشل قراءة المشروع بعد الحفظ");
    }
    return refreshed;
  },

  async remove(ownerId: string, projectId: string): Promise<boolean> {
    const result = await db
      .delete(appPersistenceRecords)
      .where(
        and(
          eq(appPersistenceRecords.appId, APP_ID),
          eq(appPersistenceRecords.scope, ownerId),
          eq(appPersistenceRecords.recordKey, projectId),
        ),
      )
      .returning({ id: appPersistenceRecords.id });

    return result.length > 0;
  },
};
