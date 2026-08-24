function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-slate-200", "bg-red-400", "bg-yellow-400", "bg-blue-500", "bg-green-500"];

export function PasswordStrengthBar({ password }: { password: string }) {
  const score = scorePassword(password);

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? COLORS[score] : "bg-slate-100"}`} />
        ))}
      </div>
      {password.length > 0 && <p className="mt-1 text-xs text-slate-500">{LABELS[score]}</p>}
    </div>
  );
}
