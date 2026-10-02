import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../utils/getErrorMessage';

export const useFetch = (fetcher) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetcher());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
};