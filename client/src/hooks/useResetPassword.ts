import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface ResetPasswordResponse {
  message: string;
}

export function useResetPassword() {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordPayload>({
    mutationKey: ['auth', 'reset-password'],
    mutationFn: async (payload) => {
      const res = await apiRequest('POST', '/api/auth/reset-password', payload);
      return (await res.json()) as ResetPasswordResponse;
    },
  });
} 