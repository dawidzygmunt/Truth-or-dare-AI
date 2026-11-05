import { useQuery } from '@tanstack/react-query';
import { fetchCatalog, fetchDeck } from './api-client.js';

export function useCatalogQuery() {
  return useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog });
}

export function useDeckQuery(editionSlug: string) {
  return useQuery({
    queryKey: ['deck', editionSlug],
    queryFn: () => fetchDeck(editionSlug),
  });
}
