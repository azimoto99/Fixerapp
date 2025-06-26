import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface ForgotPasswordPayload {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

export function useForgotPassword() {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordPayload>({
    mutationKey: ['auth', 'forgot-password'],
    mutationFn: async (payload) => {
      const res = await apiRequest('POST', '/api/auth/forgot-password', payload);
      return (await res.json()) as ForgotPasswordResponse;
    },
  });
} 