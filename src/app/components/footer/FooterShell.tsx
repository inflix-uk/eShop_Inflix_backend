import { headers } from "next/headers";
import Footer from "@/app/components/footer/footer";
import { getFooterSettingsCached } from "@/app/services/footerPublicService";

function hostLooksLocal(host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.")
  );
}

export default async function FooterShell() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const siteHostIsLocal = hostLooksLocal(host);
  const copyrightYear = new Date().getFullYear();
  const initialFooterSettings = await getFooterSettingsCached();
  return (
    <Footer
      initialFooterSettings={initialFooterSettings}
      siteHostIsLocal={siteHostIsLocal}
      copyrightYear={copyrightYear}
    />
  );
}
