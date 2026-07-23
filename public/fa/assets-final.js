(() => {
  const openSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200">
    <defs>
      <radialGradient id="openShell" cx="36%" cy="22%" r="86%">
        <stop offset="0" stop-color="#fffdf5"/>
        <stop offset=".28" stop-color="#f4e7c8"/>
        <stop offset=".58" stop-color="#d9bd86"/>
        <stop offset=".82" stop-color="#a9763f"/>
        <stop offset="1" stop-color="#6b3e1d"/>
      </radialGradient>
      <linearGradient id="openLip" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fffef8"/>
        <stop offset=".48" stop-color="#ead8b5"/>
        <stop offset="1" stop-color="#9f7041"/>
      </linearGradient>
      <filter id="shadow" x="-35%" y="-35%" width="170%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".48"/>
      </filter>
    </defs>
    <g transform="rotate(-8 120 100)" filter="url(#shadow)">
      <path d="M25 111C22 57 66 18 119 14c57-5 101 32 97 83-4 50-50 84-104 82-54-2-85-27-87-68Z"
        fill="url(#openShell)" stroke="#f8edcf" stroke-width="4"/>
      <path d="M66 115C80 67 107 40 151 28c-17 19-31 39-38 60 18 8 33 23 39 46-31 17-61 13-86-19Z"
        fill="#24130b"/>
      <path d="M78 111c13-34 35-59 65-72-8 11-15 22-20 34 13 7 24 18 31 34-24 12-49 13-76 4Z"
        fill="#070301"/>
      <path d="M44 91C58 48 90 25 129 23" fill="none" stroke="url(#openLip)" stroke-width="13" stroke-linecap="round" opacity=".95"/>
      <path d="M59 135c25 18 65 24 102 12" fill="none" stroke="#7b4927" stroke-width="7" stroke-linecap="round" opacity=".5"/>
      <path d="M52 67c25-32 60-43 92-35" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".42"/>
      <g fill="#7d502b" opacity=".42">
        <circle cx="167" cy="74" r="2.2"/><circle cx="176" cy="89" r="1.8"/><circle cx="157" cy="112" r="2"/>
        <circle cx="92" cy="149" r="1.7"/><circle cx="184" cy="120" r="1.6"/>
      </g>
    </g>
  </svg>`;

  const closedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170">
    <defs>
      <radialGradient id="closedShell" cx="42%" cy="24%" r="92%">
        <stop offset="0" stop-color="#fffdf3"/>
        <stop offset=".34" stop-color="#f1e3bd"/>
        <stop offset=".66" stop-color="#caa76c"/>
        <stop offset=".88" stop-color="#8d5a2d"/>
        <stop offset="1" stop-color="#5f351a"/>
      </radialGradient>
      <linearGradient id="inner" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fffceb"/>
        <stop offset=".55" stop-color="#e2c88f"/>
        <stop offset="1" stop-color="#9c6a35"/>
      </linearGradient>
      <filter id="shadow2" x="-35%" y="-35%" width="170%" height="190%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".48"/>
      </filter>
    </defs>
    <g transform="rotate(5 120 85)" filter="url(#shadow2)">
      <path d="M20 100C30 55 73 25 126 22c54-3 96 23 94 61-2 38-40 67-96 68-58 2-111-15-104-51Z"
        fill="url(#closedShell)" stroke="#f4e4bc" stroke-width="4"/>
      <path d="M42 91c19-31 55-50 98-51 27-1 48 7 64 22-19 29-50 46-88 48-31 2-55-5-74-19Z"
        fill="url(#inner)" opacity=".92"/>
      <path d="M49 68c26-23 66-31 104-20" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".38"/>
      <path d="M37 121c34 17 92 22 142 2" fill="none" stroke="#6a3c20" stroke-width="8" stroke-linecap="round" opacity=".5"/>
      <g fill="#8c5b2e" opacity=".34">
        <circle cx="84" cy="72" r="1.8"/><circle cx="107" cy="61" r="1.5"/><circle cx="152" cy="74" r="2"/>
        <circle cx="166" cy="92" r="1.6"/><circle cx="74" cy="106" r="1.5"/>
      </g>
    </g>
  </svg>`;

  window.FA_ASSETS.fa_chain_mystic_hero =
    "data:image/webp;base64," + window.FA_ASSET_CHUNKS.hero.join("");
  window.FA_ASSETS.fa_chain_reference =
    "data:image/webp;base64," + window.FA_ASSET_CHUNKS.chain.join("");
  window.FA_ASSETS.cowrie_open_real =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(openSvg);
  window.FA_ASSETS.cowrie_closed_real =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(closedSvg);
})();