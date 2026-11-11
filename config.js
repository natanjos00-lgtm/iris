// Chaves PÚBLICAS do Supabase (seguras para ficar no código: quem protege os dados é o RLS).
// Nunca coloque aqui a chave "service_role" nem a chave do Gemini.
window.IRIS_CONFIG = {
  SUPABASE_URL: "https://dzmkqbcyiplhmdpmchii.supabase.co",
  SUPABASE_KEY: "sb_publishable_Wd-osT805AY2wr13NdEcpQ_MJQANBK-",
  // ID do cliente OAuth do Google (público, não é segredo). Usado só para ler o Gmail.
  // Chave PÚBLICA dos avisos (não é segredo).
  VAPID_PUBLIC_KEY: "BKEHJdwN3wrjzDpk4cRbD6BplC8jg81y2cAK02xD5T5y57SlF7g_4M9VxqIFGCN9w47YvZkXzFeplkl6uxnYfCs",
  // App da casa (House to Home): endereço e chave PÚBLICA (a segurança é do próprio banco, por casa). A ÍRIS só lê.
  HOUSE_URL: "https://fbhqxnemzkmqfxglrubr.supabase.co",
  HOUSE_KEY: "sb_publishable_4pRAQMyjCyg0josAwc4xQg_s-W6rHYe",
  GOOGLE_CLIENT_ID: "788825571711-6n72d20ric9di5otjebjsjrq6qt1nbmu.apps.googleusercontent.com"
};
