import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { zipSync, strToU8 } from "fflate";
import { gatherExportData } from "@/lib/export/gather-export-data";

export async function GET() {
  await connection();
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get username for filename
    const { data: profile } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const username = profile?.username || "user";
    const date = new Date().toISOString().slice(0, 10);
    const filename = `backrow-export-${username}-${date}.zip`;

    // Gather all CSV data
    const files = await gatherExportData(user.id, user.email || "", supabase);

    // Build ZIP from CSV strings
    const zipData: Record<string, Uint8Array> = {};
    for (const [name, content] of Object.entries(files)) {
      zipData[name] = strToU8(content);
    }
    const zipped = zipSync(zipData);

    return new Response(Buffer.from(zipped), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
