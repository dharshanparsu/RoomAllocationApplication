import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function normalizePhone(raw: string): string {
  // Strip everything except digits
  let digits = raw.replace(/[^\d]/g, "");
  // Remove leading 91 (India country code) if present and length > 10
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Remove leading 0 if present
  if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 10-digit phone number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up guests by phone number
    const { data: guests, error: guestError } = await supabase
      .from("guests")
      .select("id, name, phone, party_size, side, hometown, notes, sub_guests");

    if (guestError) {
      console.error("Guest query error:", guestError);
      return new Response(
        JSON.stringify({ error: "Failed to look up guest" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter guests whose normalized phone matches, or where one of their sub_guests has a matching phone
    const matchingGuests = (guests || []).filter((g: any) => {
      if (g.phone && normalizePhone(g.phone) === normalizedPhone) {
        return true;
      }
      if (Array.isArray(g.sub_guests)) {
        return g.sub_guests.some(
          (sg: any) => sg.phone && normalizePhone(sg.phone) === normalizedPhone
        );
      }
      return false;
    });

    if (matchingGuests.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No room allocation found for this phone number. Please contact the wedding coordinator.",
          found: false,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch settings
    const { data: dbSettings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    if (!settingsError && dbSettings) {
      dbSettings.forEach((s: any) => {
        settingsMap[s.key] = s.value || "";
      });
    }

    // For each matching guest, fetch their room assignment and lodge details
    const results = [];

    for (const guest of matchingGuests) {
      // Get room_guest assignment
      const { data: roomGuests, error: rgError } = await supabase
        .from("room_guests")
        .select(
          "id, keys_given, ac_remote_given, extra_bed_status, room:rooms(id, room_no, room_type, bed_config, floor, notes, show_in_directory, lodge:lodges(id, name, address, maps_link, contacts, incharge_name, incharge_contact, show_directory, checkin_time, checkout_time))"
        )
        .eq("guest_id", guest.id);

      if (rgError) {
        console.error("Room guest query error:", rgError);
        continue;
      }

      const assignment = roomGuests && roomGuests.length > 0 ? roomGuests[0] : null;

      // Fetch directory if enabled
      let directoryData = null;
      if (assignment && (assignment.room as any)?.lodge?.show_directory) {
        const lodgeId = ((assignment.room as any).lodge as any)?.id;
        const { data: roomsList, error: directoryError } = await supabase
          .from("rooms")
          .select("id, room_no, floor, show_in_directory, room_guests(guest:guests(name, sub_guests))")
          .eq("lodge_id", lodgeId)
          .neq("show_in_directory", false);

        if (!directoryError && roomsList) {
          directoryData = roomsList
            .map((r: any) => {
              const guestObj = r.room_guests?.[0]?.guest;
              const subGuests = guestObj?.sub_guests || [];
              return {
                room_no: r.room_no,
                floor: r.floor,
                guest_name: guestObj?.name || null,
                sub_guests: subGuests.map((sg: any) => sg.name),
              };
            })
            .sort((a: any, b: any) => a.room_no.localeCompare(b.room_no, undefined, { numeric: true }));
        }
      }

      // Personalize greeting name and sub guests if matched via a sub-guest
      let displayName = guest.name;
      let displaySubGuests = guest.sub_guests || [];

      if (guest.phone && normalizePhone(guest.phone) !== normalizedPhone) {
        const matchingSub = displaySubGuests.find(
          (sg: any) => sg.phone && normalizePhone(sg.phone) === normalizedPhone
        );
        if (matchingSub) {
          displayName = matchingSub.name;
          displaySubGuests = [
            { name: guest.name, phone: guest.phone },
            ...guest.sub_guests.filter((sg: any) => sg.name !== matchingSub.name),
          ];
        }
      }

      results.push({
        name: displayName,
        party_size: guest.party_size,
        side: guest.side,
        hometown: guest.hometown,
        sub_guests: displaySubGuests,
        room: assignment
          ? {
              room_no: (assignment.room as any)?.room_no,
              room_type: (assignment.room as any)?.room_type,
              bed_config: (assignment.room as any)?.bed_config,
              floor: (assignment.room as any)?.floor,
            }
          : null,
        lodge: assignment && (assignment.room as any)?.lodge
          ? {
              name: ((assignment.room as any).lodge as any)?.name,
              address: ((assignment.room as any).lodge as any)?.address,
              maps_link: ((assignment.room as any).lodge as any)?.maps_link,
              contacts: ((assignment.room as any).lodge as any)?.contacts,
              incharge_name: ((assignment.room as any).lodge as any)?.incharge_name,
              incharge_contact: ((assignment.room as any).lodge as any)?.incharge_contact,
              show_directory: ((assignment.room as any).lodge as any)?.show_directory,
              checkin_time: ((assignment.room as any).lodge as any)?.checkin_time,
              checkout_time: ((assignment.room as any).lodge as any)?.checkout_time,
              directory: directoryData,
            }
          : null,
        keys_given: assignment?.keys_given,
      });
    }

    return new Response(
      JSON.stringify({ found: true, guests: results, settings: settingsMap }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
