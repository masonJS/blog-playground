# NestJS + Mongoose 환경에서 MongoDB Connection Pool Size 미조정으로 인한 서버 과부하 이슈

## 개요

스파이크 트래픽 시점에 MongoClient 커넥션 풀 기본값(100)이 부족하여 서버 전체 과부하 장애가 발생했다.
`maxPoolSize` 조정을 통해 해결한 과정을 정리한다.

## 환경

- **Server**: NestJS + Mongoose
- **Database**: MongoDB Atlas
- **Driver**: mongodb (Mongoose 내부 사용)

## 증상

1. 스파이크 트래픽 시점에 API 응답 지연 및 타임아웃 발생
2. MongoDB 작업 대기큐 증가 → 서버 이벤트 루프 블로킹
3. 서버 전체 과부하로 확대

## 원인 분석

### 1. MongoClient Connection Pool 기본값

MongoDB Node.js Driver(Mongoose 내부)의 `maxPoolSize` 기본값은 **100**이다.
서버(애플리케이션)당 하나의 MongoClient 인스턴스가 생성되며, 각각 독립적인 커넥션 풀을 보유한다.

<img src="03.02-01.png">

### 2. 커넥션 풀 동작 원리

```
[요청 수신]
    │
    ▼
[커넥션 풀에서 유휴 커넥션 획득]
    │
    ├─ 유휴 커넥션 있음 → DB 작업 수행 → 커넥션 반환
    │
    └─ 풀이 가득 참 → waitQueue에 대기
                          │
                          ├─ waitQueueTimeoutMS 내 커넥션 확보 → DB 작업 수행
                          │
                          └─ 타임아웃 초과 → MongoServerSelectionError 발생
```

- 요청이 들어오면 풀에서 유휴 커넥션을 획득하여 DB 작업을 수행하고, 완료 후 커넥션을 반환한다.
- 풀이 가득 차면 `waitQueue`에 대기하게 된다.
- `waitQueueTimeoutMS` (기본값: 0 = 무제한 대기)에 따라 대기하거나 에러를 반환한다.

### 3. 스파이크 트래픽과 커넥션 풀 고갈

동시 요청 수가 `maxPoolSize`를 초과하면 다음과 같은 연쇄 장애가 발생한다:

```
[동시 요청 > maxPoolSize(100)]
    │
    ▼
[waitQueue 급증]
    │
    ▼
[대기 요청 누적 → Node.js 이벤트 루프, 메모리 등 서버 리소스 고갈]
    │
    ▼
[서버 전체 과부하 → 장애]
```

#### 왜 서버 전체 과부하로 이어지는가 — Node.js 내부 구조 관점

위 다이어그램에서 "대기 요청 누적 → 서버 리소스 고갈"로 한 줄로 표현된 부분을 Node.js 내부 동작 기준으로 풀어보면, 다음 4단계로 장애가 확산된다.

**1. 이벤트 루프는 새 요청 수락을 멈추지 않는다**

Node.js HTTP 서버는 이벤트 루프의 **poll phase**에서 새 TCP 연결을 계속 accept한다. 커넥션 풀이 고갈된 상태인지 여부와 무관하게 동작하므로, **입력 속도 > DB 처리 속도** 상태가 해소되지 않고 지속된다. 즉, MongoDB 커넥션 풀이 고갈되어도 Node.js는 이를 인지하지 못하고 요청을 계속 수락한다.

**2. 대기 요청이 힙 메모리를 점유한 채 누적된다**

각 대기 요청은 다음 객체들을 V8 힙 메모리에 유지한다:

- `req`/`res` 객체
- Express/NestJS 미들웨어 컨텍스트
- 클로저(콜백/Promise 체인)
- 요청 바디 버퍼

`waitQueue`에서 커넥션을 기다리는 동안 이 객체들은 참조가 살아있으므로 GC 대상이 아니다. 대기 요청 수에 비례하여 메모리 사용량이 **선형 증가**한다.

**3. GC 압박이 이벤트 루프를 지연시킨다**

힙 메모리 사용량이 증가하면 V8 GC가 더 자주, 더 오래 실행된다. 특히 **Major GC(Mark-Sweep/Mark-Compact)** 는 메인 스레드에서 **stop-the-world**로 동작하며, GC가 메인 스레드를 점유하는 동안 이벤트 루프의 모든 phase가 중단된다. 이로 인해 정상 요청의 응답까지 지연된다.

악순환 구조:

```
GC 지연 → 요청 처리 지연 → 더 많은 요청 누적 → 더 많은 메모리 → 더 긴 GC → ...
```

**4. 파일 디스크립터 고갈**

응답을 보내지 못하므로 HTTP TCP 연결이 열린 상태로 유지된다. 각 TCP 연결은 OS 레벨 **file descriptor**를 점유하며, fd 한도(`ulimit`)에 도달하면 새 연결 자체를 수락할 수 없게 된다.

```
[Node.js Event Loop]

   ┌───────────────────────────────┐
   │           timers              │  ← setTimeout/setInterval 콜백
   ├───────────────────────────────┤
   │      pending callbacks        │  ← 시스템 콜백 (TCP 에러 등)
   ├───────────────────────────────┤
   │        idle, prepare          │
   ├───────────────────────────────┤
   │           poll                │  ← ⚠️ 새 HTTP 요청을 계속 수락
   │                               │     커넥션 풀 상태와 무관하게 동작
   ├───────────────────────────────┤
   │           check               │  ← setImmediate 콜백
   ├───────────────────────────────┤
   │      close callbacks          │
   └───────────────────────────────┘
           ↕ (매 tick 사이)
   [V8 GC 실행 가능 시점] ← ⚠️ 힙 메모리 증가 시 GC 빈도/시간 증가
                              → 이벤트 루프 전체 지연
```

MongoDB Atlas 자체는 수천 개의 커넥션을 지원하지만, MongoClient의 풀 사이즈가 100이면 **서버당 100개로 제한**된다는 점이 핵심이다.

## 해결 방법

### 접근 1: maxPoolSize 조정 (즉각 대응)

NestJS `MongooseModule.forRoot` 설정에서 `maxPoolSize`를 조정했다.

```typescript
MongooseModule.forRoot(`${MONGO_PROTOCOL}://${MONGO_INIT_DB}`, {
  dbName: process.env.MONGO_INIT_DB_DATABASE,
  maxPoolSize: 300,
})
```

#### 관련 커넥션 풀 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `maxPoolSize` | 최대 커넥션 수 | 100 |
| `minPoolSize` | 최소 유지 커넥션 수 | 0 |
| `maxIdleTimeMS` | 유휴 커넥션 정리 시간 | 0 (무제한) |
| `waitQueueTimeoutMS` | 대기큐 타임아웃 | 0 (무제한) |

#### 적정 풀 사이즈 산출 가이드

적정 `maxPoolSize`는 다음 공식을 기준으로 산출한다:

```
적정 maxPoolSize ≤ MongoDB 서버 최대 커넥션 수 / 연결된 서버(MongoClient) 수
```

고려 사항:
- **Atlas 티어별 최대 커넥션 수**: M10=1,500 / M20=3,000 / M30=5,000 등
- **피크 트래픽 동시 요청 수**: 예상 동시 요청 수를 기반으로 여유분 확보
- **DB 쿼리 평균 처리시간**: 처리시간이 길수록 커넥션 점유 시간이 늘어나므로 더 많은 풀 사이즈 필요

### 접근 2: 쓰기 작업 백프레셔 최적화 (근본 해결)

#### 2-1. 문제 상황 재분석

`maxPoolSize`를 300으로 올려 즉각 대응했지만, 스파이크 트래픽 시점의 작업 패턴을 분석한 결과 **커넥션 풀을 점유하는 대부분의 작업이 읽음 처리, 상태 갱신 등 비동기로 처리해도 무방한 쓰기 작업**이었다.

- 스파이크 시점 커넥션 점유 비율: **쓰기 70% 이상** (읽음 처리, 로그 기록, 카운터 증가 등)
- 이 쓰기 작업들은 사용자 응답에 직접 영향을 주지 않으며, **수 초의 지연이 허용**되는 작업이다.
- 개별 쓰기가 각각 커넥션을 점유하므로, 동시 요청 수만큼 커넥션이 소모된다.

즉, `maxPoolSize`를 늘리는 것은 임시 방편이며, **커넥션 사용 패턴 자체를 최적화**하는 것이 근본 해결이다.

#### 2-2. 해결 전략

개별 쓰기 요청을 인메모리 버퍼에 모아두었다가 주기적으로 벌크 쓰기하는 방식으로 변경했다.

**기존 방식: N개 개별 쓰기**

```
요청1 ──→ [커넥션1] ──→ updateOne() ──→ 커넥션 반환
요청2 ──→ [커넥션2] ──→ updateOne() ──→ 커넥션 반환
요청3 ──→ [커넥션3] ──→ updateOne() ──→ 커넥션 반환
 ...
요청N ──→ [커넥션N] ──→ updateOne() ──→ 커넥션 반환

→ 동시 N개 커넥션 점유
```

**개선 방식: 인메모리 버퍼 → 벌크 쓰기**

```
요청1 ──→ [버퍼에 적재] ──→ 즉시 응답
요청2 ──→ [버퍼에 적재] ──→ 즉시 응답
요청3 ──→ [버퍼에 적재] ──→ 즉시 응답
 ...
요청N ──→ [버퍼에 적재] ──→ 즉시 응답

         [스케줄러] ──→ [커넥션1] ──→ bulkWrite(N건) ──→ 커넥션 반환

→ 1개 커넥션으로 N건 처리
```

#### 2-3. 구현

3개의 핵심 서비스로 구성된다.

**WriteBufferService** — 인메모리 버퍼 관리

쓰기 요청을 Map 기반 버퍼에 적재하고 즉시 반환한다. 같은 문서에 대한 중복 쓰기는 마지막 값으로 덮어쓰므로 불필요한 쓰기를 줄인다.

```typescript
import { Injectable } from '@nestjs/common';

interface BufferedWrite {
  collection: string;
  filter: Record<string, any>;
  update: Record<string, any>;
}

@Injectable()
export class WriteBufferService {
  private buffer = new Map<string, BufferedWrite>();

  enqueue(collection: string, filter: Record<string, any>, update: Record<string, any>): void {
    const key = `${collection}:${JSON.stringify(filter)}`;
    this.buffer.set(key, { collection, filter, update });
  }

  drain(): BufferedWrite[] {
    const entries = Array.from(this.buffer.values());
    this.buffer.clear();
    return entries;
  }

  get size(): number {
    return this.buffer.size;
  }
}
```

**PoolMonitorService** — 커넥션 풀 사용률 조회

Mongoose 내부 MongoDB Driver의 topology를 통해 현재 커넥션 풀 사용률을 조회한다.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class PoolMonitorService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getPoolUsageRatio(): number {
    const client = this.connection.getClient();
    const topology = (client as any).topology;

    if (!topology) return 0;

    const serverDescription = topology.s?.description?.servers;
    if (!serverDescription) return 0;

    let totalInUse = 0;
    let totalMax = 0;

    for (const server of serverDescription.values()) {
      const pool = topology.s?.servers?.get(server.address)?.pool;
      if (pool) {
        totalInUse += pool.totalConnectionCount - pool.availableConnectionCount;
        totalMax += pool.options?.maxPoolSize ?? 100;
      }
    }

    return totalMax > 0 ? totalInUse / totalMax : 0;
  }
}
```

**BulkWriteSchedulerService** — 주기적 flush + 적응형 백오프

버퍼에 쌓인 쓰기 작업을 주기적으로 벌크 처리하되, 커넥션 풀 사용률에 따라 flush 주기를 동적으로 조절한다.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { WriteBufferService } from './write-buffer.service';
import { PoolMonitorService } from './pool-monitor.service';

@Injectable()
export class BulkWriteSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BulkWriteSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 1000;

  private readonly MIN_INTERVAL_MS = 500;
  private readonly MAX_INTERVAL_MS = 10000;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly writeBuffer: WriteBufferService,
    private readonly poolMonitor: PoolMonitorService,
  ) {}

  onModuleInit() {
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext() {
    this.timer = setTimeout(async () => {
      await this.flush();
      this.adjustInterval();
      this.scheduleNext();
    }, this.intervalMs);
  }

  private async flush() {
    const entries = this.writeBuffer.drain();
    if (entries.length === 0) return;

    const grouped = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = grouped.get(entry.collection) ?? [];
      list.push(entry);
      grouped.set(entry.collection, list);
    }

    for (const [collectionName, ops] of grouped) {
      const bulkOps = ops.map((op) => ({
        updateOne: { filter: op.filter, update: op.update, upsert: true },
      }));

      try {
        await this.connection.collection(collectionName).bulkWrite(bulkOps, { ordered: false });
      } catch (error) {
        this.logger.error(`bulkWrite failed for ${collectionName}: ${error.message}`);
      }
    }
  }

  private adjustInterval() {
    const usage = this.poolMonitor.getPoolUsageRatio();

    if (usage >= 0.5) {
      // 풀 사용률 50% 이상 → flush 주기 단축 (백오프 감소)
      this.intervalMs = Math.max(this.MIN_INTERVAL_MS, this.intervalMs * 0.7);
    } else if (usage <= 0.3) {
      // 풀 사용률 30% 이하 → flush 주기 연장 (백오프 증가)
      this.intervalMs = Math.min(this.MAX_INTERVAL_MS, this.intervalMs * 1.5);
    }
  }
}
```

#### 2-4. 동적 백오프 알고리즘

커넥션 풀 사용률에 따라 벌크 쓰기 주기를 자동 조절한다.

```
풀 사용률 ≥ 50%  →  intervalMs × 0.7  (더 자주 flush하여 버퍼 크기 제한)
풀 사용률 ≤ 30%  →  intervalMs × 1.5  (여유로우므로 배치 크기 키워 효율 향상)
30% < 사용률 < 50%  →  intervalMs 유지
```

| 임계값 | 동작 | 이유 |
|---|---|---|
| **≥ 50%** | flush 주기 단축 (× 0.7) | 풀 여유분이 줄어들고 있으므로 버퍼를 빨리 비워 쓰기 지연을 방지 |
| **≤ 30%** | flush 주기 연장 (× 1.5) | 풀에 여유가 충분하므로 배치를 크게 모아 벌크 쓰기 효율 향상 |
| **30%~50%** | 유지 | 안정 구간, 현재 주기 유지 |
| **MIN (500ms)** | 하한선 | 버퍼 메모리 사용량 제한, 쓰기 지연 상한 보장 |
| **MAX (10,000ms)** | 상한선 | 최대 지연 허용 범위, 서비스 요구사항에 맞게 조정 |

#### 2-5. 주의사항

- **메모리 버퍼 데이터 유실**: 서버가 비정상 종료되면 버퍼에 남아 있는 쓰기 데이터가 유실된다. `onModuleDestroy`에서 flush를 수행하지만 kill -9 등 강제 종료 시에는 보장되지 않는다. 유실이 허용되지 않는 작업은 이 방식을 적용하면 안 된다.
- **쓰기 지연 허용 범위 판단**: 모든 쓰기에 적용하면 안 된다. 사용자 응답에 직접 영향을 주는 쓰기(결제, 주문 등)는 반드시 즉시 처리해야 한다. **지연이 허용되는 쓰기**에만 선별 적용한다.
- **중복 제거 로직의 한계**: 같은 문서에 대한 여러 업데이트가 들어오면 마지막 값만 남는다. `$inc` 같은 누적 연산은 단순 덮어쓰기로 처리할 수 없으므로, 별도의 병합 로직이 필요하다.
- **벌크 쓰기 실패 처리**: `ordered: false`로 실행하므로 일부 문서만 실패할 수 있다. 실패 건에 대한 재시도 로직이나 알림이 필요하다.

## 정리

| 구분 | 내용 |
|---|---|
| **문제** | 스파이크 트래픽 시 커넥션 풀 고갈로 서버 과부하 |
| **근본 원인** | `maxPoolSize` 기본값(100)이 트래픽 대비 부족 + 개별 쓰기가 커넥션을 과다 점유 |
| **영향** | 커넥션 대기큐 증가 → 서버 리소스 고갈 → 전체 장애 |
| **즉각 대응** | `maxPoolSize`를 300으로 상향 조정 |
| **근본 해결** | 지연 허용 쓰기를 인메모리 버퍼 + 벌크 쓰기 + 적응형 백오프로 최적화 |

### 두 접근의 비교

| | 접근 1: maxPoolSize 조정 | 접근 2: 쓰기 백프레셔 최적화 |
|---|---|---|
| **적용 시점** | 즉시 (설정 변경) | 개발 + 테스트 후 배포 |
| **효과** | 풀 용량 증가로 버퍼링 여유 확보 | 커넥션 사용량 자체를 감소 |
| **한계** | Atlas 티어 커넥션 한도 존재, 근본 해결이 아님 | 메모리 유실 리스크, 모든 쓰기에 적용 불가 |
| **커넥션 사용** | N개 요청 → N개 커넥션 | N개 요청 → 1개 커넥션 (벌크) |
| **적용 대상** | 전체 DB 작업 | 지연 허용 쓰기 작업만 |

### 교훈

- 커넥션 풀 기본값에 의존하지 말고 환경에 맞게 조정이 필요하다.
- MongoDB 서버의 최대 커넥션 수와 연결된 서버 수를 함께 고려해야 한다.
- 커넥션 사용률 모니터링 설정의 중요성을 인지해야 한다.
- **트래픽 패턴을 분석하여 동기 처리가 필요한 작업과 비동기로 지연 가능한 작업을 구분**해야 한다.
- **벌크 처리를 통해 커넥션 사용을 최적화**하면 풀 사이즈를 늘리지 않고도 더 많은 요청을 처리할 수 있다.
- **적응형 백오프를 통한 자동 부하 조절**로 트래픽 변동에 유연하게 대응할 수 있다.

## 참고

- [MongoDB 공식 문서 - Connection Pool Options](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/#connection-pool-options)
- [Mongoose Connection Options](https://mongoosejs.com/docs/connections.html#options)
- [MongoDB Atlas 티어별 Connection Limits](https://www.mongodb.com/docs/atlas/reference/atlas-limits/)
- [MongoDB 공식 문서 - BulkWrite Operations](https://www.mongodb.com/docs/drivers/node/current/usage-examples/bulkWrite/)
