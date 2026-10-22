import { RoleGate } from '@/components/RoleGate';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="student">{children}</RoleGate>;
}
