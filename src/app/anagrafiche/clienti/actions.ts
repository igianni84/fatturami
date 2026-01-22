"use server";

import { prisma } from "@/lib/prisma";

export interface ClientListItem {
  id: string;
  name: string;
  vatNumber: string;
  country: string;
  email: string;
}

export interface ClientListResult {
  clients: ClientListItem[];
  totalCount: number;
}

export async function getClients(
  search: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<ClientListResult> {
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { vatNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        vatNumber: true,
        country: true,
        email: true,
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, totalCount };
}
