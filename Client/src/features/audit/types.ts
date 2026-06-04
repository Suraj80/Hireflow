export type AuditActor = {
  id: string | null;
  name: string;
  email: string;
  role: string;
};

export type AuditEntity = {
  type: string;
  id: string;
  label: string;
};

export type AuditLogItem = {
  id: string;
  actor: AuditActor;
  action: string;
  category: string;
  entity: AuditEntity;
  description: string;
  meta: Record<string, unknown> | null;
  request: {
    ip: string;
    userAgent: string;
  };
  createdAt: string;
};

export type AuditPagination = {
  page: number;
  limit: 10 | 25 | 50 | 100;
  total: number;
  totalPages: number;
};

export type AuditFilters = {
  actions: string[];
  entityTypes: string[];
  categories: string[];
  actors: AuditActor[];
};

export type AuditLogResponse = {
  items: AuditLogItem[];
  pagination: AuditPagination;
  filters: AuditFilters;
};
