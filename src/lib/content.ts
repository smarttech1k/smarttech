import { apiRequest } from './api';

export async function loadContentBlock<T = any>(page: string, key: string, authToken?: string | null) {
  const response = await apiRequest<{ content: T }>(`/content/${page}/${key}`, {}, authToken ?? undefined);
  return response.content;
}

