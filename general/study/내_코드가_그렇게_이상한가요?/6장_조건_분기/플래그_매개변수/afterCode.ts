import {DamageType} from "./DamageType";
import {Damage} from "./Damage";

class Main {
  private readonly damages: Map<DamageType, Damage>

  damage(damageType: DamageType, damageAmount: number){
    const damage = this.damages.get(damageType);
    if (!damage) {
      throw new Error('알 수 없는 데미지 타입입니다.');
    }

    damage.execute(damageAmount);
  }
}
