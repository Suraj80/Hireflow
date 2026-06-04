import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditApi } from "@/features/audit/api";
import { AuditFilters, AuditLogItem, AuditPagination } from "@/features/audit/types";

const defaultPagination: AuditPagination = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
};

const defaultFilters: AuditFilters = {
  actions: [],
  entityTypes: [],
  categories: [],
  actors: [],
};

const categoryTone: Record<string, string> = {
  security: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  users: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  jobs: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  candidates: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  interviews: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  settings: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-[28px]" />
      <Skeleton className="h-[520px] rounded-[28px]" />
    </div>
  );
}

function EmptyState() {
  return (
      <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="px-6 py-16 text-center">
        <p className="text-lg font-semibold">No audit activity has been recorded yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          New changes across the workspace will appear here automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [pagination, setPagination] = useState<AuditPagination>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(
    async (nextPage = pagination.page) => {
      setLoading(true);
      setError(null);

      try {
        const response = await auditApi.list({
          page: nextPage,
          limit: pagination.limit,
          search: "",
          action: "all",
          category: "all",
          entityType: "all",
          actorId: "",
        });

        setItems(response.items);
        setFilters(response.filters);
        setPagination(response.pagination);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load audit log");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page]
  );

  useEffect(() => {
    void loadAuditLogs(1);
  }, [loadAuditLogs]);

  if (loading && items.length === 0 && !error) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-muted-foreground">
          Review who changed what across jobs, candidates, interviews, users, and workspace settings.
        </p>
      </div>

      <div className="flex justify-end">
        <Button className="h-11 rounded-2xl" variant="outline" onClick={() => void loadAuditLogs(1)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load audit log</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void loadAuditLogs()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.actor.name || "System"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.actor.email || item.request.ip || "Unknown origin"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{item.action}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.entity.label || item.entity.type}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryTone[item.category] || "rounded-full"}>
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 rounded-[24px] border border-border/80 bg-card/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} | {pagination.total} total events
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={pagination.page <= 1 || loading}
                onClick={() => void loadAuditLogs(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => void loadAuditLogs(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
