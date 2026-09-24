export function normalizeE164(
  value: unknown,
  defaultCountryCode = "+229",
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || /[A-Za-z]/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);

  const countryDigits = defaultCountryCode.replace(/\D/g, "") || "229";
  if (countryDigits === "229") {
    if (digits.startsWith("22901") && digits.length === 13) return `+${digits}`;
    if (digits.startsWith("229") && digits.length === 11) {
      return `+22901${digits.slice(3)}`;
    }
    if (digits.startsWith("01") && digits.length === 10) return `+229${digits}`;
    if (digits.length === 8) return `+22901${digits}`;
  }

  if (
    !raw.startsWith("+") && !raw.startsWith("00") &&
    !digits.startsWith(countryDigits)
  ) {
    digits = `${countryDigits}${digits}`;
  }
  return /^[1-9][0-9]{7,14}$/.test(digits) ? `+${digits}` : null;
}

export function providerPhone(e164: string) {
  return e164.replace(/^\+/, "");
}

export function phoneLast4(e164: string) {
  return e164.replace(/\D/g, "").slice(-4);
}

export function formatPhoneDisplay(e164: string) {
  if (/^\+22901\d{8}$/.test(e164)) {
    const local = e164.slice(4);
    return `+229 ${local.slice(0, 2)} ${local.slice(2, 4)} ${
      local.slice(4, 6)
    } ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }
  return e164;
}
