import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  email?: string;
  onPurged?: () => void | Promise<void>;
};

export default function PurgeRegistrationByEmail({ email = "", onPurged }: Props) {
  const { toast } = useToast();
  const [value, setValue] = useState(email);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    setValue(email);
  }, [email]);

  const normalized = useMemo(() => value.trim().toLowerCase(), [value]);

  const handlePurge = async () => {
    if (!normalized) {
      toast({
        title: "Email required",
        description: "Enter the email you want to fully remove.",
        variant: "destructive",
      });
      return;
    }

    setIsPurging(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email: normalized },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Registration removed",
        description: "That email can now be created again.",
      });

      await onPurged?.();
    } catch (e: any) {
      toast({
        title: "Cleanup failed",
        description: e?.message || "Could not remove the existing registration.",
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">Already registered?</div>
        <p className="text-sm text-muted-foreground">
          If this email was removed from the user table earlier, it may still exist in the authentication system.
          You can fully remove it here so you can create it again.
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="purge-email">Email to remove</Label>
          <Input
            id="purge-email"
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="user@example.com"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isPurging || !normalized}>
              {isPurging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove registration
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove registration?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{normalized}</strong> so it can be created again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurge} disabled={isPurging}>
                Confirm remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
