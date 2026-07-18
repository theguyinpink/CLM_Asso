import { useState } from "react";
import { Outlet } from "react-router";

import AppHeader from "./AppHeader";
import PaymentPastDueBanner from "./PaymentPastDueBanner";
import AppSidebar from "./AppSidebar";

import "../../styles/app.css";

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  return (
    <div className="app-shell">
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <button
        type="button"
        className={`app-sidebar-overlay ${
          isSidebarOpen
            ? "app-sidebar-overlay--visible"
            : ""
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Fermer le menu"
      />

      <div className="app-shell__main">
        <AppHeader
          onOpenSidebar={() =>
            setIsSidebarOpen(true)
          }
        />

          <PaymentPastDueBanner />

        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;