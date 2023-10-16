import {Member, StateType} from "./Member";

class Main {
  private readonly member: Member;

  damage(damageFlag: boolean, damageAmount: number){
    if (damageFlag) {
      this.member.hitPoint -= damageAmount;
      if (0 < this.member.hitPoint) {
        return;
      }

      this.member.hitPoint = 0;
      this.member.addState(StateType.DEAD);
    } else {
      this.member.magicPoint -= damageAmount;
      if (0 < this.member.magicPoint) {
        return;
      }

      this.member.magicPoint = 0;
    }
  }
}
