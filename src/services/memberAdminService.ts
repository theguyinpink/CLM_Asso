import { supabase } from "../lib/supabase";

export async function removeClubMember(
  clubId: string,
  userId: string,
) {
  const { error } = await supabase.rpc(
    "clm_asso_remove_club_member",
    {
      p_club_id: clubId,
      p_user_id: userId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}