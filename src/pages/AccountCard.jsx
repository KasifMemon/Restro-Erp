import { LogOut, UserCircle } from 'lucide-react';
import { Btn, Card } from '../components.jsx';
import { LICENSE_REQUIRED, customerSession, customerSignOut, getLicenseCache } from '../cloud.js';

export default function AccountCard() {
  if (!LICENSE_REQUIRED) return null;
  const a = customerSession(); const r = getLicenseCache()?.result;
  return (
    <Card className="space-y-3 p-4 lg:col-span-2">
      <div className="flex items-center gap-2"><UserCircle size={18} /><h3 className="font-semibold">Account & licence</h3></div>
      <div className="grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
        <div>Signed in as <b>{a?.email || '-'}</b></div>
        <div>Plan <b>{r?.plan || '-'}</b> · valid until <b>{r?.expires_on || '-'}</b></div>
      </div>
      <Btn variant="ghost" onClick={() => window.confirm('Sign out of this device? Your data stays on the device and you sign in again with your password.') && customerSignOut()}><LogOut size={15} />Sign out</Btn>
    </Card>
  );
}
