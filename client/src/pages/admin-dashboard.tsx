import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Users, BookOpen, Heart, BarChart3, CheckCircle, Lock } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalReaders: number;
  totalWriters: number;
  verifiedUsers: number;
  totalPosts: number;
  totalArticles: number;
  totalSeries: number;
  totalLikes: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVerified: boolean;
  userRole: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Check if user is admin or super admin
  const isSuperAdmin = user?.isSuperAdmin;
  const isAdmin = user?.isAdmin || user?.isSuperAdmin;

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

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/stats");
        return await response.json() as unknown as AdminStats;
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        return null;
      }
    },
  });

  // Fetch all users
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", searchQuery],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/admin/users${searchQuery ? `?search=${searchQuery}` : ""}`
        );
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
      }
    },
  });

  // Set admin mutation
  const setAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, { isAdmin });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User admin status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Verify user mutation
  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, { isVerified });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User verification status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User account deactivated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const StatCard = ({ icon: Icon, label, value }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold">{value ?? 0}</p>
          </div>
          <Icon className="w-8 h-8 text-primary opacity-20" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            {!isSuperAdmin && (
              <Badge className="ml-auto" variant="secondary">
                Limited Admin
              </Badge>
            )}
            {isSuperAdmin && (
              <Badge className="ml-auto bg-purple-600">
                Super Admin
              </Badge>
            )}
          </div>

          {/* Statistics Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} />
            <StatCard icon={BarChart3} label="Active Users" value={stats?.activeUsers} />
            <StatCard icon={Users} label="Readers" value={stats?.totalReaders} />
            <StatCard icon={BookOpen} label="Writers" value={stats?.totalWriters} />
            <StatCard icon={CheckCircle} label="Verified Users" value={stats?.verifiedUsers} />
            <StatCard icon={Heart} label="Total Likes" value={stats?.totalLikes} />
          </div>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search users by username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                />

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : allUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        allUsers.map((user: AdminUser) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell className="text-sm">{user.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.userRole || "reader"}</Badge>
                            </TableCell>
                            <TableCell>
                              {user.isVerified ? (
                                <Badge>Verified</Badge>
                              ) : (
                                <Badge variant="secondary">Unverified</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.isSuperAdmin ? (
                                <Badge className="bg-purple-600">Super Admin</Badge>
                              ) : user.isAdmin ? (
                                <Badge>Admin</Badge>
                              ) : (
                                <Badge variant="outline">User</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedUser(user)}
                                    data-testid={`button-manage-user-${user.id}`}
                                  >
                                    Manage
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Manage User: {selectedUser?.username}</DialogTitle>
                                    <DialogDescription>
                                      Update permissions and status for this user
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Admin Status
                                      </label>
                                      <Button
                                        variant={selectedUser?.isAdmin ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() =>
                                          selectedUser &&
                                          setAdminMutation.mutate({
                                            userId: selectedUser.id,
                                            isAdmin: !selectedUser.isAdmin,
                                          })
                                        }
                                        disabled={selectedUser?.isSuperAdmin || !isSuperAdmin}
                                        data-testid={`button-toggle-admin-${selectedUser?.id}`}
                                      >
                                        {selectedUser?.isAdmin ? "Remove Admin" : "Make Admin"}
                                      </Button>
                                      {!isSuperAdmin && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Only super admins can promote users to admin
                                        </p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Verification Status
                                      </label>
                                      <Button
                                        variant={selectedUser?.isVerified ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() =>
                                          selectedUser &&
                                          verifyUserMutation.mutate({
                                            userId: selectedUser.id,
                                            isVerified: !selectedUser.isVerified,
                                          })
                                        }
                                        data-testid={`button-toggle-verify-${selectedUser?.id}`}
                                      >
                                        {selectedUser?.isVerified ? "Unverify" : "Verify"}
                                      </Button>
                                    </div>

                                    {selectedUser?.isAdmin && !selectedUser?.isSuperAdmin && (
                                      <div className="pt-4 border-t space-y-2">
                                        <label className="text-sm font-medium">
                                          Admin Permissions
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                          This admin can manage users, verify content, and view
                                          analytics.
                                        </p>
                                      </div>
                                    )}

                                    {isSuperAdmin && (
                                      <div className="pt-4 border-t space-y-2">
                                        <label className="text-sm font-medium text-destructive">
                                          Danger Zone
                                        </label>
                                        <Button
                                          variant="destructive"
                                          className="w-full"
                                          onClick={() =>
                                            selectedUser &&
                                            deactivateUserMutation.mutate(selectedUser.id)
                                          }
                                          data-testid={`button-deactivate-user-${selectedUser?.id}`}
                                        >
                                          Deactivate Account
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                          This will prevent the user from logging in.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
