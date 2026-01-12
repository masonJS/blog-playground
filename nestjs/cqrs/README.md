## @nestjs/event-emitter에서 @nestjs/cqrs로의 전환 경험기

### 개요

기존에 `@nestjs/event-emitter` 라이브러리를 사용하여 이벤트 기반 아키텍처를 구현하고 있던 프로젝트에서, 멤버십 히스토리 기록 기능을 추가하면서 `@nestjs/cqrs` 라이브러리의 이벤트 시스템을 도입한 경험을 정리합니다.

---

### 1. 기존 구조: @nestjs/event-emitter

#### 구현 방식

```typescript
// EventEmitterService (래퍼 서비스)
@Injectable()
export class EventEmitterService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventEmitterReadinessWatcher: EventEmitterReadinessWatcher,
  ) {}

  raise(event: SystemEvent) {
    this.eventEmitter.emit(event.constructor.name, event);
  }

  async raiseSync(event: SystemEvent) {
    await this.eventEmitterReadinessWatcher.waitUntilReady();
    await this.eventEmitter.emitAsync(event.constructor.name, event);
  }
}

// 이벤트 발행
this.eventEmitterService.raise(new PostCreatedEvent(post, masterId));

// 이벤트 핸들러
@OnEvent(PostCreatedEvent.name, { async: true })
async handlePostCreated(event: PostCreatedEvent) {
  // 처리 로직
}
```

#### 특징

- 단순한 pub/sub 패턴
- `raise()`: Fire-and-forget 방식
- `raiseSync()`: 핸들러 완료까지 대기
- 이벤트 이름으로 문자열 사용 (`event.constructor.name`)

---

### 2. 새로운 구조: @nestjs/cqrs

#### 도입 배경


1. 주 도메인 모델에 대한 명시적인 상태 관리
2. 상태별로 명확한 이벤트 분리
3. 향후 복잡한 워크플로우 확장 가능성

#### 구현 방식

```typescript
// 이벤트 정의
export class MembershipCreatedEvent {
  constructor(
    readonly membershipId: number,
    readonly action: MembershipHistoryAction,
    readonly relationInfo?: Record<string, any>,
  ) {}
}

// 이벤트 핸들러
@EventsHandler(MembershipCreatedEvent)
export class MembershipCreatedHandler
  implements IEventHandler<MembershipCreatedEvent>
{
  constructor(
    private readonly membershipHistoryRepository: MembershipHistoryRepository,
    private readonly logger: Logger,
  ) {}

  async handle(event: MembershipCreatedEvent): Promise<void> {
    const membershipHistory = this.createMembershipHistory(event);
    await this.membershipHistoryRepository.create(membershipHistory);
  }
}

// 이벤트 발행
this.eventBus.publish(
  new MembershipCreatedEvent(
    myProduct._id,
    MEMBERSHIP_HISTORY_ACTION.USER_PAYMENT,
  ),
);
```

#### 모듈 구성

```typescript
@Global()
@Module({
  imports: [CqrsModule],
  providers: [MembershipHistoryRepository, ...EventHandlers],
  exports: [CqrsModule],
})
export class MembershipHistoryModule {}
```


### 3. 두 라이브러리 비교

| 구분                   | @nestjs/event-emitter | @nestjs/cqrs            |
| ---------------------- | --------------------- | ----------------------- |
| **이벤트 식별**        | 문자열 (event name)   | 클래스 타입             |
| **핸들러 등록**        | `@OnEvent(name)`      | `@EventsHandler(Class)` |
| **타입 안정성**        | 낮음                  | 높음                    |
| **발행 방식**          | `eventEmitter.emit()` | `eventBus.publish()`    |
| **Saga 지원**          | ❌                    | ✅                      |
| **Command/Query 분리** | ❌                    | ✅                      |
| **복잡도**             | 낮음                  | 중간                    |

#### 선택 기준

- **@nestjs/event-emitter**: 단순한 이벤트 발행/구독이 필요한 경우
- **@nestjs/cqrs**: CQRS 패턴, Saga 패턴, 복잡한 이벤트 워크플로우가 필요한 경우

---

### 4. Saga 패턴

`@nestjs/cqrs`의 강력한 기능 중 하나인 Saga 패턴은 RxJS를 활용하여 복잡한 이벤트 스트림을 처리할 수 있습니다.

#### 기본 구조

```typescript
@Injectable()
export class MembershipSaga {
  @Saga()
  membershipCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(MembershipCreatedEvent),
      map((event) => new SendWelcomeNotificationCommand(event.membershipId)),
    );
  };
}
```

#### Saga vs 여러 EventHandler

**단순 케이스**: 둘 다 동일한 결과

```typescript
// event-emitter 방식
@OnEvent('MembershipCreated')
handleA(event) { /* 작업 A */ }

@OnEvent('MembershipCreated')
handleB(event) { /* 작업 B */ }

// cqrs Saga 방식
@Saga()
saga = (events$) => events$.pipe(
  ofType(MembershipCreatedEvent),
  map((event) => new SomeCommand(...)),
);
```

**Saga가 필요한 경우**: 복잡한 이벤트 스트림 처리

```typescript
// 여러 이벤트 조합
@Saga()
combined = (events$) => combineLatest([
  events$.pipe(ofType(PaymentCompletedEvent)),
  events$.pipe(ofType(InventoryReservedEvent)),
]).pipe(
  map(([payment, inventory]) => new ShipOrderCommand(...)),
);

// 시간 기반 처리
@Saga()
delayed = (events$) => events$.pipe(
  ofType(MembershipGracePeriodEvent),
  delay(5000),
  map((event) => new SendReminderCommand(...)),
);

// 조건부 필터링
@Saga()
filtered = (events$) => events$.pipe(
  ofType(MembershipCreatedEvent),
  filter((event) => event.action === 'USER_REGULAR_PAYMENT'),
  map((event) => new SendReceiptCommand(...)),
);
```

---

### 5. 구현 시 고려사항

#### 5.1 트랜잭션과 이벤트 발행 시점

```typescript
// 트랜잭션 완료 후 이벤트 발행
const createdMembership = await this.transactionService.transaction(
  async (session) => {
    // 트랜잭션 내 작업들
  },
);

// 트랜잭션 완료 후 이벤트 발행 (원자성이 필요 없는 부수 효과)
this.eventBus.publish(new MembershipCreatedEvent(createdMembership.id, action));
```

#### 5.2 핸들러 실행 순서

- **EventHandler + Saga (같은 이벤트)**: 병렬 실행 (순서 보장 ❌)
- **순차 실행이 필요한 경우**: EventHandler에서 새 이벤트 발행

```typescript
@EventsHandler(MembershipCreatedEvent)
export class MembershipCreatedHandler {
  async handle(event: MembershipCreatedEvent) {
    await this.repository.create(...);
    // 저장 완료 후 새 이벤트 발행
    this.eventBus.publish(new MembershipHistorySavedEvent(...));
  }
}
```

#### 5.3 에러 처리

```typescript
async handle(event: MembershipCreatedEvent): Promise<void> {
  try {
    const membershipHistory = this.createMembershipHistory(event);
    await this.membershipHistoryRepository.create(membershipHistory);
  } catch (error) {
    this.logger.error(
      `MembershipCreatedHandler error: ${error.message}, event: ${JSON.stringify(event)}`,
      error,
    );
    // 이벤트 핸들러 에러는 발행자에게 전파되지 않음
  }
}
```

### 6. 인사이트 및 결론

#### 얻은 인사이트

1. **적절한 도구 선택**: 단순한 이벤트 처리는 `@nestjs/event-emitter`로 충분. 복잡한 워크플로우가 예상될 때 `@nestjs/cqrs` 도입 고려.

2. **타입 안정성**: `@nestjs/cqrs`는 클래스 기반 이벤트로 타입 안정성이 높음. 이벤트 이름 오타로 인한 버그 방지.

3. **Saga의 진가**: 단순 이벤트 → 작업 변환이 아닌, RxJS를 활용한 복잡한 이벤트 스트림 처리에서 빛남.

4. **전역 모듈 패턴**: `@Global()` 데코레이터로 이벤트 시스템을 전역으로 제공하면 사용 편의성 향상.

5. **관심사 분리**: 이벤트/핸들러를 상태별로 분리하여 코드 가독성과 유지보수성 향상.

#### 권장 사용 케이스

| 상황                         | 권장                    |
| ---------------------------- | ----------------------- |
| 단순 이벤트 pub/sub          | @nestjs/event-emitter   |
| CQRS 아키텍처 도입           | @nestjs/cqrs            |
| 복잡한 이벤트 워크플로우     | @nestjs/cqrs + Saga     |
| 여러 이벤트 조합/필터링/지연 | @nestjs/cqrs + Saga     |
| 기존 시스템에 점진적 도입    | 두 라이브러리 공존 가능 |

#### 마무리

`@nestjs/cqrs`는 단순히 `@nestjs/event-emitter`의 대체재가 아니라, CQRS 패턴과 Saga 패턴을 통해 더 복잡한 도메인 로직을 처리할 수 있는 도구입니다. 프로젝트의 복잡도와 요구사항에 맞게 적절한 도구를 선택하는 것이 중요합니다.

---

## 참고 자료

- [NestJS CQRS Documentation](https://docs.nestjs.com/recipes/cqrs)
- [NestJS Event Emitter Documentation](https://docs.nestjs.com/techniques/events)
- [@nestjs/cqrs GitHub](https://github.com/nestjs/cqrs)
