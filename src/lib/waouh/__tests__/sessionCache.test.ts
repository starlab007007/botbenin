import { describe, expect, it } from "vitest";
import { clearWaouhAccountCache, shouldResetWaouhSession, readWaouhCacheOwner, writeWaouhCacheOwner } from "../sessionCache";

describe("account boundaries on shared devices", () => {
  it("removes private messages, unsent drafts and old chat state but preserves unrelated preferences", () => {
    const values = new Map([
      ["waouh_cache_owner_id", "previous-account"],
      ["waouh_main_msgs_old", "private messages"],
      ["waouh_outbox_old", "private unsent draft"],
      ["waouh_main_thread_started_at", "old cutoff"],
      ["waouh_web_session_id", "claimed-session"],
      ["waouh_open_matches_old", "private deals"],
      ["waouh.avatar.board", "private activity"],
      ["theme", "dark"],
    ]);
    const storage = {
      get length() { return values.size; },
      key(index: number) { return [...values.keys()][index] ?? null; },
      removeItem(key: string) { values.delete(key); },
    };
    let tabRemoved = "";
    clearWaouhAccountCache(storage, { removeItem(key: string) { tabRemoved = key; } });
    expect([...values]).toEqual([["theme", "dark"]]);
    expect(tabRemoved).toBe("waouh_post_auth_redirect");
  });
  it("keeps the same session when SIGNED_IN repeats for the current account", () => {
    expect(shouldResetWaouhSession("SIGNED_IN", "a", "a")).toBe(false);
    expect(shouldResetWaouhSession("TOKEN_REFRESHED", "a", "a")).toBe(false);
  });
  it("resets the private session on login, account switch and logout", () => {
    expect(shouldResetWaouhSession("SIGNED_IN", null, "a")).toBe(true);
    expect(shouldResetWaouhSession("SIGNED_IN", "a", "b")).toBe(true);
    expect(shouldResetWaouhSession("SIGNED_OUT", "a", null)).toBe(true);
  });
});

it("restores the cache owner across page reloads, preserving same-account outbox and clearing a different account", () => {
 const values = new Map<string,string>();
 const storage = {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 writeWaouhCacheOwner("a",storage);
 const restored=readWaouhCacheOwner(storage);
 expect(shouldResetWaouhSession("SIGNED_IN",restored,"a")).toBe(false);
 expect(shouldResetWaouhSession("INITIAL",restored,"a")).toBe(false);
 expect(shouldResetWaouhSession("INITIAL",restored,"b")).toBe(true);
 expect(shouldResetWaouhSession("INITIAL",restored,null)).toBe(true);
 writeWaouhCacheOwner(null,storage);
 expect(readWaouhCacheOwner(storage)).toBe(null);
});
