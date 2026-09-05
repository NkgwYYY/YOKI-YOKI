import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { Item } from '../types';

export function useItemsApi() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const fetchApi = async (path: string, options?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      let errMessage = 'API Error';
      try {
        const err = await res.json();
        if (err.error) errMessage = err.error;
      } catch (e) {
        // fallback
      }
      throw new Error(errMessage);
    }
    return res.json();
  };

  const useGetItems = () => useQuery({
    queryKey: ['admin-items'],
    queryFn: () => fetchApi('/admin/items').then(d => d.items as Item[]),
  });

  const useSaveItem = () => useMutation({
    mutationFn: (data: Partial<Item>) => fetchApi('/admin/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(d => d.item as Item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
    },
  });

  const useDeleteItem = () => useMutation({
    mutationFn: (id: string) => fetchApi(`/admin/items/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
    },
  });

  return { useGetItems, useSaveItem, useDeleteItem };
}