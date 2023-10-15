import {Member} from "./Member";

export interface Magic {
  name: string;
  costMagicPoint: number;
  attackPower: number;
  costTechnicalPoint: number;
}

export class Fire implements Magic {
  constructor(private readonly member: Member) {}

  get name(): string {
    return '파이어';
  }

  get costMagicPoint(): number {
    return 1;
  }

  get attackPower(): number {
    return 1 + this.member.level * 0.5;
  }

  get costTechnicalPoint(): number {
    return 0;
  }
}

export class Lightning implements Magic {
  constructor(private readonly member: Member) {}

  get name(): string {
    return '라이트닝';
  }

  get costMagicPoint(): number {
    return 2;
  }

  get attackPower(): number {
    return 2 + this.member.level * 1.5;
  }

  get costTechnicalPoint(): number {
    return 5;
  }
}

export class HellFire implements Magic {

  constructor(private readonly member: Member) {}

  get name(): string {
    return '헬파이어';
  }

  get costMagicPoint(): number {
    return 5;
  }

  get attackPower(): number {
    return 5 + this.member.level * 3;
  }

  get costTechnicalPoint(): number {
    return 10;
  }
}
