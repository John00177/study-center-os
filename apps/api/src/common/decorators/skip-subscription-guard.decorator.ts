import { SetMetadata } from "@nestjs/common";

export const SKIP_SUBSCRIPTION_GUARD_KEY = "skipSubscriptionGuard";

/**
 * Exempts a single route from an otherwise plan-gated controller — e.g.
 * AnalyticsController is Growth+, but /analytics/quick-stats also backs the
 * core owner Dashboard (not the premium Analytics page) and must stay
 * available on every plan.
 */
export const SkipSubscriptionGuard = () => SetMetadata(SKIP_SUBSCRIPTION_GUARD_KEY, true);
