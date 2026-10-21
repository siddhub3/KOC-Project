import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
export const metadata = { title: 'Kingdom of Chess' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <Providers><Navbar/><main className="max-w-6xl mx-auto p-4 md:p-6">{children}</main></Providers>
    </body></html>
  );
}
