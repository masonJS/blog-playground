import {Member, StateType} from "./Member";

export interface Damage {
  execute(damage: number): void
}

export class HitPointDamage implements Damage {
  private readonly member: Member;

  execute(damage: number): void {
    this.member.hitPoint -= damage;
    if (0 < this.member.hitPoint) {
      return;
    }

    this.member.hitPoint = 0;
    this.member.addState(StateType.DEAD);
  }
}

export class MagicPointDamage implements Damage {
  private readonly member: Member;

  execute(damage: number): void {
    this.member.magicPoint -= damage;
    if (0 < this.member.magicPoint) {
      return;
    }

    this.member.magicPoint = 0;
  }
}
