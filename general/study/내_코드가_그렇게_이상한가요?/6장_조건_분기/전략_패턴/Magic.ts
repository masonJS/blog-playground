import {Member} from "./Member";
import {MagicPoint} from "./vo/MagicPoint";
import {AttackPower} from "./vo/AttackPower";
import {TechnicalPoint} from "./vo/TechnicalPoint";

export interface Magic {
  name: string;
  costMagicPoint: MagicPoint;
  attackPower: AttackPower;
  costTechnicalPoint: TechnicalPoint;
}

export class Fire implements Magic {
  constructor(private readonly member: Member) {}

  get name(): string {
    return '파이어';
  }

  get costMagicPoint(): MagicPoint {
    return new MagicPoint(1);
  }

  get attackPower(): AttackPower {
    const value =  1 + this.member.level * 0.5;
    return new AttackPower(value);
  }

  get costTechnicalPoint(): TechnicalPoint {
    return new TechnicalPoint(0)
  }
}

export class Lightning implements Magic {
  constructor(private readonly member: Member) {}

  get name(): string {
    return '라이트닝';
  }

  get costMagicPoint(): MagicPoint {
    return new MagicPoint(2)
  }

  get attackPower(): AttackPower {
    const value =  2 + this.member.level * 1.5;
    return new AttackPower(value);
  }

  get costTechnicalPoint(): TechnicalPoint {
    return new TechnicalPoint(5);
  }
}

export class HellFire implements Magic {

  constructor(private readonly member: Member) {}

  get name(): string {
    return '헬파이어';
  }

  get costMagicPoint(): MagicPoint {
    return new MagicPoint(5);
  }

  get attackPower(): AttackPower {
    const value =  5 + this.member.level * 3;
    return new AttackPower(value);
  }

  get costTechnicalPoint(): TechnicalPoint {
    return new TechnicalPoint(10);
  }
}
