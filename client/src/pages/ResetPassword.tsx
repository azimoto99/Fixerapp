import React, { useState } from 'react';
import { useResetPassword } from '@/hooks/useResetPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';

export default function ResetPassword() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const token = urlParams.get('token') || '';
  const [password, setPassword] = useState('');
  const mutation = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync({ token, newPassword: password });
      alert('Password reset successful. You can now log in.');
      window.location.href = '/auth';
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  if (!token) return <p className="text-center mt-20">Missing or invalid token.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center">Reset Password</h2>
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={mutation.isLoading}>
          {mutation.isLoading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </div>
  );
} 