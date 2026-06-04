import { api } from "@/lib/api";
import { AuditLogResponse } from "@/features/audit/types";

type AuditListParams = {
  page: number;
  limit: 10 | 25 | 50 | 100;
  search: string;
  action: string;
  category: string;
  entityType: string;
  actorId: string;
};

export const auditApi = {
  list: async (params: AuditListParams) => {
    const response = await api.get<AuditLogResponse>("/audit-logs", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        action: params.action === "all" ? undefined : params.action,
        category: params.category === "all" ? undefined : params.category,
        entityType: params.entityType === "all" ? undefined : params.entityType,
        actorId: params.actorId || undefined,
      },
    });

    return response.data;
  },
};
