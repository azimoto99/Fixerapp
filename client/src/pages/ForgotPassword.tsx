import React, { useState } from 'react';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'wouter/use-location';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const mutation = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync({ email });
      alert('If an account exists, reset instructions have been sent.');
      navigate('/auth');
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center">Forgot Password</h2>
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={mutation.isLoading}>
          {mutation.isLoading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </div>
  );
} 