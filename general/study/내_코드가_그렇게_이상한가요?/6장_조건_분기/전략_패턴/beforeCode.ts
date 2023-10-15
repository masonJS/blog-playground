import {MagicType} from "./MagicType";
import {Member} from "./Member";


function main() {
  const member = new Member();
  const magic = new Magic(MagicType.FIRE, member);
}

class Magic {
  private readonly name: string;
  private readonly costMagicPoint: number;
  private readonly attackPower: number;
  private readonly costTechnicalPoint: number;

  constructor(magicType: MagicType, member: Member) {
    switch (magicType) {
      case MagicType.FIRE:
        this.name = '파이어';
        this.costMagicPoint = 1;
        this.attackPower = 1 + member.level * 0.5;
        this.costTechnicalPoint = 0;
        break
      case MagicType.LIGHTNING:
        this.name = '라이트닝';
        this.costMagicPoint = 2;
        this.attackPower = 2 + member.level * 1.5;
        this.costTechnicalPoint = 5;
        break
      case MagicType.HELL_FIRE:
        this.name = '헬파이어';
        this.costMagicPoint = 5;
        this.attackPower = 5 + member.level * 3;
        this.costTechnicalPoint = 10;
        break
      default:
        throw new Error('알 수 없는 마법입니다.');
    }
  }
}
