---
name: Rail latéral web — parité modules Flutter
description: Organisation du rail ERP web en 4 sections et mapping brique/route pour chaque module Flutter
type: feature
---
Rail web (`src/erp/WebErpShell.tsx`) organisé en 4 sections, chaque entrée ouvre une brique dans le cadre central (zéro navigation) :

- Communication : Chat Command Center (/app/chat), Radar, WhatsApp IA (/app/whatsapp), Diffusion (/app/diffusion)
- Agents IA : Bots (/app/bots), Agents IA (/app/agents), Conversationnel (/app/bots/new), BI WAOUH IA (/app/agents/bi), Stock WAOUH IA (/app/agents/stock), Présence QR (/app/agents/attendance)
- Commerce : Boutiques (/app/partner/businesses), Ventes (/app/partner/sales), Partenaires (/app/partner)
- Services IA : AprèsBac IA (/app/apres-bac), FA IA (/app/fa)

BI / Stock / Présence ouvrent d'abord `src/erp/BrickHome.tsx` (cartes smart + compteurs live via biRepository / stockRepository / presenceRepository), pas le wizard.
FA IA : `src/app-mobile/screens/FaIaScreen.tsx` → edge function `waouh-fa-chat` (quota 1/jour, code 6 chiffres = 3 consultations).
`/app/apres-bac` n'est plus derrière FlutterParityGate.
