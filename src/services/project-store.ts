import {
  getConfiguredPersistenceMode,
  getResolvedPersistenceMode,
} from "@/lib/prisma";
import * as localStore from "@/services/local-store";
import * as prismaStore from "@/services/prisma-store";
import type { AppDataStore } from "@/types/planning";

export interface PersistenceInfo {
  mode: "local" | "prisma";
  label: string;
  description: string;
}

export function getPersistenceInfo(): PersistenceInfo {
  const configuredMode = getConfiguredPersistenceMode();
  const resolvedMode = getResolvedPersistenceMode();

  if (resolvedMode === "prisma") {
    return {
      mode: "prisma",
      label: "PostgreSQL via Prisma",
      description: `Project data is persisted through Prisma into PostgreSQL (configured mode: ${configuredMode}).`,
    };
  }

  return {
    mode: "local",
    label: "Local runtime store",
    description:
      configuredMode === "local"
        ? "Project data is explicitly running in the versioned local JSON runtime store."
        : "Project data is using the versioned local JSON runtime store because DATABASE_URL is not configured.",
  };
}

export async function readStore() {
  if (getResolvedPersistenceMode() === "prisma") {
    return prismaStore.readStore();
  }

  return localStore.readStore();
}

export async function mutateStore(
  mutate: (draft: AppDataStore) => void | Promise<void>,
) {
  if (getResolvedPersistenceMode() === "prisma") {
    return prismaStore.mutateStore(mutate);
  }

  return localStore.mutateStore(mutate);
}
