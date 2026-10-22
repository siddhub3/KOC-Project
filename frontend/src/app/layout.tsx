import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
export const metadata = {
  title: { default: 'Kingdom of Chess', template: '%s | Kingdom of Chess' },
  description: 'Join chess tournaments, get paired with a player, and play live matches at Kingdom of Chess.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('koc-theme')==='dark'?'dark':'light'}catch(_){document.documentElement.dataset.theme='light'}" }} /></head><body>
      <Providers><Navbar/><main className="app-main">{children}</main></Providers>
    </body></html>
  );
}
