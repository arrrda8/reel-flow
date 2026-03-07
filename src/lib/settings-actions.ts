"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { users, apiKeys, costLogs, projects } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { encrypt, decrypt } from "@/lib/encryption";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiKeyEntry = {
  id: string;
  provider: "elevenlabs" | "gemini" | "kling" | "anthropic" | "openai";
  maskedKey: string;
  isValid: boolean;
  lastTestedAt: Date | null;
  createdAt: Date;
};

export type CostEntry = {
  id: string;
  provider: "elevenlabs" | "gemini" | "kling" | "anthropic" | "openai";
  operation: string;
  costCents: number;
  projectName: string | null;
  createdAt: Date;
};

export type CostSummary = {
  totalCents: number;
  thisMonthCents: number;
  projectCount: number;
  recentEntries: CostEntry[];
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  locale: "de" | "en";
};

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  locale: z.enum(["de", "en"], {
    message: "Please select a valid language",
  }),
});

const addApiKeySchema = z.object({
  provider: z.enum(["elevenlabs", "gemini", "kling", "anthropic", "openai"], {
    message: "Please select a valid provider",
  }),
  key: z
    .string()
    .min(8, "API key must be at least 8 characters")
    .max(500, "API key is too long"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskKey(decryptedKey: string): string {
  if (decryptedKey.length <= 4) {
    return "****";
  }
  const last4 = decryptedKey.slice(-4);
  return `****...${last4}`;
}

// ---------------------------------------------------------------------------
// getProfile - Fetch current user's profile
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<UserProfile | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user ?? null;
}

// ---------------------------------------------------------------------------
// updateProfile - Update user name and locale
// ---------------------------------------------------------------------------

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProfile(
  formData: FormData
): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  const raw = {
    name: formData.get("name"),
    locale: formData.get("locale"),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const { name, locale } = parsed.data;

  try {
    await db
      .update(users)
      .set({
        name: name.trim(),
        locale,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// getApiKeys - List user's API keys (masked)
// ---------------------------------------------------------------------------

export async function getApiKeys(): Promise<ApiKeyEntry[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt));

  return keys.map((key) => {
    let maskedKey = "****";
    try {
      const decrypted = decrypt(key.encryptedKey, key.iv);
      maskedKey = maskKey(decrypted);
    } catch {
      maskedKey = "****...(error)";
    }

    return {
      id: key.id,
      provider: key.provider,
      maskedKey,
      isValid: key.isValid,
      lastTestedAt: key.lastTestedAt,
      createdAt: key.createdAt,
    };
  });
}

// ---------------------------------------------------------------------------
// addApiKey - Encrypt and store a new API key
// ---------------------------------------------------------------------------

export type AddApiKeyResult =
  | { success: true; keyId: string }
  | { success: false; error: string };

export async function addApiKey(
  provider: string,
  key: string
): Promise<AddApiKeyResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  const parsed = addApiKeySchema.safeParse({ provider, key });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const { provider: validProvider, key: validKey } = parsed.data;

  // Check if user already has a key for this provider
  const existing = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, session.user.id),
        eq(apiKeys.provider, validProvider)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: `You already have an API key for this provider. Delete the existing key first.`,
    };
  }

  try {
    const { encrypted, iv } = encrypt(validKey);

    const [newKey] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        provider: validProvider,
        encryptedKey: encrypted,
        iv,
        isValid: true,
        lastTestedAt: new Date(),
      })
      .returning({ id: apiKeys.id });

    if (!newKey) {
      return { success: false, error: "Failed to store API key" };
    }

    revalidatePath("/settings");
    return { success: true, keyId: newKey.id };
  } catch {
    return {
      success: false,
      error: "Failed to store API key. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteApiKey - Delete an API key
// ---------------------------------------------------------------------------

export async function deleteApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const result = await db
      .delete(apiKeys)
      .where(
        and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id))
      )
      .returning({ id: apiKeys.id });

    if (result.length === 0) {
      return { success: false, error: "API key not found" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to delete API key. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// testApiKey - Validate key against provider API
// ---------------------------------------------------------------------------

export async function testApiKey(
  keyId: string
): Promise<{ success: boolean; isValid?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const [keyRow] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)))
      .limit(1);

    if (!keyRow) {
      return { success: false, error: "API key not found" };
    }

    const decryptedKey = decrypt(keyRow.encryptedKey, keyRow.iv);
    let isValid = false;

    try {
      switch (keyRow.provider) {
        case "anthropic": {
          const { AnthropicProvider } = await import("@/lib/ai/providers/anthropic");
          const provider = new AnthropicProvider(decryptedKey);
          isValid = await provider.validateKey();
          break;
        }
        case "openai": {
          const { OpenAIProvider } = await import("@/lib/ai/providers/openai");
          const provider = new OpenAIProvider(decryptedKey);
          isValid = await provider.validateKey();
          break;
        }
        case "gemini": {
          const { GeminiProvider } = await import("@/lib/ai/providers/gemini");
          const provider = new GeminiProvider(decryptedKey);
          isValid = await provider.validateKey();
          break;
        }
        case "elevenlabs": {
          const res = await fetch("https://api.elevenlabs.io/v1/user", {
            headers: { "xi-api-key": decryptedKey },
          });
          isValid = res.ok;
          break;
        }
        default:
          isValid = true;
      }
    } catch {
      isValid = false;
    }

    await db
      .update(apiKeys)
      .set({ isValid, lastTestedAt: new Date() })
      .where(eq(apiKeys.id, keyId));

    revalidatePath("/settings");
    return { success: true, isValid };
  } catch {
    return {
      success: false,
      error: "Failed to test API key. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// getCostSummary - Get cost stats and recent entries
// ---------------------------------------------------------------------------

export async function getCostSummary(): Promise<CostSummary> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      totalCents: 0,
      thisMonthCents: 0,
      projectCount: 0,
      recentEntries: [],
    };
  }

  // Total cost
  const [totalResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${costLogs.costCents}), 0)`,
    })
    .from(costLogs)
    .where(eq(costLogs.userId, session.user.id));

  const totalCents = Number(totalResult?.total ?? 0);

  // This month cost
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${costLogs.costCents}), 0)`,
    })
    .from(costLogs)
    .where(
      and(
        eq(costLogs.userId, session.user.id),
        sql`${costLogs.createdAt} >= ${startOfMonth}`
      )
    );

  const thisMonthCents = Number(monthResult?.total ?? 0);

  // Project count
  const [projectCountResult] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  const projectCount = Number(projectCountResult?.count ?? 0);

  // Recent cost entries with project names
  const recentEntries = await db
    .select({
      id: costLogs.id,
      provider: costLogs.provider,
      operation: costLogs.operation,
      costCents: costLogs.costCents,
      projectName: projects.name,
      createdAt: costLogs.createdAt,
    })
    .from(costLogs)
    .leftJoin(projects, eq(costLogs.projectId, projects.id))
    .where(eq(costLogs.userId, session.user.id))
    .orderBy(desc(costLogs.createdAt))
    .limit(20);

  return {
    totalCents,
    thisMonthCents,
    projectCount,
    recentEntries,
  };
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@reelflow.com,ardo@reelflow.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  return ADMIN_EMAILS.includes(session.user.email.toLowerCase());
}

export type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  totalCostCents: number;
  userList: {
    id: string;
    name: string;
    email: string;
    projectCount: number;
    createdAt: Date;
  }[];
};

export async function getAdminStats(): Promise<AdminStats | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  if (!ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return null;
  }

  // Total users
  const [userCountResult] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(users);

  const totalUsers = Number(userCountResult?.count ?? 0);

  // Total projects
  const [projectCountResult] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(projects);

  const totalProjects = Number(projectCountResult?.count ?? 0);

  // Total cost
  const [costResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${costLogs.costCents}), 0)`,
    })
    .from(costLogs);

  const totalCostCents = Number(costResult?.total ?? 0);

  // User list with project counts
  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      projectCount: sql<number>`cast(count(${projects.id}) as int)`,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(projects, eq(projects.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return {
    totalUsers,
    totalProjects,
    totalCostCents,
    userList,
  };
}
