import { useEffect, useState } from 'react';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ok'; data: T };

export function useApi<T>(url: string | null): {
  state: ApiState<T>;
  reload: () => void;
} {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ status: 'loading' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetch(url)
      .then(async (response) => {
        if (response.status === 404) {
          throw new Error('not-found');
        }
        if (!response.ok) {
          throw new Error('request-failed');
        }
        return (await response.json()) as T;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState({
          status: error.message === 'not-found' ? 'not-found' : 'error',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  return {
    state,
    reload: () => setAttempt((value) => value + 1),
  };
}
