import { assert, assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertPostgresTarget, assertResolvesPublic, assertSupabaseApiUrl, EgressError, isPrivateIpv4, isPrivateIpv6, isPublicHostname,
} from "./waouh-egress-guard.ts";

Deno.test("IPv4 privées, loopback, lien local, métadonnées cloud, CGNAT", () => {
  for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "172.31.255.255", "192.168.1.10", "100.64.0.1", "0.0.0.0", "224.0.0.1", "192.0.0.5"]) assert(isPrivateIpv4(ip), ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "203.0.113.9"]) assert(!isPrivateIpv4(ip), ip);
});

Deno.test("IPv6 : loopback, ULA, lien local, IPv4 mappée privée", () => {
  for (const ip of ["::1", "[::1]", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "ff02::1"]) assert(isPrivateIpv6(ip), ip);
  assert(!isPrivateIpv6("2606:4700:4700::1111"));
});

Deno.test("noms d'hôte : internes, entiers/hex déguisés, sans point → refusés", () => {
  for (const h of ["localhost", "127.0.0.1", "2130706433", "0x7f000001", "db.internal", "nas.local", "monserveur", "169.254.169.254", "[::1]", "", "a b.com"]) assert(!isPublicHostname(h), h);
  for (const h of ["db.exemple.com", "aws-0-eu.pooler.supabase.com", "8.8.8.8", "DB.Exemple.COM."]) assert(isPublicHostname(h), h);
});

Deno.test("URL Supabase : uniquement https://<réf>.supabase.co, sans identifiants ni port", () => {
  assertEquals(assertSupabaseApiUrl("https://LJZWQYZAOVNANDPYFPGC.supabase.co/rest/v1/"), "https://ljzwqyzaovnandpyfpgc.supabase.co");
  for (const bad of [
    "http://ljzwqyzaovnandpyfpgc.supabase.co", "https://evil.com", "https://ljzwqyzaovnandpyfpgc.supabase.co.evil.com",
    "https://user:pw@ljzwqyzaovnandpyfpgc.supabase.co", "https://ljzwqyzaovnandpyfpgc.supabase.co:8443", "https://169.254.169.254",
    "https://localhost", "pas une url", "https://court.supabase.co",
  ]) assertThrows(() => assertSupabaseApiUrl(bad), EgressError, undefined, bad);
});

Deno.test("PostgreSQL : hôte public et ports 5432/6543 seulement", () => {
  assertPostgresTarget("db.exemple.com", 5432);
  assertPostgresTarget("db.exemple.com", 6543);
  assertThrows(() => assertPostgresTarget("10.0.0.5", 5432), EgressError);
  assertThrows(() => assertPostgresTarget("db.exemple.com", 22), EgressError);
  assertThrows(() => assertPostgresTarget("localhost", 5432), EgressError);
});

Deno.test("résolution DNS : une adresse interne (rebinding) ou aucune adresse → refus", async () => {
  const ok = (_n: string, t: string) => t === "A" ? Promise.resolve(["93.184.216.34"]) : Promise.reject(new Error("no AAAA"));
  await assertResolvesPublic("db.exemple.com", ok as any);
  const rebinding = (_n: string, t: string) => t === "A" ? Promise.resolve(["93.184.216.34", "10.0.0.7"]) : Promise.resolve([]);
  await assertRejects(() => assertResolvesPublic("evil.exemple.com", rebinding as any), EgressError, "interne");
  const none = () => Promise.reject(new Error("nxdomain"));
  await assertRejects(() => assertResolvesPublic("absent.exemple.com", none as any), EgressError, "introuvable");
  await assertResolvesPublic("8.8.8.8", none as any);
});
