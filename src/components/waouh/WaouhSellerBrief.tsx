import { useMemo } from "react";
import { MapPin, ShieldCheck, Users } from "lucide-react";
import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { briefMoney } from "@/lib/waouh/chatMarketBrief";
import { sellerBrief, type PriceReference } from "@/lib/waouh/sellerBrief";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
import "./waouh-search-live.css";

/**
 * Après la publication d'une annonce : le prix demandé situé face au marché, les
 * acheteurs qui correspondent vraiment, et la possibilité de confier la vente à Bot.
 */
export function WaouhSellerBrief({ results, reference, city, query, articleId }: {
  results: WaouhResultCard[];
  reference?: PriceReference;
  city?: string | null;
  query?: string | null;
  articleId?: string;
}) {
  const brief = useMemo(() => sellerBrief(results, { reference, city, query }), [results, reference, city, query]);
  const { verdict, buyers } = brief;
  if (!verdict && !buyers.length && !brief.priceNote) return null;
  const first = buyers[0] ?? null;

  return (
    <section className="wsl-brief" aria-label="Votre vente" data-testid="seller-brief">
      <header className="wsl-brief-head">
        <BotLiveAvatar size={38} />
        <div>
          <strong>Votre annonce est en ligne</strong>
          <span>{buyers.length ? `${buyers.length} acheteur${buyers.length > 1 ? "s" : ""} possible${buyers.length > 1 ? "s" : ""}` : "Je cherche des acheteurs pour vous"}</span>
        </div>
      </header>

      {verdict && (
        <div className={`wr-gauge wr-gauge-${verdict.tone === "low" ? "good" : verdict.tone === "high" ? "high" : "fair"} wsl-seller-gauge`}>
          <div className="wr-gauge-head">
            <strong>{verdict.label}</strong>
            <small>{verdict.count} annonce{verdict.count > 1 ? "s" : ""} comparable{verdict.count > 1 ? "s" : ""}</small>
          </div>
          <div className="wr-gauge-track" role="img" aria-label={`${verdict.label}. Votre prix ${briefMoney(verdict.asking)}, médiane ${briefMoney(verdict.median)}.`}>
            <span className="wr-gauge-dot" style={{ left: `${verdict.position}%` }} />
          </div>
          <div className="wr-gauge-scale">
            <span>{briefMoney(verdict.low)}</span>
            <span>Médiane {briefMoney(verdict.median)}</span>
            <span>{briefMoney(verdict.high)}</span>
          </div>
          <p className="wsl-seller-advice">{verdict.advice}</p>
        </div>
      )}
      {brief.priceNote && <p className="wsl-seller-advice">{brief.priceNote}</p>}

      {buyers.length > 0 && (
        <div className="wsl-stats">
          <div>
            <span><Users size={13} aria-hidden="true" />Acheteurs</span>
            <b>{buyers.length}</b>
            <small>correspondant à votre annonce</small>
          </div>
          <div>
            <span><ShieldCheck size={13} aria-hidden="true" />Joignables</span>
            <b>{brief.reachable}/{buyers.length}</b>
            <small>contact possible</small>
          </div>
          <div>
            <span><MapPin size={13} aria-hidden="true" />Votre zone</span>
            <b>{city ? `${brief.inZone}/${buyers.length}` : "—"}</b>
            <small>{city || "Zone non précisée"}</small>
          </div>
        </div>
      )}

      {first && (
        <WaouhDelegateButton
          result={first as never}
          mode="sell"
          articleId={articleId}
          city={city}
          label={buyers.length > 1 ? `Confier la vente à Bot · ${Math.min(4, buyers.length)} acheteurs` : "Confier la vente à Bot"}
          alternates={buyers.slice(1, 4).map((b) => ({ fabric_id: String((b as { fabric_id?: unknown }).fabric_id ?? ""), city: b.city ?? null }))}
        />
      )}
      {!buyers.length && (
        <p className="wsl-seller-advice">Votre annonce reste visible. Dites-moi « Bot, occupe-t’en » et je cherche des acheteurs en continu, puis je vous préviens.</p>
      )}
    </section>
  );
}

export default WaouhSellerBrief;
