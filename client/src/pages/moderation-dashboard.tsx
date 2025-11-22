import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Flag, AlertCircle } from "lucide-react";

interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: {
    username: string;
    displayName: string;
  };
}

export default function ModerationDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const isAdmin = user?.isAdmin || user?.isSuperAdmin;
  const isSuperAdmin = user?.isSuperAdmin;

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only admin accounts can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/reports");
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        return [];
      }
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      notes,
    }: {
      reportId: string;
      status: string;
      notes?: string;
    }) => {
      return apiRequest("PATCH", `/api/reports/${reportId}`, {
        status,
        resolutionNotes: notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report resolved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!isSuperAdmin) {
        throw new Error("Only super admins can deactivate users");
      }
      return apiRequest("PATCH", `/api/admin/users/${userId}`, {
        isDeactivated: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User account deactivated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });

  const pendingReports = reports.filter((r: Report) => r.status === "pending");
  const resolvedReports = reports.filter((r: Report) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <h1 className="text-4xl font-bold">Moderation Dashboard</h1>
            {!isSuperAdmin && (
              <Badge className="ml-auto" variant="secondary">
                Limited Admin
              </Badge>
            )}
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending-reports">
                Pending ({pendingReports.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" data-testid="tab-resolved-reports">
                Resolved ({resolvedReports.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5" />
                    Pending Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading reports...</p>
                  ) : pendingReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No pending reports
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingReports.map((report: Report) => (
                        <div
                          key={report.id}
                          className="border rounded-lg p-4 space-y-3"
                          data-testid={`report-item-${report.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge>{report.targetType}</Badge>
                              <Badge variant="outline" className="ml-2">
                                {report.reason}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm">
                            Reported by{" "}
                            <span className="font-medium">
                              @{report.reporter?.username}
                            </span>
                          </p>
                          {report.description && (
                            <p className="text-sm text-muted-foreground">
                              {report.description}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                resolveReportMutation.mutate({
                                  reportId: report.id,
                                  status: "resolved",
                                })
                              }
                              data-testid={`button-resolve-report-${report.id}`}
                            >
                              Mark Resolved
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                resolveReportMutation.mutate({
                                  reportId: report.id,
                                  status: "dismissed",
                                })
                              }
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resolved Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {resolvedReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No resolved reports
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {resolvedReports.map((report: Report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {report.targetType} - {report.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              By @{report.reporter?.username}
                            </p>
                          </div>
                          <Badge variant="secondary">{report.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
