import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatAssistantText, legacyOfferSections } from "@/lib/waouh/messagePresentation";
import "./waouh-message-text.css";

function Markdown({ text }: { text: string }) {
  return <div className="waouh-message-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="waouh-message-table" tabIndex={0} role="region" aria-label="Tableau de comparaison"><table>{children}</table></div>,
  }}>{formatAssistantText(text)}</ReactMarkdown></div>;
}

function ExpandableText({ text }: { text: string }) {
  if (text.length < 900) return <Markdown text={text} />;
  // Keep the complete answer accessible without clipping Markdown or code blocks.
  const firstParagraph = text.split(/\n\s*\n/)[0];
  const preview = firstParagraph.length < 350 && !firstParagraph.includes("```") ? firstParagraph : "Réponse détaillée";
  const remainder = preview === firstParagraph ? text.slice(firstParagraph.length).trimStart() : text;
  return <><Markdown text={preview} /><details className="waouh-message-details"><summary>Lire la suite</summary><Markdown text={remainder} /></details></>;
}

/** Shared text presentation for the main chat, Deal Rooms, and history. */
export function WaouhMessageText({ text, isUser = false, hasResults = false }: { text: string; isUser?: boolean; hasResults?: boolean }) {
  if (isUser) return <div className="whitespace-pre-wrap break-words">{text}</div>;
  const offers = hasResults ? [] : legacyOfferSections(text);
  if (!offers.length) return <ExpandableText text={text} />;
  const card = (offer: (typeof offers)[number], index: number) => <article key={index} className="waouh-legacy-offer"><h4>{offer.title}</h4><ExpandableText text={offer.text} /></article>;
  return <section className="waouh-legacy-offers" aria-label="Offres trouvées">
    <div className="waouh-legacy-offers-heading">{offers.length} offres trouvées</div>
    {offers.slice(0, 2).map(card)}
    {offers.length > 2 && <details className="waouh-message-details"><summary>{offers.length - 2} autres offres</summary><div className="waouh-legacy-offers">{offers.slice(2).map(card)}</div></details>}
    <details className="waouh-message-details"><summary>Message complet</summary><Markdown text={text} /></details>
  </section>;
}
