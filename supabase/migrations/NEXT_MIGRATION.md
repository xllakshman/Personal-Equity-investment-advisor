-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–027** (027 on 2026-10-05). **028 not applied.**
- **PROD** `ndgvglcrkbygovlszxze`: **001–026** (026 on 2026-10-04). Maya seed not applied. `holdings` = 0. **027 not applied. 028 not applied.**

## Next on DEV / PROD

**028** `028_holding_lot_kind.sql` is in git. Apply only when the user names the env (DEV or PROD), file `028`, and `CONFIRM_APPLY=1`. Until then `/portfolio` and `/desk` treat every lot as Retail and skip writing `lot_kind`.

Apply **027** to PROD only when the user names **prod**, file `027`, and `CONFIRM_APPLY=1`.
