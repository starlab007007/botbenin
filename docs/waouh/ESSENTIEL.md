# WAOUH Essentiel — 18.33

The Avatar buy/sell/find surfaces on Web and Flutter now use a single compact offer list, an on-demand offer sheet, a five-offer comparison tray and separate Offers / Follow tabs. Original canonical offer identifiers and action handlers are retained. No product images, prices, stock or verification badges are manufactured.

## Disclosure and actions

- Initial offer: real photo or explicit placeholder, title, observed price/range/currency, unit uncertainty, location, selection and open action.
- Detail: photo gallery, one short advice line, market references and reasons behind disclosures, primary action and secondary actions.
- Bot: explicit sheet for autonomy/count; advanced channel controls remain opt-in. Existing confirmation before launching contacts remains in place.
- Follow: human business status and next action. Mission controls, pause/resume/stop, permissions, refresh, price watch and conversation history remain accessible.
- Products, services and announcements retain distinct labels. Announcements do not require a numeric price proposal.

## Evidence and identity

Only repeated fabric IDs or explicit references to the same canonical article/catalog item are merged. Similar titles, a shared city and the final four digits of a phone never identify a duplicate seller or offer. Count labels refer to offers; identified people are counted only from full opaque user identifiers.

Missing price is not zero. Missing unit remains unknown. The market median needs at least two documented comparable references with matching known unit, model and currency, with a maximum of five distinct source URLs. Scores and unsourced prose are not evidence of a market price. Search results and seller actions keep their original objects after filtering.

## Validation and release

Web component tests exercise deduplication, uncertainty, five-item selection, filters, original callback identities, and new-search state reset. Flutter tests exercise the equivalent rules and a 320px viewport. The existing commerce, identity and navigation suites remain part of CI. Android is built by GitHub Actions using the established signing key; local Flutter SDK execution is not required.

All release manifests and the Flutter build number must pass `scripts/verify-waouh-release.py`. Production delivery uses the existing Web deployment and Android release workflows. This change does not create new outreach, payment or database permissions and does not reconnect the external WhatsApp session.
