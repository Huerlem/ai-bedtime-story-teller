'use client';

import { useRouter } from 'next/navigation';
import ParentGate from '@/components/childmode/ParentGate';
import { exitChildModeWithPin, leaveChildModeWithPassword } from '@/lib/client/childMode';

/** Child Mode → Parent Area. The server verifies the code and restores the parent session. */
export default function ParentGatePage() {
  const router = useRouter();
  return (
    <ParentGate
      onSubmit={async (pin) => {
        await exitChildModeWithPin(pin);
        router.replace('/dashboard');
      }}
      onBack={() => router.replace('/kid/dashboard')}
      onForgot={async () => {
        await leaveChildModeWithPassword();
        router.replace('/login?reason=parent-gate');
      }}
    />
  );
}
