import 'next';

declare module 'next' {
  interface LayoutProps {
    children: React.ReactNode;
    params: Record<string, string>;
  }
}
  