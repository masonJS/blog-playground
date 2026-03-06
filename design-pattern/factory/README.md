# Factory Pattern

## Factory 패턴이란?

- 객체 생성 로직을 캡슐화하는 **생성(Creational) 디자인 패턴**
- 클라이언트가 구체적인 클래스를 직접 지정하지 않고도 객체를 생성할 수 있게 한다
- 3가지 변형이 존재한다:
  - **Simple Factory**: 하나의 팩토리 클래스가 조건에 따라 객체를 생성 (GoF 패턴 아님)
  - **Factory Method**: 서브클래스가 생성할 객체의 타입을 결정하는 GoF 패턴
  - **Abstract Factory**: 관련된 객체 군(family)을 일관성 있게 생성하는 GoF 패턴

> 핵심 원칙: `new` 키워드를 직접 사용하는 대신 **생성 책임을 별도 객체에 위임**한다.

## 왜 필요한가?

### `new`를 직접 사용할 때의 문제

```typescript
class NotificationController {
  async send(channel: string, message: string) {
    let sender;

    if (channel === 'email') {
      sender = new EmailSender(/* SMTP 설정 */);
    } else if (channel === 'sms') {
      sender = new SmsSender(/* Twilio 설정 */);
    } else if (channel === 'push') {
      sender = new PushSender(/* FCM 설정 */);
    }

    await sender.send(message);
  }
}
```

```typescript
// 다른 곳에서도 동일한 분기가 반복된다
class NotificationLogger {
  async log(channel: string) {
    if (channel === 'email') {
      // ...
    } else if (channel === 'sms') {
      // ...
    } else if (channel === 'push') {
      // ...
    }
  }
}
```

- **OCP(개방-폐쇄 원칙) 위반**: 새로운 채널(Slack 등)이 추가되면 if/else가 있는 모든 곳을 수정해야 한다
- **생성 로직 중복**: 동일한 조건 분기가 여러 클래스에 산재한다
- **변경 영향 범위 확대**: 생성자 시그니처가 바뀌면 모든 사용처를 수정해야 한다

### Factory로 해결

```typescript
class NotificationController {
  constructor(private readonly factory: NotificationFactory) {}

  async send(channel: string, message: string) {
    const sender = this.factory.create(channel);
    await sender.send(message);
  }
}
```

- 생성 로직이 팩토리 한 곳에 격리된다
- 새로운 채널 추가 시 팩토리만 수정하면 된다 (또는 서브클래스 추가)

## 1. Simple Factory

> **주의**: Simple Factory는 GoF 디자인 패턴이 아닌 프로그래밍 관용구(Idiom)이다.
> 하지만 가장 흔하게 사용되며, Factory Method / Abstract Factory를 이해하기 위한 출발점이다.

### 구조

```
┌──────────────┐         ┌───────────────────┐
│    Client     │────────▶│   SimpleFactory    │
└──────────────┘         │ + create(type)     │
                          └────────┬──────────┘
                                   │ creates
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │ ProductA   │ │ ProductB   │ │ ProductC   │
             └───────────┘ └───────────┘ └───────────┘
```

| 역할 | 설명 |
|---|---|
| Client | 팩토리를 통해 객체를 요청하는 사용자 |
| SimpleFactory | 조건에 따라 적절한 구체 클래스를 생성하여 반환 |
| Product (인터페이스) | 생성될 객체의 공통 인터페이스 |
| ConcreteProduct | Product를 구현하는 실제 클래스 |

### 코드 예제: 알림 발송 시스템

```typescript
// Product 인터페이스
interface NotificationSender {
  send(message: string): Promise<void>;
}

// ConcreteProduct
class EmailSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[Email] ${message}`);
  }
}

class SmsSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[SMS] ${message}`);
  }
}

class PushSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[Push] ${message}`);
  }
}

// Simple Factory
class NotificationFactory {
  static create(channel: string): NotificationSender {
    switch (channel) {
      case 'email':
        return new EmailSender();
      case 'sms':
        return new SmsSender();
      case 'push':
        return new PushSender();
      default:
        throw new Error(`지원하지 않는 채널: ${channel}`);
    }
  }
}
```

```typescript
// 사용
const sender = NotificationFactory.create('email');
await sender.send('주문이 완료되었습니다.');
```

### Simple Factory의 한계

새로운 채널(Slack)을 추가하려면 `NotificationFactory`의 switch 문을 직접 수정해야 한다.

```typescript
// NotificationFactory 수정 필요 → OCP 위반
switch (channel) {
  case 'email': return new EmailSender();
  case 'sms':   return new SmsSender();
  case 'push':  return new PushSender();
  case 'slack': return new SlackSender(); // ← 기존 코드 수정
}
```

**기존 코드를 수정하지 않고 확장할 수는 없을까?** → Factory Method 패턴

## 2. Factory Method Pattern

- 객체 생성을 서브클래스에 위임하여, **서브클래스가 생성할 객체의 타입을 결정**하는 GoF 패턴
- 팩토리 메서드를 추상 메서드로 선언하고, 각 서브클래스가 이를 구현한다

### 구조

```
┌──────────────────────┐          ┌──────────────────┐
│       Creator         │          │     Product       │ ← 인터페이스
│ + someOperation()     │          │ + operation()     │
│ + createProduct() ◁───┼──────────┤                   │
└──────────┬───────────┘          └────────┬─────────┘
           │ extends                        │ implements
┌──────────┴───────────┐          ┌────────┴─────────┐
│   ConcreteCreatorA    │          │  ConcreteProductA │
│ + createProduct()     │─creates─▶│                   │
└──────────────────────┘          └──────────────────┘
┌──────────────────────┐          ┌──────────────────┐
│   ConcreteCreatorB    │          │  ConcreteProductB │
│ + createProduct()     │─creates─▶│                   │
└──────────────────────┘          └──────────────────┘
```

| 역할 | 설명 |
|---|---|
| Creator | 팩토리 메서드(`createProduct`)를 선언하는 추상 클래스 |
| ConcreteCreator | 팩토리 메서드를 구현하여 구체적인 Product를 생성 |
| Product | 생성될 객체의 공통 인터페이스 |
| ConcreteProduct | Product를 구현하는 실제 클래스 |

### 코드 예제: 알림 서비스

```typescript
// Product 인터페이스
interface NotificationSender {
  send(message: string): Promise<void>;
}

// ConcreteProduct
class EmailSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[Email] ${message}`);
  }
}

class SmsSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[SMS] ${message}`);
  }
}

class PushSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[Push] ${message}`);
  }
}

// Creator (추상 클래스)
abstract class NotificationService {
  // Factory Method — 서브클래스가 구현
  protected abstract createSender(): NotificationSender;

  // 템플릿 메서드: 공통 로직 + 팩토리 메서드 호출
  async notify(message: string): Promise<void> {
    const sender = this.createSender();
    console.log('알림 발송 시작...');
    await sender.send(message);
    console.log('알림 발송 완료.');
  }
}

// ConcreteCreator
class EmailNotificationService extends NotificationService {
  protected createSender(): NotificationSender {
    return new EmailSender();
  }
}

class SmsNotificationService extends NotificationService {
  protected createSender(): NotificationSender {
    return new SmsSender();
  }
}

class PushNotificationService extends NotificationService {
  protected createSender(): NotificationSender {
    return new PushSender();
  }
}
```

```typescript
// 사용
const service: NotificationService = new EmailNotificationService();
await service.notify('주문이 완료되었습니다.');
// 알림 발송 시작...
// [Email] 주문이 완료되었습니다.
// 알림 발송 완료.
```

### Simple Factory와의 차이: 새 채널 추가 시 비교

Slack 채널을 추가한다고 가정하자.

**Simple Factory**: 기존 팩토리 클래스의 switch 문을 수정해야 한다.

```typescript
// NotificationFactory.ts — 기존 코드 수정 필요
case 'slack': return new SlackSender();
```

**Factory Method**: 새로운 서브클래스를 추가하면 된다. 기존 코드 수정 없음.

```typescript
// 새 파일 추가만으로 확장 가능
class SlackSender implements NotificationSender {
  async send(message: string): Promise<void> {
    console.log(`[Slack] ${message}`);
  }
}

class SlackNotificationService extends NotificationService {
  protected createSender(): NotificationSender {
    return new SlackSender();
  }
}
```

| | Simple Factory | Factory Method |
|---|---|---|
| 새 채널 추가 | 팩토리 클래스의 switch 수정 | 새 서브클래스 추가 |
| OCP 준수 | X | O |
| 기존 코드 변경 | 필요 | 불필요 |

### Factory Method의 한계

알림 시스템이 발전하면서 채널별로 **sender뿐만 아니라 template, tracker**도 필요해졌다고 하자.

```typescript
// 카카오 생태계: KakaoSender + KakaoTemplate + KakaoTracker
// AWS 생태계:   SesSender   + SesTemplate   + SnsTracker
```

Factory Method로는 각각의 팩토리 메서드를 따로 만들어야 하고, 카카오 sender + AWS template 같은 **잘못된 조합이 발생할 위험**이 있다.

**관련 객체 군을 일관성 있게 묶어서 생성할 수는 없을까?** → Abstract Factory 패턴

## 3. Abstract Factory Pattern

- **관련된 객체 군(family)을 일관성 있게 생성**하는 GoF 패턴
- 구체적인 클래스를 지정하지 않고, 관련 객체들의 생성 인터페이스를 제공한다

### 구조

```
┌────────────────────────────┐
│      AbstractFactory        │ ← 인터페이스
│ + createSender()            │
│ + createTemplate()          │
│ + createTracker()           │
└──────────┬─────────────────┘
           │ implements
     ┌─────┴──────────────────────────┐
     ▼                                ▼
┌────────────────────┐    ┌────────────────────┐
│ KakaoFactory        │    │ AwsFactory          │
│ + createSender()    │    │ + createSender()    │
│ + createTemplate()  │    │ + createTemplate()  │
│ + createTracker()   │    │ + createTracker()   │
└────────┬───────────┘    └────────┬───────────┘
         │ creates                  │ creates
         ▼                          ▼
  Kakao 제품 군               AWS 제품 군
  ┌─────────────┐           ┌─────────────┐
  │ KakaoSender │           │ SesSender   │
  │ KakaoTempl  │           │ SesTemplate │
  │ KakaoTracker│           │ SnsTracker  │
  └─────────────┘           └─────────────┘
```

| 역할 | 설명 |
|---|---|
| AbstractFactory | 관련 객체 군을 생성하는 메서드를 선언하는 인터페이스 |
| ConcreteFactory | 특정 생태계(Kakao, AWS 등)에 맞는 객체 군을 생성 |
| AbstractProduct | 각 제품의 공통 인터페이스 (Sender, Template, Tracker) |
| ConcreteProduct | 특정 생태계에 속하는 실제 제품 |

### 코드 예제: 카카오 vs AWS 알림 생태계

```typescript
// AbstractProduct 인터페이스들
interface MessageSender {
  send(message: string): Promise<void>;
}

interface TemplateFetcher {
  fetch(templateId: string): Promise<string>;
}

interface DeliveryTracker {
  track(messageId: string): Promise<string>;
}
```

```typescript
// Kakao 제품 군
class KakaoSender implements MessageSender {
  async send(message: string): Promise<void> {
    console.log(`[카카오톡] ${message}`);
  }
}

class KakaoTemplateFetcher implements TemplateFetcher {
  async fetch(templateId: string): Promise<string> {
    return `카카오 템플릿(${templateId})`;
  }
}

class KakaoDeliveryTracker implements DeliveryTracker {
  async track(messageId: string): Promise<string> {
    return `카카오 발송 상태: 성공 (${messageId})`;
  }
}
```

```typescript
// AWS 제품 군
class SesSender implements MessageSender {
  async send(message: string): Promise<void> {
    console.log(`[AWS SES] ${message}`);
  }
}

class SesTemplateFetcher implements TemplateFetcher {
  async fetch(templateId: string): Promise<string> {
    return `SES 템플릿(${templateId})`;
  }
}

class SnsDeliveryTracker implements DeliveryTracker {
  async track(messageId: string): Promise<string> {
    return `SNS 발송 상태: 성공 (${messageId})`;
  }
}
```

```typescript
// Abstract Factory 인터페이스
interface NotificationFactory {
  createSender(): MessageSender;
  createTemplateFetcher(): TemplateFetcher;
  createDeliveryTracker(): DeliveryTracker;
}

// Concrete Factory: 카카오
class KakaoNotificationFactory implements NotificationFactory {
  createSender(): MessageSender {
    return new KakaoSender();
  }

  createTemplateFetcher(): TemplateFetcher {
    return new KakaoTemplateFetcher();
  }

  createDeliveryTracker(): DeliveryTracker {
    return new KakaoDeliveryTracker();
  }
}

// Concrete Factory: AWS
class AwsNotificationFactory implements NotificationFactory {
  createSender(): MessageSender {
    return new SesSender();
  }

  createTemplateFetcher(): TemplateFetcher {
    return new SesTemplateFetcher();
  }

  createDeliveryTracker(): DeliveryTracker {
    return new SnsDeliveryTracker();
  }
}
```

```typescript
// 사용: 클라이언트는 어떤 생태계인지 몰라도 된다
class NotificationService {
  constructor(private readonly factory: NotificationFactory) {}

  async sendWithTemplate(templateId: string, message: string): Promise<void> {
    const template = await this.factory.createTemplateFetcher().fetch(templateId);
    const sender = this.factory.createSender();
    const tracker = this.factory.createDeliveryTracker();

    await sender.send(`${template}: ${message}`);
    const status = await tracker.track('msg-001');
    console.log(status);
  }
}

// 카카오 생태계로 알림
const kakaoService = new NotificationService(new KakaoNotificationFactory());
await kakaoService.sendWithTemplate('welcome', '가입을 환영합니다!');
// [카카오톡] 카카오 템플릿(welcome): 가입을 환영합니다!
// 카카오 발송 상태: 성공 (msg-001)

// AWS 생태계로 교체 — 팩토리만 바꾸면 된다
const awsService = new NotificationService(new AwsNotificationFactory());
await awsService.sendWithTemplate('welcome', '가입을 환영합니다!');
// [AWS SES] SES 템플릿(welcome): 가입을 환영합니다!
// SNS 발송 상태: 성공 (msg-001)
```

### 핵심 포인트

- **생태계 일관성 보장**: `KakaoNotificationFactory`는 항상 카카오 제품 군만 생성한다. 카카오 sender + AWS template 같은 교차 조합이 구조적으로 불가능하다.
- **생태계 교체 용이**: 팩토리 구현체만 교체하면 전체 제품 군이 한 번에 바뀐다.

## 세 가지 Factory 비교

| | Simple Factory | Factory Method | Abstract Factory |
|---|---|---|---|
| GoF 패턴 여부 | X (관용구) | O | O |
| 생성 대상 | 단일 제품 | 단일 제품 | 제품 군 (family) |
| 확장 방식 | 팩토리 코드 수정 | 서브클래스 추가 | 팩토리 구현체 추가 |
| OCP 준수 | X | O | O |
| 복잡도 | 낮음 | 중간 | 높음 |
| 핵심 메커니즘 | 조건문 (switch/if) | 상속 + 추상 메서드 | 인터페이스 + 조합 |

## 장단점

| 장점 | 단점 |
|---|---|
| SRP — 생성 로직을 한 곳에 격리 | 클래스 수가 증가하여 코드 네비게이션이 복잡해짐 |
| DIP — 구체 클래스가 아닌 인터페이스에 의존 | 단순한 생성에 적용하면 오버엔지니어링 |
| OCP — 새로운 제품 추가 시 기존 코드 수정 최소화 (Factory Method, Abstract Factory) | 제품 인터페이스에 새 메서드 추가 시 모든 팩토리 수정 필요 |
| 테스트 용이 — 팩토리를 Mock으로 대체 가능 | 추상화 레벨이 높아져 코드 흐름 파악이 어려울 수 있음 |

## 흔한 오해

### "Simple Factory = Factory Method" 아니다

Simple Factory는 조건문으로 분기하는 단순한 유틸리티이고, Factory Method는 **상속과 다형성**을 활용하여 서브클래스가 생성 타입을 결정하는 GoF 패턴이다. 구조적으로 완전히 다르다.

### "Factory는 항상 static 메서드" 아니다

Simple Factory에서 `static create()`를 자주 사용하지만, Factory Method는 인스턴스 메서드이고, Abstract Factory는 인터페이스 기반이다. static은 선택 사항이다.

### "Abstract Factory가 항상 더 좋다" 아니다

단일 제품만 생성하는 상황에서 Abstract Factory를 쓰면 불필요한 복잡도만 증가한다. 패턴은 문제에 맞게 선택해야 한다.

### "Factory가 switch를 없앤다" 아니다

Factory Method와 Abstract Factory는 다형성으로 분기를 제거하지만, 어딘가에서는 어떤 팩토리를 사용할지 결정하는 로직이 필요하다. **switch를 없애는 것이 아니라 한 곳에 격리**하는 것이다.

## 언제 사용하면 좋은가?

| 상황 | 권장 패턴 |
|---|---|
| 생성 로직이 한두 곳에서만 사용되고, 제품 종류가 거의 변하지 않음 | Simple Factory |
| 제품 종류가 자주 추가되고, 기존 코드 수정 없이 확장해야 함 | Factory Method |
| 관련된 객체 군을 일관성 있게 묶어서 생성해야 함 | Abstract Factory |
| 생성 로직이 단순하고 변경 가능성이 낮음 | Factory 없이 직접 `new` |

### 의사결정 플로우차트

```
객체 생성 로직을 분리해야 하는가?
├── No → 직접 new 사용
└── Yes → 관련 객체를 묶어서 생성해야 하는가?
    ├── Yes → Abstract Factory
    └── No → 제품 종류가 자주 확장되는가?
        ├── Yes → Factory Method
        └── No → Simple Factory
```

## 실무에서의 Factory 패턴

### NestJS `useFactory` DI Provider

```typescript
// NestJS에서 팩토리 함수로 프로바이더를 동적으로 생성
const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (configService: ConfigService) => {
    const options = configService.get<DatabaseOptions>('database');
    return new DatabaseConnection(options);
  },
  inject: [ConfigService],
};
```

### TypeORM `DataSource.create()`

```typescript
// 환경에 따라 다른 데이터 소스 생성
const dataSource = new DataSource({
  type: process.env.DB_TYPE as 'postgres' | 'mysql',
  host: process.env.DB_HOST,
  // ...
});
```

### PG사 연동: 결제 게이트웨이 팩토리

```typescript
interface PaymentGateway {
  pay(amount: number): Promise<PaymentResult>;
  cancel(transactionId: string): Promise<void>;
}

class PaymentGatewayFactory {
  static create(provider: 'toss' | 'iamport'): PaymentGateway {
    switch (provider) {
      case 'toss':    return new TossPaymentGateway();
      case 'iamport': return new IamportPaymentGateway();
    }
  }
}
```
