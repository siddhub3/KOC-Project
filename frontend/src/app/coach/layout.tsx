import { RoleGate } from '@/components/RoleGate';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="coach">{children}</RoleGate>;
}
