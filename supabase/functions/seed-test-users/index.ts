import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = [
    { email: "superadmin@acadflow.test", password: "Super@123", role: "super_admin", name: "Super Admin" },
    { email: "admin@acadflow.test", password: "Admin@123", role: "admin", name: "Admin User" },
  ];

  const results = [];

  for (const u of users) {
    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((x: any) => x.email === u.email);

    let userId: string;
    if (existing) {
      userId = existing.id;
      results.push({ email: u.email, status: "already exists", userId });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { display_name: u.name },
      });
      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: u.email, status: "created", userId });
    }

    // Ensure correct role
    if (u.role === "super_admin") {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert({ user_id: userId, role: "super_admin" });
    }
  }

  return new Response(JSON.stringify({ results, credentials: {
    superAdmin: { email: "superadmin@acadflow.test", password: "Super@123" },
    admin: { email: "admin@acadflow.test", password: "Admin@123" },
  }}), { headers: { "Content-Type": "application/json" } });
});
