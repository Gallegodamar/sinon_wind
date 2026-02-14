import { useEffect, useRef, useState } from 'react';
import { SearchResultItem } from '../appTypes';
import { searchWords } from '../lib/supabaseRepo';

export const useDebouncedWordSearch = (
  searchTerm: string,
  delayMs = 400
): { searchResults: SearchResultItem[]; isSearching: boolean } => {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    const performSearch = async () => {
      const normalizedTerm = searchTerm.trim().toLowerCase();
      if (!normalizedTerm || normalizedTerm.length < 2) {
        searchRequestIdRef.current += 1;
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      const results = await searchWords(normalizedTerm);

      if (requestId !== searchRequestIdRef.current) return;
      setSearchResults(results);
      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, searchTerm]);

  return { searchResults, isSearching };
};
