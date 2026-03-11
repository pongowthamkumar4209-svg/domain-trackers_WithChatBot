import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { fetchUsers, createUser, deleteUser } from "@/services/api";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function SiteManagement() {
  const { isAdmin } = useRolePermissions();
  if (!isAdmin) return <Navigate to="/" replace />;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await fetchUsers().catch(() => []);
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      await createUser({ email: newEmail, password: newPassword, display_name: newName, role: newRole });
      toast({ title: "User created" });
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("viewer");
      await load();
    } catch (err: unknown) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string, email: string) => {
    if (!confirm(`Delete user ${email}?`)) return;
    await deleteUser(uid);
    await load();
  };

  return (
    <MainLayout>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold">Site Management</h2>
          <p className="text-sm text-muted-foreground">Manage portal users and access</p>
        </div>

        {/* Create User */}
        <div className="rounded-lg border p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add New User</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !newEmail || !newPassword}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </div>

        {/* Users List */}
        <div>
          <h3 className="font-semibold mb-3">All Users</h3>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="rounded-lg border divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-sm">{u.display_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.email)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
