# 4. Step 의 두 가지 처리 모델

Step 은 Job 을 구성하는 실질적인 처리 단위다. Spring Batch 는 Step 의 처리 방식을 두 가지 모델로 제공한다: **Chunk-oriented Processing** 과 **Tasklet**.

---

## 한눈에 비교

| 항목 | Chunk-oriented | Tasklet |
|------|---------------|---------|
| 처리 구조 | Reader → Processor → Writer | 단일 execute() 메서드 |
| 적합한 작업 | 대량 데이터 반복 처리 | 단순/일회성 작업 |
| 트랜잭션 단위 | Chunk (N건) 단위 | execute() 호출 단위 |
| 재시작 지원 | Chunk 단위로 세밀한 재시작 | 전체 재실행 |
| 예시 | CSV → DB 적재, DB → DB 마이그레이션 | 파일 삭제, API 호출, DDL 실행 |

---

## Chunk-oriented Processing

### 개념

대량 데이터를 **일정 크기(Chunk Size)로 나누어** 반복 처리하는 모델이다. 한 번의 반복(iteration)에서 Chunk Size 만큼 읽고, 가공하고, 한꺼번에 쓴다.

```
┌─────────────────── 1 Chunk (size=3) ───────────────────┐
│                                                         │
│  Read ─► Item 1 ─┐                                      │
│  Read ─► Item 2 ─┼─► Process ─► Processed Items ─► Write│
│  Read ─► Item 3 ─┘                                      │
│                                                         │
│                         ◄── 1 Transaction ──►           │
└─────────────────────────────────────────────────────────┘
                              │
                           Commit
                              │
┌─────────────────── 1 Chunk (size=3) ───────────────────┐
│                                                         │
│  Read ─► Item 4 ─┐                                      │
│  Read ─► Item 5 ─┼─► Process ─► Processed Items ─► Write│
│  Read ─► Item 6 ─┘                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                              │
                           Commit
                              │
                            ...
```

### 처리 흐름 상세

```java
// ChunkOrientedTasklet 의 내부 동작 (의사 코드)
do {
    List<I> items = new ArrayList<>();

    // 1. Read Phase: chunkSize 만큼 읽기
    for (int i = 0; i < chunkSize; i++) {
        I item = reader.read();    // null 이면 데이터 끝
        if (item == null) break;
        items.add(item);
    }

    // 2. Process Phase: 각 아이템 가공
    List<O> processedItems = new ArrayList<>();
    for (I item : items) {
        O processed = processor.process(item);  // null 반환 시 필터링
        if (processed != null) {
            processedItems.add(processed);
        }
    }

    // 3. Write Phase: 가공된 아이템 일괄 쓰기
    writer.write(processedItems);

    // 4. Commit
} while (items.size() == chunkSize);  // 읽은 수 < chunkSize 이면 종료
```

### 각 단계의 특성

| 단계 | 호출 방식 | 반환값 의미 |
|------|----------|-----------|
| **Read** | 1건씩 반복 호출 | `null` 반환 시 데이터 끝 |
| **Process** | 1건씩 반복 호출 | `null` 반환 시 해당 아이템 필터링 (Write 대상에서 제외) |
| **Write** | Chunk 단위로 1회 호출 | 벌크 처리 (List 로 전달) |

> Read 와 Process 는 **건 단위**, Write 는 **Chunk 단위**로 동작한다는 점이 핵심이다. Write 에서 벌크 INSERT/UPDATE 를 수행할 수 있어 성능상 유리하다.

### 설정 예시

```java
@Bean
public Step chunkStep() {
    return stepBuilderFactory.get("chunkStep")
        .<Order, Settlement>chunk(100)  // Chunk Size = 100
        .reader(orderReader())
        .processor(settlementProcessor())
        .writer(settlementWriter())
        .build();
}
```

### Processor 생략

Processor 는 선택 사항이다. 데이터를 변환 없이 그대로 쓰는 경우 생략할 수 있다.

```java
@Bean
public Step copyStep() {
    return stepBuilderFactory.get("copyStep")
        .<User, User>chunk(500)
        .reader(sourceReader())
        // .processor() 생략
        .writer(targetWriter())
        .build();
}
```

---

## Tasklet 기반 처리

### 개념

하나의 `execute()` 메서드에 처리 로직을 구현하는 **단순한 모델**이다. Reader/Processor/Writer 패턴이 필요 없는 단일 작업에 적합하다.

```java
public interface Tasklet {
    RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext)
        throws Exception;
}
```

### RepeatStatus 를 통한 반복 제어

| 반환값 | 동작 |
|--------|------|
| `RepeatStatus.FINISHED` | Tasklet 실행 종료. Step 완료 처리 |
| `RepeatStatus.CONTINUABLE` | Tasklet 을 다시 실행. 반복 작업에 사용 |

```
execute() → CONTINUABLE → execute() → CONTINUABLE → execute() → FINISHED → Step 완료
```

### 사용 예시

```java
// 단순 작업: 임시 파일 삭제
@Bean
public Step cleanupStep() {
    return stepBuilderFactory.get("cleanupStep")
        .tasklet((contribution, chunkContext) -> {
            File dir = new File("/tmp/batch-output");
            FileUtils.cleanDirectory(dir);
            return RepeatStatus.FINISHED;
        })
        .build();
}
```

```java
// 반복 작업: 큐에서 메시지를 하나씩 소비
@Bean
public Tasklet queueConsumerTasklet() {
    return (contribution, chunkContext) -> {
        Message message = queue.poll();
        if (message == null) {
            return RepeatStatus.FINISHED;  // 큐가 비면 종료
        }
        processMessage(message);
        return RepeatStatus.CONTINUABLE;   // 계속 소비
    };
}
```

### Tasklet 의 트랜잭션

Tasklet 은 **execute() 호출 단위**로 트랜잭션이 관리된다.

```
Transaction Begin
  └── tasklet.execute()
       └── RepeatStatus.FINISHED
Transaction Commit

──────────────────

Transaction Begin
  └── tasklet.execute()
       └── RepeatStatus.CONTINUABLE
Transaction Commit

Transaction Begin
  └── tasklet.execute()
       └── RepeatStatus.FINISHED
Transaction Commit
```

> `CONTINUABLE` 을 반환하면 현재 트랜잭션은 커밋되고, 새 트랜잭션에서 다시 execute() 가 호출된다.

---

## Chunk Size 와 트랜잭션 경계

Chunk-oriented Processing 에서 **Chunk Size 는 곧 트랜잭션 커밋 간격**이다. 이 값의 선택이 성능과 안정성에 직접적인 영향을 미친다.

### Chunk Size 에 따른 동작

```
전체 데이터: 10,000건, Chunk Size: 1,000

Chunk 1:  [1 ~ 1,000]     → Read 1,000건 → Process → Write → COMMIT
Chunk 2:  [1,001 ~ 2,000] → Read 1,000건 → Process → Write → COMMIT
...
Chunk 10: [9,001 ~ 10,000]→ Read 1,000건 → Process → Write → COMMIT
```

### Chunk Size 선택 기준

| Chunk Size | 장점 | 단점 |
|-----------|------|------|
| 작은 값 (10~50) | 실패 시 롤백 범위 작음, 메모리 사용 적음 | 커밋 빈도 높아 DB 부하, 전체 처리 시간 증가 |
| 중간 값 (100~500) | 성능과 안정성 균형 | - |
| 큰 값 (1,000~) | 커밋 횟수 줄어 전체 처리 빠름 | 실패 시 롤백 범위 큼, 메모리 사용 많음 |

### 실패 시 동작

```
Chunk Size: 1,000

Chunk 1: [1 ~ 1,000]     → COMMIT ✓  (DB 에 반영됨)
Chunk 2: [1,001 ~ 2,000] → COMMIT ✓  (DB 에 반영됨)
Chunk 3: [2,001 ~ 3,000] → 2,500번째에서 예외 발생
                          → ROLLBACK ✗  (2,001 ~ 3,000 전체 롤백)

StepExecution:
  readCount = 3,000
  writeCount = 2,000
  commitCount = 2
  rollbackCount = 1
  status = FAILED
```

> 재시작 시 ExecutionContext 에 저장된 상태를 기반으로 **Chunk 3 부터** 재개한다. Chunk 1, 2 는 이미 커밋되었으므로 다시 처리하지 않는다.

### Chunk Size 와 페이지 크기

Reader 가 페이징 기반인 경우, **Chunk Size 와 Page Size 를 동일하게** 설정하는 것이 권장된다.

```java
@Bean
public Step step() {
    return stepBuilderFactory.get("step")
        .<User, User>chunk(100)           // Chunk Size = 100
        .reader(userPagingReader())       // Page Size = 100 (권장)
        .writer(userWriter())
        .build();
}

@Bean
public JdbcPagingItemReader<User> userPagingReader() {
    return new JdbcPagingItemReaderBuilder<User>()
        .pageSize(100)                    // Chunk Size 와 동일하게
        .dataSource(dataSource)
        .build();
}
```

불일치 시 발생하는 문제:

| 관계 | 문제 |
|------|------|
| Page Size > Chunk Size | 한 페이지를 읽고 나머지를 버퍼에 보관해야 함 |
| Page Size < Chunk Size | 하나의 Chunk 를 채우기 위해 여러 페이지 조회 필요 |

---

## 내부 구현: 모든 것은 Tasklet 이다

3장에서 언급했듯이, Chunk-oriented Step 도 내부적으로는 **Tasklet** 으로 구현되어 있다.

```
StepBuilderFactory
  │
  ├── .tasklet(myTasklet)
  │     └── TaskletStep (직접 Tasklet 실행)
  │
  └── .<I, O>chunk(size)
        └── TaskletStep
              └── ChunkOrientedTasklet (내부 생성)
                    ├── ChunkProvider (= ItemReader 래핑)
                    └── ChunkProcessor (= ItemProcessor + ItemWriter 래핑)
```

```java
// ChunkOrientedTasklet 의 핵심 구조 (단순화)
public class ChunkOrientedTasklet<I> implements Tasklet {
    private final ChunkProvider<I> chunkProvider;
    private final ChunkProcessor<I> chunkProcessor;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
        Chunk<I> inputs = chunkProvider.provide(contribution);  // Read
        if (inputs.isEmpty()) {
            return RepeatStatus.FINISHED;
        }
        chunkProcessor.process(contribution, inputs);           // Process + Write
        return RepeatStatus.CONTINUABLE;
    }
}
```

> 결국 두 모델은 동일한 **TaskletStep** 위에서 동작한다. Chunk 모델은 반복적인 Read → Process → Write 패턴을 추상화한 것이고, Tasklet 모델은 이 추상화 없이 직접 로직을 작성하는 것이다.

---

## 어떤 모델을 선택할 것인가

```
데이터를 반복적으로 읽고 → 가공하고 → 쓰는 작업인가?
  │
  ├── YES → Chunk-oriented Processing
  │           - 대량 데이터 처리
  │           - Read/Process/Write 관심사 분리
  │           - Chunk 단위 트랜잭션, 재시작
  │
  └── NO  → Tasklet
              - 파일/디렉터리 정리
              - 외부 시스템 API 호출
              - DB 프로시저/DDL 실행
              - 단순 상태 초기화
```

실무에서 하나의 Job 은 보통 두 모델을 **혼합**하여 사용한다.

```
Job: "일일 정산 배치"
  ├── Step 1 (Tasklet): 정산 대상 날짜 검증, 이전 정산 데이터 초기화
  ├── Step 2 (Chunk):   결제 내역 조회 → 수수료 계산 → 정산 테이블 저장
  ├── Step 3 (Chunk):   정산 결과 조회 → CSV 파일 생성
  └── Step 4 (Tasklet): CSV 파일을 S3 에 업로드, 임시 파일 삭제
```

---

## 정리

- **Chunk-oriented**: 대량 데이터를 Chunk 단위로 Read → Process → Write 반복 처리. 트랜잭션과 재시작이 Chunk 단위로 동작.
- **Tasklet**: 단일 execute() 로 처리. RepeatStatus 로 반복 여부 제어. 단순/일회성 작업에 적합.
- **Chunk Size**: 트랜잭션 커밋 간격이자 성능과 안정성의 트레이드오프. Page Size 와 일치시키는 것이 권장.
- 두 모델 모두 내부적으로 **TaskletStep** 위에서 동작하며, Chunk 모델은 `ChunkOrientedTasklet` 으로 구현된 추상화다.

## 다음 장에서는

Chunk 모델의 세 구성 요소인 **ItemReader, ItemProcessor, ItemWriter** 의 인터페이스 설계와 다양한 구현체를 살펴본다.
