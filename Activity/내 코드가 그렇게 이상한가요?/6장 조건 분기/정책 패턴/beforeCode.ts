import {PurchaseHistory} from "./PurchaseHistory";

function isGoldCustomer(history: PurchaseHistory) {
  if (100000 < history.totalAmount) {
    if (10 < history.purchaseFrequencyPerMonth) {
      if (0.2 > history.returnRate) {
        return true
      }
    }
  }

  return false
}

function isSilverCustomer(history: PurchaseHistory) {
  if (10 < history.purchaseFrequencyPerMonth) {
    if (0.2 > history.returnRate) {
      return true
    }
  }

  return false
}
