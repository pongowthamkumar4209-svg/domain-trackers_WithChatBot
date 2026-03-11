import { useAuth } from "@/contexts/AuthContext";

export function useRolePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? "viewer";
  return {
    role,
    isAdmin: role === "admin",
    isEditor: role === "editor" || role === "admin",
    canEdit: role === "admin" || role === "editor",
    canDelete: role === "admin",
  };
}
