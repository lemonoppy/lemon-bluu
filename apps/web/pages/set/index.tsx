import { useEffect } from 'react';

import { useRouter } from 'next/router';

export default function SetIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/set/cube');
  }, [router]);

  return null;
}
