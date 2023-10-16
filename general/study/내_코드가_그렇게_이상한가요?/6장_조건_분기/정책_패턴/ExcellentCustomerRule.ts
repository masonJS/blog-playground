import {PurchaseHistory} from "./PurchaseHistory";

export interface ExcellentCustomerRule {
  ok(history: PurchaseHistory): boolean
}

export class GoldCustomerPurchaseAmountRule implements ExcellentCustomerRule {
  ok(history: PurchaseHistory): boolean {
    return 100000 < history.totalAmount
  }
}

export class PurchaseFrequencyRule implements ExcellentCustomerRule {
  ok(history: PurchaseHistory): boolean {
    return 10 < history.purchaseFrequencyPerMonth
  }
}

export class ReturnRateRule implements ExcellentCustomerRule {
  ok(history: PurchaseHistory): boolean {
    return 0.2 > history.returnRate
  }
}
