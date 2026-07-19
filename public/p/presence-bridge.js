(() => {
  const code = (new URLSearchParams(window.location.search).get('c') || '').trim().toLowerCase();
  if (!/^r[a-f0-9]{16}$/.test(code)) return;

  const target = new URL(
    'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-presence-public-page',
  );
  target.searchParams.set('token', code);
  window.location.replace(target.toString());
})();
