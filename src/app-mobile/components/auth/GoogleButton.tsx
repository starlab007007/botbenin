import { Loader2 } from "lucide-react";

interface Props {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

export function GoogleButton({ onClick, loading, label = "Continuer avec Google" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-13 flex items-center justify-center gap-3 rounded-2xl border-2 border-border bg-background font-semibold text-foreground active:scale-[0.98] transition-transform disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 18 18">
          <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
          <path d="M8.99999 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 8.99999 14.4204C6.65545 14.4204 4.67181 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48181 18 8.99999 18Z" fill="#34A853"/>
          <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
          <path d="M8.99999 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 8.99999 0C5.48181 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67181 5.16273 6.65545 3.57955 8.99999 3.57955Z" fill="#EA4335"/>
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
