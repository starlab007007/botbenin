export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const LABELS = ["", "Faible", "Moyen", "Bon", "Excellent"];
const COLORS = ["bg-muted", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="space-y-1 px-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? COLORS[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{LABELS[score]}</p>
    </div>
  );
}
