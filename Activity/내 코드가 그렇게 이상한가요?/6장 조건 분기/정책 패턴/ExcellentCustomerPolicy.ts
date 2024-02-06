import {ExcellentCustomerRule} from "./ExcellentCustomerRule";
import {PurchaseHistory} from "./PurchaseHistory";

export class ExcellentCustomerPolicy {
  private readonly rules = new Set<ExcellentCustomerRule>();

  addRule(rule: ExcellentCustomerRule) {
    this.rules.add(rule);
  }

  complyWithAll(history: PurchaseHistory): boolean {
    for (const rule of this.rules) {
      if (!rule.ok(history)) {
        return false;
      }
    }

    return true;
  }
}
