# 5. ItemReader / ItemProcessor / ItemWriter

Chunk-oriented Step 의 세 구성 요소인 ItemReader, ItemProcessor, ItemWriter 의 인터페이스 설계, 동작 원리, 주요 구현체를 살펴본다.

---

## 세 인터페이스의 전체 구조

```
┌────────────┐     ┌───────────────┐     ┌────────────┐
│ ItemReader  │────►│ ItemProcessor │────►│ ItemWriter  │
│   <T>       │     │   <I, O>      │     │   <T>       │
└────────────┘     └───────────────┘     └────────────┘
  1건씩 반환          1건씩 가공            Chunk 단위
  null → 종료        null → 필터링         List 로 수신
```

```java
public interface ItemReader<T> {
    T read() throws Exception;
}

public interface ItemProcessor<I, O> {
    O process(I item) throws Exception;
}

public interface ItemWriter<T> {
    void write(List<? extends T> items) throws Exception;
}
```

> 세 인터페이스 모두 **단일 메서드**로 구성되어 있다. 단순한 계약(contract)이 Spring Batch 확장성의 핵심이다.

---

## ItemReader

### 책임과 계약

- **데이터 소스에서 항목을 하나씩 읽어 반환**한다.
- `null` 을 반환하면 더 이상 읽을 데이터가 없다는 신호다.
- Chunk Size 만큼 반복 호출된다.

```
reader.read() → Item 1
reader.read() → Item 2
reader.read() → Item 3
reader.read() → null    ← 데이터 끝, Chunk 처리 종료
```

### 커서(Cursor) 기반 vs 페이징(Paging) 기반

ItemReader 구현체는 크게 두 가지 전략으로 나뉜다.

#### 커서 기반 Reader

DB 커넥션을 유지한 채 **ResultSet 을 순방향으로 순회**하며 한 건씩 읽는다.

```
DB Connection (유지)
  │
  └── ResultSet
        ├── next() → Row 1  ← reader.read()
        ├── next() → Row 2  ← reader.read()
        ├── next() → Row 3  ← reader.read()
        ...
        └── next() → false  ← reader.read() → null
```

| 구현체 | 데이터 소스 |
|--------|-----------|
| `JdbcCursorItemReader` | JDBC (SQL) |
| `HibernateCursorItemReader` | Hibernate |
| `StoredProcedureItemReader` | DB 프로시저 |

**장점**
- 구현이 단순하고 직관적
- 추가 정렬/조건 없이 순차 읽기 가능

**단점**
- DB 커넥션을 Step 전체 동안 점유 → 커넥션 풀 고갈 위험
- 대량 데이터 시 커서 타임아웃 가능
- 멀티스레드 환경에서 Thread-safe 하지 않음

#### 페이징 기반 Reader

**페이지 단위(offset + limit)로 쿼리를 실행**하여 데이터를 읽는다. 매 페이지마다 새로운 쿼리를 실행한다.

```
Page 1: SELECT ... LIMIT 100 OFFSET 0    → [Row 1 ~ 100]
Page 2: SELECT ... LIMIT 100 OFFSET 100  → [Row 101 ~ 200]
Page 3: SELECT ... LIMIT 100 OFFSET 200  → [Row 201 ~ 300]
Page 4: SELECT ... LIMIT 100 OFFSET 300  → []  ← 데이터 끝
```

| 구현체 | 데이터 소스 |
|--------|-----------|
| `JdbcPagingItemReader` | JDBC (SQL) |
| `HibernatePagingItemReader` | Hibernate |
| `JpaPagingItemReader` | JPA |
| `RepositoryItemReader` | Spring Data Repository |

**장점**
- 쿼리 실행 시에만 커넥션 사용 → 커넥션 풀 효율적
- 대량 데이터에서도 타임아웃 위험 낮음
- 멀티스레드 환경에서 비교적 안전

**단점**
- 페이지 간 데이터 정합성 이슈 (처리 중 데이터 변경 시)
- 정렬 기준(ORDER BY) 필수 → 없으면 중복/누락 발생
- OFFSET 이 커지면 쿼리 성능 저하

### 비교 정리

```
                    커서 기반                    페이징 기반
커넥션 사용     Step 전체 동안 점유           쿼리 시에만 사용
데이터 정합성   스냅샷 유지 (커서 시점)       페이지 간 변경 가능
Thread-safe    ✗                            △ (구현에 따라)
대량 처리      커서 타임아웃 위험             OFFSET 성능 저하
정렬 필요      불필요                         필수
```

### 기타 ItemReader 구현체

| 구현체 | 데이터 소스 | 설명 |
|--------|-----------|------|
| `FlatFileItemReader` | 파일 (CSV, TSV) | 라인 단위로 읽고 토크나이저로 파싱 |
| `JsonItemReader` | JSON 파일 | JSON 배열의 각 요소를 Item 으로 |
| `StaxEventItemReader` | XML 파일 | StAX 파서로 XML 요소를 Item 으로 |
| `KafkaItemReader` | Kafka | 토픽의 메시지를 Item 으로 |
| `AmqpItemReader` | RabbitMQ 등 | 메시지 큐에서 읽기 |

### ItemStream 인터페이스

대부분의 ItemReader 구현체는 `ItemStream` 인터페이스도 함께 구현한다. 이를 통해 **실행 상태를 ExecutionContext 에 저장/복원**할 수 있다.

```java
public interface ItemStream {
    void open(ExecutionContext executionContext);    // 초기화, 이전 상태 복원
    void update(ExecutionContext executionContext);  // 현재 상태 저장 (Chunk 커밋마다)
    void close();                                   // 리소스 해제
}
```

```
Step 시작
  │
  ├── reader.open(executionContext)
  │     └── 이전 실행에서 저장한 offset 복원 (예: current.offset = 5000)
  │
  ├── Chunk 1: read() × N → process → write → commit
  │     └── reader.update(executionContext)  ← current.offset = 6000 저장
  │
  ├── Chunk 2: read() × N → process → write → commit
  │     └── reader.update(executionContext)  ← current.offset = 7000 저장
  │
  └── reader.close()
        └── DB 커넥션, 파일 핸들 등 해제
```

> Chunk 커밋마다 `update()` 가 호출되므로, 실패 후 재시작 시 마지막 커밋 지점부터 읽기를 재개할 수 있다.

---

## ItemProcessor

### 책임과 계약

- **읽은 항목을 가공하거나 비즈니스 로직을 적용**한다.
- 입력 타입(I)과 출력 타입(O)이 다를 수 있다 (변환).
- `null` 을 반환하면 해당 항목은 **필터링** 되어 Writer 에 전달되지 않는다.

```java
public interface ItemProcessor<I, O> {
    O process(I item) throws Exception;
}
```

### 세 가지 역할

#### 1. 변환 (Transformation)

입력 타입을 출력 타입으로 변환한다.

```java
public class OrderToSettlementProcessor implements ItemProcessor<Order, Settlement> {
    @Override
    public Settlement process(Order order) {
        return Settlement.builder()
            .orderId(order.getId())
            .amount(order.getAmount())
            .fee(order.getAmount() * 0.03)
            .settlementDate(LocalDate.now())
            .build();
    }
}
```

#### 2. 필터링 (Filtering)

조건에 맞지 않는 항목을 null 로 반환하여 제외한다.

```java
public class ValidOrderProcessor implements ItemProcessor<Order, Order> {
    @Override
    public Order process(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return null;  // Writer 에 전달되지 않음, filterCount 증가
        }
        return order;
    }
}
```

#### 3. 검증 (Validation)

비즈니스 규칙을 검증하고, 위반 시 예외를 던진다.

```java
public class OrderValidationProcessor implements ItemProcessor<Order, Order> {
    @Override
    public Order process(Order order) {
        if (order.getAmount() <= 0) {
            throw new ValidationException("주문 금액은 0보다 커야 합니다: " + order.getId());
        }
        return order;
    }
}
```

> 예외를 던지면 Skip/Retry 정책에 따라 처리된다. (6장에서 다룸)

### Processor 체이닝 (CompositeItemProcessor)

여러 Processor 를 순차적으로 연결할 수 있다. 각 Processor 의 출력이 다음 Processor 의 입력이 된다.

```
Item ─► Processor 1 ─► Processor 2 ─► Processor 3 ─► 최종 결과
         (검증)          (필터링)        (변환)
```

```java
@Bean
public CompositeItemProcessor<Order, Settlement> compositeProcessor() {
    CompositeItemProcessor<Order, Settlement> processor = new CompositeItemProcessor<>();
    processor.setDelegates(List.of(
        validationProcessor(),     // Order → Order (검증)
        filterProcessor(),         // Order → Order (필터링)
        transformProcessor()       // Order → Settlement (변환)
    ));
    return processor;
}
```

체이닝 중 어느 단계에서든 `null` 을 반환하면 **이후 Processor 는 호출되지 않고** 해당 항목은 필터링된다.

```
Item ─► Processor 1 ─► null  ✗  (Processor 2, 3 호출 안 됨)
```

---

## ItemWriter

### 책임과 계약

- **가공된 항목을 목적지에 일괄 기록**한다.
- Chunk 단위(List)로 호출된다 → **벌크 처리에 최적화**되어 있다.
- 하나의 Chunk 가 하나의 트랜잭션 범위 안에서 write() 된다.

```java
public interface ItemWriter<T> {
    void write(List<? extends T> items) throws Exception;
}
```

### Reader/Processor 와의 호출 패턴 차이

```
Chunk Size = 3 일 때:

reader.read()    → Item 1       │
reader.read()    → Item 2       │ 3번 호출 (건 단위)
reader.read()    → Item 3       │

processor.process(Item 1) → A   │
processor.process(Item 2) → B   │ 3번 호출 (건 단위)
processor.process(Item 3) → C   │

writer.write([A, B, C])         │ 1번 호출 (Chunk 단위, List 전달)
```

### 벌크 처리의 이점

```java
// ✗ 건 단위 INSERT (비효율적)
for (Settlement s : items) {
    jdbcTemplate.update("INSERT INTO settlement ...", s.getAmount());
}

// ✓ 벌크 INSERT (Writer 의 설계 의도)
jdbcTemplate.batchUpdate(
    "INSERT INTO settlement (order_id, amount, fee) VALUES (?, ?, ?)",
    items.stream().map(s -> new Object[]{s.getOrderId(), s.getAmount(), s.getFee()}).toList()
);
```

### 주요 구현체

#### DB 기반 Writer

| 구현체 | 방식 | 특징 |
|--------|------|------|
| `JdbcBatchItemWriter` | JDBC batchUpdate | 가장 빠름, SQL 직접 작성 |
| `HibernateItemWriter` | Hibernate Session | 엔티티 기반, Session flush |
| `JpaItemWriter` | JPA EntityManager | JPA merge() 사용 |
| `RepositoryItemWriter` | Spring Data Repository | save/saveAll 호출 |

```java
@Bean
public JdbcBatchItemWriter<Settlement> jdbcWriter() {
    return new JdbcBatchItemWriterBuilder<Settlement>()
        .dataSource(dataSource)
        .sql("INSERT INTO settlement (order_id, amount, fee) VALUES (:orderId, :amount, :fee)")
        .beanMapped()
        .build();
}
```

#### 파일 기반 Writer

| 구현체 | 형식 |
|--------|------|
| `FlatFileItemWriter` | CSV, TSV, 고정 길이 |
| `JsonFileItemWriter` | JSON |
| `StaxEventItemWriter` | XML |

```java
@Bean
public FlatFileItemWriter<Settlement> csvWriter() {
    return new FlatFileItemWriterBuilder<Settlement>()
        .name("settlementWriter")
        .resource(new FileSystemResource("/output/settlement.csv"))
        .delimited()
        .delimiter(",")
        .names("orderId", "amount", "fee", "settlementDate")
        .build();
}
```

#### 기타 Writer

| 구현체 | 대상 |
|--------|------|
| `KafkaItemWriter` | Kafka 토픽 |
| `AmqpItemWriter` | RabbitMQ 등 메시지 큐 |

### CompositeItemWriter

하나의 Chunk 를 **여러 Writer 로 동시에 기록**할 수 있다. (예: DB 저장 + 파일 출력)

```java
@Bean
public CompositeItemWriter<Settlement> compositeWriter() {
    CompositeItemWriter<Settlement> writer = new CompositeItemWriter<>();
    writer.setDelegates(List.of(
        jdbcWriter(),   // DB 에 저장
        csvWriter()     // CSV 로 출력
    ));
    return writer;
}
```

```
writer.write([A, B, C])
  ├── jdbcWriter.write([A, B, C])    ← 같은 List 전달
  └── csvWriter.write([A, B, C])     ← 같은 List 전달
```

> CompositeItemProcessor 는 **순차적**(출력 → 다음 입력), CompositeItemWriter 는 **동일 데이터를 여러 곳에 기록**하는 점이 다르다.

### ClassifierCompositeItemWriter

항목의 **타입이나 조건에 따라 다른 Writer 로 분기**할 수 있다.

```java
@Bean
public ClassifierCompositeItemWriter<Settlement> classifierWriter() {
    ClassifierCompositeItemWriter<Settlement> writer = new ClassifierCompositeItemWriter<>();
    writer.setClassifier(settlement -> {
        if (settlement.getAmount() >= 100_000) {
            return highAmountWriter();   // 고액 정산 → 별도 테이블
        }
        return normalWriter();           // 일반 정산
    });
    return writer;
}
```

---

## 타입 흐름 정리

세 인터페이스의 제네릭 타입이 어떻게 연결되는지 정리한다.

```
ItemReader<I>  ──►  ItemProcessor<I, O>  ──►  ItemWriter<O>

예시:
ItemReader<Order>  ──►  ItemProcessor<Order, Settlement>  ──►  ItemWriter<Settlement>
```

```java
@Bean
public Step settlementStep() {
    return stepBuilderFactory.get("settlementStep")
        .<Order, Settlement>chunk(100)    // <I, O> = <읽기 타입, 쓰기 타입>
        .reader(orderReader())            // ItemReader<Order>
        .processor(settlementProcessor()) // ItemProcessor<Order, Settlement>
        .writer(settlementWriter())       // ItemWriter<Settlement>
        .build();
}
```

Processor 를 생략하면 I 와 O 가 동일해야 한다.

```java
.<User, User>chunk(500)
    .reader(userReader())     // ItemReader<User>
    .writer(userWriter())     // ItemWriter<User>
```

---

## 커스텀 구현 시 주의사항

### ItemReader

- `read()` 는 **반드시 null 을 반환하여 종료를 알려야** 한다. 그렇지 않으면 무한 루프.
- 상태(현재 읽기 위치 등)를 가진다면 `ItemStream` 도 구현하여 재시작을 지원한다.
- Thread-safe 하지 않은 Reader 를 멀티스레드에서 사용하면 데이터 중복/누락이 발생한다.

### ItemProcessor

- 무상태(stateless)로 구현하는 것이 권장된다.
- 외부 API 호출 등 부수 효과가 있으면 **Retry/Skip 시 중복 호출**될 수 있음을 고려한다.
- 복잡한 로직은 CompositeItemProcessor 로 분리한다.

### ItemWriter

- 벌크 처리를 활용한다. 건 단위 INSERT 는 Writer 의 설계 의도에 맞지 않는다.
- 트랜잭션 내에서 실행되므로, 외부 시스템(파일, API) 기록 시 **롤백 불가능**함을 고려한다.
- 멱등하게 구현한다. 재시작 시 동일 Chunk 가 다시 호출될 수 있다.

---

## 정리

| 구성 요소 | 호출 방식 | 핵심 계약 | 주요 패턴 |
|----------|----------|----------|----------|
| **ItemReader** | 1건씩 반복 | null → 종료 | 커서 vs 페이징 |
| **ItemProcessor** | 1건씩 반복 | null → 필터링 | 변환, 필터링, 검증, 체이닝 |
| **ItemWriter** | Chunk 단위 | List 로 벌크 처리 | Composite, Classifier |

핵심 포인트:
- Reader 는 **커서 기반**(커넥션 점유, 스냅샷)과 **페이징 기반**(커넥션 효율, 정렬 필수) 두 전략이 있다.
- Processor 는 **변환/필터링/검증** 세 역할을 수행하며, CompositeItemProcessor 로 체이닝 가능하다.
- Writer 는 **List 로 수신**하여 벌크 처리에 최적화되어 있으며, Composite/Classifier 로 다중 출력을 지원한다.
- ItemStream 을 구현하면 **ExecutionContext 를 통한 상태 저장/복원**으로 재시작을 지원할 수 있다.

## 다음 장에서는

배치 처리 중 발생하는 예외를 유연하게 대응하기 위한 **Skip / Retry 정책**과 실행 흐름 곳곳에 개입할 수 있는 **Listener** 를 살펴본다.
