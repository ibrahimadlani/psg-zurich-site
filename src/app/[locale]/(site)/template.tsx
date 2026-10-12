// Templates remount on every navigation: the page content fades in while header and nav stay put.
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in motion-reduce:animate-none">{children}</div>;
}
