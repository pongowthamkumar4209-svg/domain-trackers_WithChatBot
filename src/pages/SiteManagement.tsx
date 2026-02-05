import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Loader2,
  Crown,
  Edit3,
  Eye,
  Phone,
  Save,
  X,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppRole } from '@/types/roles';
import PurgeRegistrationByEmail from '@/components/site-management/PurgeRegistrationByEmail';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  mobile_number: string | null;
  role: AppRole;
  created_at: string;
}

const ROLE_BADGES: Record<AppRole, { variant: 'default' | 'secondary' | 'outline'; icon: typeof Crown }> = {
  admin: { variant: 'default', icon: Crown },
  editor: { variant: 'secondary', icon: Edit3 },
  viewer: { variant: 'outline', icon: Eye },
};

export default function SiteManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, canManageUsers, role } = useRolePermissions();
  const { isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '', mobileNumber: '', role: 'viewer' as AppRole });
  const [editingMobile, setEditingMobile] = useState<{ id: string; value: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showRegistrationCleanup, setShowRegistrationCleanup] = useState(false);

  // Redirect non-admins only after auth is fully loaded
  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      navigate('/');
    }
  }, [canManageUsers, navigate, authLoading]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, mobile_number, created_at');
      
      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          mobile_number: profile.mobile_number,
          role: (userRole?.role as AppRole) || 'viewer',
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error loading users',
        description: 'Could not fetch user list.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers, authLoading]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowRegistrationCleanup(false);
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Missing fields', description: 'Email and password are required.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      // Create user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: newUser.displayName || newUser.email.split('@')[0],
            mobile_number: newUser.mobileNumber || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update the role if not viewer (default)
        if (newUser.role !== 'viewer') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newUser.role })
            .eq('user_id', data.user.id);
          
          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }

        toast({
          title: 'User created',
          description: `${newUser.email} has been added as ${newUser.role}.`,
        });

        setNewUser({ email: '', password: '', displayName: '', mobileNumber: '', role: 'viewer' });
        await loadUsers();
      }
    } catch (error: any) {
      const message = error?.message || 'Could not create user.';
      if (/already registered/i.test(message)) {
        setShowRegistrationCleanup(true);
      }
      toast({
        title: 'Error creating user',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: `User role changed to ${newRole}.`,
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message || 'Could not update role.',
        variant: 'destructive',
      });
    }
  };

  const handleMobileNumberUpdate = async (profileId: string, newMobile: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mobile_number: newMobile || null })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Mobile number updated',
        description: 'User mobile number has been updated.',
      });

      setEditingMobile(null);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error updating mobile number',
        description: error.message || 'Could not update mobile number.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string | null) => {
    setDeletingUserId(userId);
    try {
      // Call edge function to delete user from auth.users
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'User removed',
        description: `${userEmail || 'User'} has been completely removed from the system.`,
      });

      // Remove from UI immediately
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));

      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error removing user',
        description: error.message || 'Could not remove user.',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!canManageUsers) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8" />
              <h1 className="text-4xl font-display tracking-wide">Site Management</h1>
            </div>
            <p className="text-white/70 text-lg">
              Manage users, roles, and access permissions
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Create User Card */}
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              Create New User
            </CardTitle>
            <CardDescription>
              Add a new user to the system and assign their role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Mobile
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="Mobile number"
                  value={newUser.mobileNumber}
                  onChange={(e) => setNewUser({ ...newUser, mobileNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AppRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>

            {showRegistrationCleanup && newUser.email ? (
              <div className="mt-4">
                <PurgeRegistrationByEmail email={newUser.email} onPurged={loadUsers} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-md border-l-4 border-l-violet-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              User Management
            </CardTitle>
            <CardDescription>
              View and manage all users and their roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const roleBadge = ROLE_BADGES[user.role];
                      const RoleIcon = roleBadge.icon;
                      const isEditingThis = editingMobile?.id === user.id;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.display_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>
                            {isEditingThis ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="tel"
                                  value={editingMobile.value}
                                  onChange={(e) => setEditingMobile({ ...editingMobile, value: e.target.value })}
                                  className="w-32 h-8"
                                  placeholder="Mobile"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleMobileNumberUpdate(user.id, editingMobile.value)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setEditingMobile(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {user.mobile_number || '-'}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => setEditingMobile({ id: user.id, value: user.mobile_number || '' })}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleBadge.variant} className="gap-1">
                              <RoleIcon className="h-3 w-3" />
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={user.role}
                                onValueChange={(value: AppRole) => handleRoleChange(user.user_id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={deletingUserId === user.user_id}
                                  >
                                    {deletingUserId === user.user_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{user.email || user.display_name}</strong> from the site? 
                                      This will fully remove their account so the same email can be registered again.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.user_id, user.email)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
