import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export default function Settings() {
  const { user } = useAuth();
  const { role } = useRolePermissions();

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Account and portal preferences</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Display Name</span>
              <span>{user?.display_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role</span>
              <Badge variant={role === "admin" ? "default" : "secondary"}>
                {role?.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Railroad Clarification Portal v2.0</p>
            <p>Local deployment — Flask + SQLite backend</p>
            <p>AI chatbot powered by Claude (claude-sonnet-4-20250514)</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
