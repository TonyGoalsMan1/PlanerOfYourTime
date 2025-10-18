import crypto from "crypto";

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
export function verifyInitData(initData, botToken) {
  if (!initData) return null;
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const checkHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (checkHash !== hash) return null;

  try {
    return JSON.parse(urlParams.get("user"));
  } catch {
    return null;
  }
}
