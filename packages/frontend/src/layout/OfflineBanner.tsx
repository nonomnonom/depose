import { useEffect, useState } from 'react';
import { WifiOffIcon } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground"
    >
      <WifiOffIcon className="size-3.5" aria-hidden="true" />
      Koneksi terputus. Perubahan tidak akan tersimpan sampai koneksi kembali.
    </div>
  );
}
