import { useContext } from "react";

import { ClubContext } from "../contexts/ClubContext";

export function useClub() {
  const context = useContext(ClubContext);

  if (!context) {
    throw new Error(
      "useClub doit être utilisé dans ClubProvider.",
    );
  }

  return context;
}