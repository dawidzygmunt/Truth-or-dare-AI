# 0003: Stripe Checkout za portem `PaymentProvider`

## Status

Zaakceptowany dla web i PWA. Rozstrzygnięcie płatności w aplikacji z Google Play jest odłożone do osobnego ADR przed publikacją w Google Play.

## Kontekst

- Priorytet: prostota integracji ważniejsza niż wysokość prowizji.
- Płatne edycje wymagają logowania i zakupu. Granie w darmowe edycje jest bez konta.
- Aplikacja trafi później do Google Play jako TWA nad tą samą PWA, a sposób płatności na Androidzie nie jest jeszcze rozstrzygnięty. Rozważane opcje to Google Play Billing (Digital Goods API + Payment Request API) i program billing choice Google Play, w którym Stripe działa także w aplikacji z Play (wyższe łączne opłaty i wymogi UI).
- Uprawnienia mają działać na każdej platformie: kupione na webie ma działać w aplikacji i odwrotnie.
- Płatne karty nigdy nie mogą trafić do bundla frontu.

Źródła: `docs/architecture.md` (§3, §7, §8), `docs/KICKOFF.md` (Płatności), `docs/roadmap.md` (T9.1).

## Decyzja

**Web i PWA: Stripe Checkout** (strona hostowana przez Stripe): karty, BLIK, Przelewy24, Apple Pay, Google Pay. Brak własnego formularza płatności.

Przepływ:

```
POST /billing/checkout → przekierowanie do Stripe
  → webhook checkout.session.completed → GrantEntitlement
  → powrót do aplikacji, odświeżenie /me
```

- **Webhook jest jedynym źródłem prawdy o zakupie**, nie parametr w URL powrotu. Obsługa jest idempotentna po `event.id`.
- **Stripe jest za portem `PaymentProvider`** w `billing/application/ports/payment-provider.port.ts`:

  ```
  createCheckout(userId, productId): Promise<{ redirectUrl }>
  parseWebhook(rawBody, signature): Promise<PaymentEvent>
  ```

  Adapter Stripe leży w `infrastructure`. Use case'y nie wywołują Stripe bezpośrednio (ADR 0002).

- **`Entitlement` jest przypisane do konta** i ma pole `source` (`"stripe"` lub `"google_play"`), więc działa na każdej platformie. Dostęp do talii płatnej edycji serwer przyznaje dopiero po sprawdzeniu `Entitlement`.
- Produkty: jednorazowe zakupy edycji oraz pakiet „all access”. Bez subskrypcji na start. Model cen jest założeniem z `docs/KICKOFF.md` oczekującym na potwierdzenie (roadmap D3).
- **Google Play**: wybór między Play Billing a billing choice zapada w osobnym ADR przed publikacją. Niezależnie od wyniku powstaje nowy adapter portu `PaymentProvider`, bez zmian w use case'ach.

## Konsekwencje

- Do aplikacji nie trafiają dane kart, a formularz płatności jest po stronie Stripe.
- Stan zakupu zależy wyłącznie od poprawnie zweryfikowanego webhooka. Wymaga to weryfikacji podpisu (`parseWebhook`) i idempotencji po `event.id`.
- Dodanie płatności z Google Play to nowy adapter i nowe wartości `source`, bez zmian w domenie i use case'ach.
- Webhook Stripe testujemy integracyjnie (Testcontainers) na podpisanych payloadach testowych. Scenariusz E2E zakupu używa Stripe w trybie testowym albo zamockowanego endpointu checkout z wstrzykniętym webhookiem.
- Konfiguracja Stripe (klucze, sekret webhooka) trafia do `.env`, nie do repozytorium.
- Decyzja o płatnościach w Google Play pozostaje otwarta (roadmap T9.1) i wymaga osobnego ADR.

## Odrzucone opcje

- **Własny formularz płatności**: zamiast niego hostowany Stripe Checkout.
- **Parametr w URL powrotu jako źródło prawdy o zakupie**: źródłem prawdy jest webhook.
- **Subskrypcje na start**: tylko jednorazowe zakupy edycji i „all access”.
- **Rozstrzygnięcie płatności w Google Play teraz**: odłożone, nie odrzucone (osobny ADR przed publikacją).
- **Optymalizacja pod najniższą prowizję**: priorytetem jest prostota integracji.
