import {PurchaseHistory} from "./PurchaseHistory";

function isGoldCustomer(history: PurchaseHistory) {
  if (100000 < history.totalAmount) {
    if (10 < history.purchaseFrequencyPerMonth) {
      if (0.2 < history.returnRate) {
        return true
      }
    }
  }

  return false
}

function isSilverCustomer(history: PurchaseHistory) {
  if (50000 < history.totalAmount) {
    if (5 < history.purchaseFrequencyPerMonth) {
      if (0.1 < history.returnRate) {
        return true
      }
    }
  }

  return false
}
