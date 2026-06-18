import type { TenantContext } from "@/lib/tenant/context";

export const DEFAULT_FEE_PERCENT = 8.33;

export type FeeCalculationMethod = "explicit" | "percentage" | "estimated";

export interface FeeDetail {
  method: FeeCalculationMethod;
  amount: number;
  percentUsed: number;
  source: string;
}

export function getDefaultFeePercent(_ctx?: TenantContext): number {
  if (process.env.DEFAULT_FEE_PERCENT) return parseFloat(process.env.DEFAULT_FEE_PERCENT);
  return DEFAULT_FEE_PERCENT;
}

export function estimateFeeAmount(
  offer: { offeredCtc: number; feePercent?: number | null; feeAmount?: number | null },
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): number {
  if (offer.feeAmount != null && offer.feeAmount > 0) return offer.feeAmount;
  const percent = offer.feePercent ?? defaultPercent;
  return Math.round(offer.offeredCtc * (percent / 100));
}

export function calculateFeeDetail(
  offer: { feeAmount?: number | null; feePercent?: number | null; offeredCtc: number },
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): FeeDetail {
  if (offer.feeAmount != null && offer.feeAmount > 0) {
    return {
      method: "explicit",
      amount: offer.feeAmount,
      percentUsed: Math.round((offer.feeAmount / offer.offeredCtc) * 10000) / 100,
      source: "offer.feeAmount",
    };
  }
  if (offer.feePercent != null && offer.feePercent > 0) {
    return {
      method: "percentage",
      amount: Math.round(offer.offeredCtc * (offer.feePercent / 100)),
      percentUsed: offer.feePercent,
      source: "offer.feePercent",
    };
  }
  return {
    method: "estimated",
    amount: Math.round(offer.offeredCtc * (defaultPercent / 100)),
    percentUsed: defaultPercent,
    source: "defaultPercent",
  };
}

export function computeTotalFee(
  applications: any[],
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): number {
  let total = 0;
  for (const app of applications) {
    for (const offer of app.offers ?? []) {
      if (offer.status === "ACCEPTED" || offer.status === "EXTENDED") {
        total += estimateFeeAmount(offer, defaultPercent);
      }
    }
  }
  return total;
}

export function estimateFeeForApplication(app: any, defaultPercent?: number): number {
  const offer = app.offers?.[0];
  if (offer) return estimateFeeAmount(offer, defaultPercent);
  const budgetMid = ((app.job?.salaryMin ?? 0) + (app.job?.salaryMax ?? 0)) / 2;
  if (budgetMid <= 0) return 0;
  return estimateFeeAmount({ offeredCtc: budgetMid }, defaultPercent);
}
