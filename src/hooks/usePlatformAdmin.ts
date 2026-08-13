import { useContext } from "react";

import { PlatformAdminContext } from "../contexts/PlatformAdminContext";

export function usePlatformAdmin() {
  const context =
    useContext(PlatformAdminContext);

  if (!context) {
    throw new Error(
      "usePlatformAdmin doit être utilisé dans PlatformAdminProvider.",
    );
  }

  return context;
}
