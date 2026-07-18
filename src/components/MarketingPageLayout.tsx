import type { ReactNode } from "react";
import Header from "./Header";
import SiteFooter from "./SiteFooter";
import "../styles/home.css";
import "../styles/marketing-pages.css";

interface MarketingPageLayoutProps {
  children: ReactNode;
}

function MarketingPageLayout({ children }: MarketingPageLayoutProps) {
  return (
    <div className="marketing-page">
      <Header />

      <main className="marketing-main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export default MarketingPageLayout;