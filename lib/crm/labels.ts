// Słowniki CRM: wartości w bazie i ich polskie nazwy w panelu.

export const listingStatuses = [
  ["szkic", "Szkic"],
  ["aktywna", "Aktywna (na stronie)"],
  ["rezerwacja", "Rezerwacja (na stronie)"],
  ["sprzedana", "Sprzedana / wynajęta"],
  ["archiwum", "Archiwum"],
] as const;

export const leadStatuses = [
  ["do_przejrzenia", "Do przejrzenia (z nbota)"],
  ["nowy", "Nowy, do kontaktu"],
  ["do_kontaktu", "Oddzwonić"],
  ["w_kontakcie", "W kontakcie"],
  ["umowione", "Umówione spotkanie"],
  ["pozyskany", "Pozyskany"],
  ["odrzucony", "Odrzucony"],
  ["pominiety", "Pominięty (z nbota)"],
] as const;

// poczekalnia: ogłoszenia z maili nbot czekają na decyzję „Do CRM” albo „Pomiń”;
// pominięte zostają w bazie ukryte, żeby to samo ogłoszenie nie wróciło z kolejnym mailem
export const REVIEW = "do_przejrzenia";
export const HIDDEN = ["do_przejrzenia", "pominiety"];

// skrzynka „Do kontaktu”: nowe zgłoszenia i te, do których trzeba wrócić
export const INBOX = ["nowy", "do_kontaktu"];

export const leadSources = [
  ["nbot", "nbot"],
  ["strona", "Formularz na stronie"],
  ["recznie", "Dodany ręcznie"],
] as const;

export const clientKinds = [
  ["sprzedajacy", "Sprzedający"],
  ["kupujacy", "Kupujący"],
  ["wynajmujacy", "Wynajmujący"],
  ["najemca", "Najemca"],
  ["inny", "Inny"],
] as const;

export const deals = [
  ["sprzedaz", "Sprzedaż"],
  ["wynajem", "Wynajem"],
] as const;

export const categoriesCrm = [
  ["mieszkania", "Mieszkanie"],
  ["domy", "Dom"],
  ["dzialki", "Działka"],
  ["lokale", "Lokal użytkowy"],
] as const;

export function label(list: readonly (readonly [string, string])[], v: string | null | undefined) {
  return list.find(([k]) => k === v)?.[1] ?? v ?? "";
}

export const auditLabels: Record<string, string> = {
  login_ok: "Logowanie",
  login_fail: "Nieudane logowanie",
  logout: "Wylogowanie",
  totp_enabled: "Włączenie 2FA (aplikacja)",
  email_otp_enabled: "Włączenie 2FA (e-mail)",
  password_changed: "Zmiana hasła",
  user_created: "Dodanie użytkownika",
  user_toggled: "Zmiana dostępu użytkownika",
  setup: "Pierwsze konto",
  listing_saved: "Zapis oferty",
  listing_deleted: "Usunięcie oferty",
  lead_saved: "Zmiana leada",
  lead_import: "Import z nbot",
  client_saved: "Zapis klienta",
};
