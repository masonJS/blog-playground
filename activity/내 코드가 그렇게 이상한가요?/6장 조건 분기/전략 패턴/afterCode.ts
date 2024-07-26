import {MagicType} from "./MagicType";
import {Fire, HellFire, Lightning, Magic} from "./Magic";
import {Member} from "./Member";

function main() {
  const member = new Member();
  const magicExecutor = new MagicExecutor(member);

  magicExecutor.magicAttack(MagicType.FIRE);
}

export class MagicExecutor {
  private readonly magics = new Map<MagicType, Magic>();
  constructor(member: Member) {
    this.magics.set(MagicType.FIRE, new Fire(member));
    this.magics.set(MagicType.LIGHTNING, new Lightning(member));
    this.magics.set(MagicType.HELL_FIRE, new HellFire(member));
  }

  magicAttack(magicType: MagicType) {
    const magic = this.magics.get(magicType);
    if (!magic) {
      throw new Error('알 수 없는 마법입니다.');
    }

    this.showMagicName(magic);
    this.consumeMagicPoint(magic);
    this.consumeTechnicalPoint(magic);
    this.magicDamage(magic);
  }

  private showMagicName(magic: Magic) {
    // 마법 이름 출력
  }

  private consumeMagicPoint(magic: Magic) {
    // 마법 포인트 소모
  }

  private consumeTechnicalPoint(magic: Magic) {
    // 기술 포인트 소모
  }

  private magicDamage(magic: Magic) {
    // 마법 데미지 계산
  }
}
