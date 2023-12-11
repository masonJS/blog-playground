import {ExcellentCustomerPolicy} from "./ExcellentCustomerPolicy";
import {GoldCustomerPurchaseAmountRule, PurchaseFrequencyRule, ReturnRateRule} from "./ExcellentCustomerRule";
import {PurchaseHistory} from "./PurchaseHistory";

class GoldCustomerPolicy {
  private readonly policy: ExcellentCustomerPolicy;

  constructor() {
    this.policy = new ExcellentCustomerPolicy();
    this.policy.addRule(new GoldCustomerPurchaseAmountRule());
    this.policy.addRule(new PurchaseFrequencyRule());
    this.policy.addRule(new ReturnRateRule());
  }

  complyWithAll(history: PurchaseHistory): boolean {
    return this.policy.complyWithAll(history);
  }
}

class SilverCustomerPolicy {
  private readonly policy: ExcellentCustomerPolicy;

  constructor() {
    this.policy = new ExcellentCustomerPolicy();
    this.policy.addRule(new PurchaseFrequencyRule());
    this.policy.addRule(new ReturnRateRule());
  }

  complyWithAll(history: PurchaseHistory): boolean {
    return this.policy.complyWithAll(history);
  }
}
