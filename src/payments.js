const BOT_API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

export async function createStarsInvoiceLink({ botToken, title, description, payload, amountStars }) {
  const body = {
    title,
    description,
    payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: title, amount: amountStars }]
  };

  const res = await fetch(BOT_API(botToken, "createInvoiceLink"), {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`createInvoiceLink error: ${JSON.stringify(data)}`);
  return data.result;
}
