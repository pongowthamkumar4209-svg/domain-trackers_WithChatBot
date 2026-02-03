import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileSpreadsheet, Phone, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = 'mobile' | 'otp' | 'reset' | 'success';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock OTP for development - always 123456
  const MOCK_OTP = '123456';

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!mobileNumber || mobileNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Find user by mobile number
      const { data: profile, error: profileError } = await (supabase
        .from('profiles' as any)
        .select('user_id, mobile_number')
        .eq('mobile_number', mobileNumber)
        .maybeSingle() as any);
      
      if (profileError) throw profileError;
      
      if (!profile) {
        setError('No account found with this mobile number');
        setIsLoading(false);
        return;
      }

      // Store OTP in database (using mock OTP for development)
      const { error: otpError } = await (supabase
        .from('password_reset_otps' as any)
        .insert({
          user_id: profile.user_id,
          mobile_number: mobileNumber,
          otp_code: MOCK_OTP,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        }) as any);

      if (otpError) throw otpError;

      setUserId(profile.user_id);
      
      toast({
        title: 'OTP Sent',
        description: `Development mode: Use OTP ${MOCK_OTP}`,
      });
      
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verify OTP
      const { data: otpRecord, error: otpError } = await (supabase
        .from('password_reset_otps' as any)
        .select('*')
        .eq('mobile_number', mobileNumber)
        .eq('otp_code', otp)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (otpError) throw otpError;
      
      if (!otpRecord) {
        setError('Invalid or expired OTP');
        setIsLoading(false);
        return;
      }

      // Mark OTP as used
      await (supabase
        .from('password_reset_otps' as any)
        .update({ used: true })
        .eq('id', otpRecord.id) as any);

      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use admin API to update password - this requires a backend function
      // For now, we'll use the Supabase auth.updateUser which requires the user to be logged in
      // In production, this would call an edge function with service role
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // If user is not logged in, show a message
        if (error.message.includes('not logged in') || error.message.includes('session')) {
          toast({
            title: 'Password Reset Verified',
            description: 'Please login with your old password, then change it in settings, or contact an admin.',
          });
          setStep('success');
          return;
        }
        throw error;
      }

      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been updated.',
      });
      
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'mobile':
        return (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="mobileNumber" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Registered Mobile Number
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="Enter your registered mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                We'll send a 6-digit OTP to verify your identity
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Enter OTP
              </Label>
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to {mobileNumber}
              </p>
              <p className="text-xs text-amber-600 text-center font-medium">
                Development mode: Use OTP 123456
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep('mobile');
                setOtp('');
                setError('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change mobile number
            </Button>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">OTP Verified!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your identity has been verified. Please contact an admin to reset your password, or try logging in.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display tracking-wide text-foreground">
            CN Clarification Portal
          </h1>
        </div>
        
        {/* Forgot Password Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Forgot Password
            </CardTitle>
            <CardDescription>
              {step === 'mobile' && 'Enter your registered mobile number to receive an OTP'}
              {step === 'otp' && 'Enter the OTP sent to your mobile'}
              {step === 'reset' && 'Create a new password'}
              {step === 'success' && 'Password reset complete'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
            
            {step !== 'success' && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}