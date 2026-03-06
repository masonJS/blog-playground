# Decorator Pattern

## Decorator 패턴이란?
- 객체에 **동적으로 새로운 책임(기능)을 추가**하는 구조적(Structural) 디자인 패턴
- 상속 대신 **조합(Composition)**으로 기능을 확장한다
- 핵심 원칙: **OCP(개방-폐쇄 원칙)** — 기존 코드를 수정하지 않고 기능을 확장

## 왜 필요한가?

### 상속으로 기능을 확장할 때의 문제
```
// 커피 주문 시스템을 상속으로 구현하면?
Beverage
├── Espresso
├── EspressoWithMocha
├── EspressoWithWhip
├── EspressoWithMochaAndWhip   // 조합마다 클래스가 필요
├── Latte
├── LatteWithMocha
├── LatteWithWhip
├── LatteWithMochaAndWhip      // 클래스 폭발 (Class Explosion)
└── ...
```
- 옵션이 N개면 조합은 2^N개로 증가
- 새로운 옵션 추가 시 기존 클래스를 모두 수정해야 함

### Decorator로 해결
```
// Decorator: 런타임에 조합을 자유롭게 구성
const beverage = new WhipDecorator(new MochaDecorator(new Espresso()));
```
- 기능을 감싸기(Wrapping) 방식으로 중첩
- 새로운 옵션 추가 시 Decorator 클래스 하나만 추가하면 됨

## 구조

```
┌──────────────────┐
│    Component      │  ← 인터페이스
│  + operation()    │
└──────┬───────────┘
       │ implements
       ├───────────────────────────┐
       │                           │
┌──────┴───────────┐    ┌─────────┴──────────┐
│ ConcreteComponent │    │     Decorator       │ ← Component를 감싸는 추상 클래스
│ + operation()     │    │ - component: Component
└──────────────────┘    │ + operation()       │
                         └─────────┬──────────┘
                                   │ extends
                          ┌────────┴────────┐
                          │ ConcreteDecorator│
                          │ + operation()    │
                          └─────────────────┘
```

| 역할 | 설명 |
|---|---|
| Component | 공통 인터페이스 정의 |
| ConcreteComponent | 기본 동작을 구현하는 실체 |
| Decorator | Component를 필드로 갖고, 동일 인터페이스를 구현 |
| ConcreteDecorator | 감싼 Component에 부가 기능을 추가 |

## 코드 예제: 커피 주문 시스템 (TypeScript)

### Component 인터페이스
```typescript
interface Beverage {
  cost(): number;
  description(): string;
}
```

### ConcreteComponent
```typescript
class Espresso implements Beverage {
  cost(): number {
    return 3000;
  }

  description(): string {
    return '에스프레소';
  }
}

class Latte implements Beverage {
  cost(): number {
    return 4000;
  }

  description(): string {
    return '라떼';
  }
}
```

### Decorator 추상 클래스
```typescript
abstract class BeverageDecorator implements Beverage {
  constructor(protected readonly beverage: Beverage) {}

  abstract cost(): number;
  abstract description(): string;
}
```

### ConcreteDecorator
```typescript
class MochaDecorator extends BeverageDecorator {
  cost(): number {
    return this.beverage.cost() + 500;
  }

  description(): string {
    return `${this.beverage.description()} + 모카`;
  }
}

class WhipDecorator extends BeverageDecorator {
  cost(): number {
    return this.beverage.cost() + 300;
  }

  description(): string {
    return `${this.beverage.description()} + 휘핑`;
  }
}

class ShotDecorator extends BeverageDecorator {
  cost(): number {
    return this.beverage.cost() + 500;
  }

  description(): string {
    return `${this.beverage.description()} + 샷추가`;
  }
}
```

### 사용
```typescript
// 에스프레소 + 모카 + 휘핑
const order1 = new WhipDecorator(new MochaDecorator(new Espresso()));
console.log(order1.description()); // 에스프레소 + 모카 + 휘핑
console.log(order1.cost());        // 3800

// 라떼 + 샷추가 + 모카 + 모카
const order2 = new MochaDecorator(new MochaDecorator(new ShotDecorator(new Latte())));
console.log(order2.description()); // 라떼 + 샷추가 + 모카 + 모카
console.log(order2.cost());        // 5500
```

## 실무 예제: NestJS Middleware / Interceptor 스타일

NestJS에서 요청 처리 파이프라인은 Decorator 패턴과 동일한 구조로 동작한다.

### 로깅 + 인증 Decorator 체이닝
```typescript
// Component
interface RequestHandler {
  handle(request: Request): Promise<Response>;
}

// ConcreteComponent
class UserController implements RequestHandler {
  async handle(request: Request): Promise<Response> {
    const user = await findUser(request.params.id);
    return { status: 200, body: user };
  }
}

// Decorator: 로깅
class LoggingDecorator implements RequestHandler {
  constructor(private readonly handler: RequestHandler) {}

  async handle(request: Request): Promise<Response> {
    const start = Date.now();
    console.log(`[REQ] ${request.method} ${request.url}`);

    const response = await this.handler.handle(request);

    console.log(`[RES] ${response.status} ${Date.now() - start}ms`);
    return response;
  }
}

// Decorator: 인증
class AuthDecorator implements RequestHandler {
  constructor(private readonly handler: RequestHandler) {}

  async handle(request: Request): Promise<Response> {
    const token = request.headers['authorization'];
    if (!token) {
      return { status: 401, body: 'Unauthorized' };
    }
    return this.handler.handle(request);
  }
}

// 조합: 로깅 → 인증 → 컨트롤러
const handler = new LoggingDecorator(
  new AuthDecorator(
    new UserController(),
  ),
);
```
- 요청 흐름: `LoggingDecorator` → `AuthDecorator` → `UserController`
- 각 Decorator는 독립적으로 추가/제거 가능
- NestJS의 `Interceptor`, `Guard`, `Pipe`가 내부적으로 이와 유사한 체이닝 구조

## 참고: TypeScript의 @ Decorator와의 관계
```typescript
// TypeScript의 @ 데코레이터 (Stage 3 문법)
@Controller('users')
class UserController {
  @Get(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(LoggingInterceptor)
  findOne(@Param('id') id: string) { ... }
}
```
- TypeScript `@Decorator`는 **메타프로그래밍 문법**으로, GoF Decorator 패턴과는 다른 개념
- 하지만 NestJS는 이 문법을 활용하여 내부적으로 Decorator 패턴(체이닝)을 구현
- `@UseGuards()`, `@UseInterceptors()`가 요청 처리 체인에 기능을 감싸는 구조

## 장단점

| 장점 | 단점 |
|---|---|
| OCP 준수 — 기존 코드 수정 없이 기능 확장 | 작은 객체가 많아져 코드 복잡도 증가 |
| 런타임에 유연한 기능 조합 | 디버깅 시 wrapping 체인 추적이 어려움 |
| 단일 책임 원칙 — 각 Decorator가 하나의 책임 | Decorator 적용 순서에 따라 동작이 달라질 수 있음 |

## 유사 패턴 비교

| | Decorator | Proxy | Strategy |
|---|---|---|---|
| 목적 | 기능 추가 (중첩 가능) | 접근 제어 | 알고리즘 교체 |
| 구조 | 같은 인터페이스를 감싸서 체이닝 | 같은 인터페이스를 감싸지만 단일 | 인터페이스를 주입받아 위임 |
| 특징 | 여러 겹으로 감쌀 수 있음 | 보통 한 겹만 감쌈 | 감싸지 않고 교체 |
| 예시 | 로깅 + 인증 + 캐싱 체이닝 | 지연 로딩, 권한 체크 | 정렬 알고리즘 교체 |

## 언제 사용하면 좋은가?
- 기존 객체의 코드를 수정하지 않고 **부가 기능을 동적으로 추가**해야 할 때
- 기능 조합이 다양해서 **상속으로 감당할 수 없을 때**
- 기능 추가/제거를 **런타임에 유연하게** 하고 싶을 때
- 횡단 관심사(로깅, 인증, 캐싱 등)를 **체이닝 방식으로 분리**하고 싶을 때
