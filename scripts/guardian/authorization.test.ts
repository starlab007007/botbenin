import { guardianHandle } from "../../supabase/functions/_shared/waouh-guardian.ts";
const equal = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw Error("Assertion failed");
};
Deno.test("Probe cannot repair/configure; event identity is server-verified", async () => {
  const calls: Array<[string, unknown]> = [];
  const sb = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args]);
      return {
        data: name === "waouh_guardian_probe_actor" ? "external" : false,
        error: null,
      };
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: "real-user" } },
        error: null,
      }),
    },
  };
  const req = new Request("https://test", {
    headers: { "x-guardian-probe": "external-token" },
  });
  for (
    const action of [
      "claim",
      "finish",
      "configure",
      "snapshot",
      "activate",
      "tick",
    ]
  ) {
    equal(
      (await guardianHandle(req, sb, { action: "guardian." + action }))?.status,
      403,
    );
  }
  equal(calls.every(([name]) => name === "waouh_guardian_probe_actor"), true);
  const userReq = new Request("https://test", {
    headers: { authorization: "Bearer verified" },
  });
  await guardianHandle(userReq, sb, {
    action: "guardian.event",
    user_id: "forged-user",
    platform: "web",
    code: "render_error",
    surface: "other",
  });
  equal(calls.at(-1), ["waouh_guardian_client_event", {
    p_user_id: "real-user",
    p_platform: "web",
    p_code: "render_error",
    p_surface: "other",
  }]);
  equal(
    (await guardianHandle(userReq, sb, { action: "guardian.snapshot" }))
      ?.status,
    403,
  );
});
Deno.test("External observer distinguishes reachable control from fresh internal checks", async () => {
  const req = new Request("https://test", {
    headers: { "x-guardian-probe": "external-token" },
  });
  for (
    const [data, error, expected] of [
      [
        {
          status: "healthy",
          last_seen_at: new Date().toISOString(),
          fresh_for_seconds: 420,
        },
        null,
        true,
      ],
      [
        {
          status: "healthy",
          last_seen_at: new Date(Date.now() - 421000).toISOString(),
          fresh_for_seconds: 420,
        },
        null,
        false,
      ],
      [null, null, false],
      [null, { message: "unavailable" }, false],
    ] as const
  ) {
    const q: any = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data, error }),
    };
    const sb = {
      rpc: async () => ({ data: "external", error: null }),
      from: () => q,
    };
    const response = await guardianHandle(req, sb, { action: "guardian.ping" });
    equal(await response!.json(), { ok: true, monitoring_fresh: expected });
  }
});
