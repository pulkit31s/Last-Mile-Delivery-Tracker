'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/orders/${params.id}/tracking`);
    }
  }, [params, router]);

  return (
    <div className="py-20 text-center text-sm text-slate-500">
      Redirecting to tracking view...
    </div>
  );
}
