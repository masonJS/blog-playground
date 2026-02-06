# 2. 핵심 도메인 모델

Spring Batch 의 도메인 모델은 **배치 작업의 정의**와 **실행 이력**을 명확히 분리하는 것이 핵심이다. 이 장에서는 각 도메인 객체의 역할과 관계를 살펴본다.

---

## Job / JobInstance / JobExecution

이 세 개념의 구분이 Spring Batch 를 이해하는 첫 번째 관문이다.

### Job

- 배치 작업의 **정의** 그 자체다.
- 하나 이상의 Step 으로 구성된다.
- Java 클래스로 비유하면 **클래스(Class)** 에 해당한다.

```
Job: "일일 정산 배치"
  ├── Step 1: 결제 내역 조회
  ├── Step 2: 수수료 계산
  └── Step 3: 정산 결과 저장
```

### JobInstance

- Job + JobParameters 의 조합으로 식별되는 **논리적 실행 단위**다.
- 같은 Job 이라도 파라미터가 다르면 서로 다른 JobInstance 가 된다.
- Java 클래스로 비유하면 **인스턴스(Instance)** 에 해당한다.

```
Job: "일일 정산 배치"
  ├── JobInstance: 2024-01-01 정산  (date=2024-01-01)
  ├── JobInstance: 2024-01-02 정산  (date=2024-01-02)
  └── JobInstance: 2024-01-03 정산  (date=2024-01-03)
```

> 동일한 JobParameters 로 이미 **COMPLETED** 된 JobInstance 가 있으면 재실행할 수 없다. 이를 통해 동일 작업의 중복 실행을 방지한다.

### JobExecution

- JobInstance 의 **실제 실행 기록**이다.
- 하나의 JobInstance 는 여러 개의 JobExecution 을 가질 수 있다. (실패 후 재시작 시)
- 실행 상태(status), 시작/종료 시간, 종료 코드 등을 포함한다.

```
JobInstance: 2024-01-03 정산
  ├── JobExecution #1: FAILED   (01-03 00:00 ~ 00:15, Step 2 에서 실패)
  └── JobExecution #2: COMPLETED (01-03 01:00 ~ 01:20, Step 2 부터 재시작)
```

### 세 개념의 관계

```
Job (정의)
 │
 ├── JobInstance (논리적 실행 단위 = Job + JobParameters)
 │     ├── JobExecution #1 (물리적 실행 기록)
 │     └── JobExecution #2 (재시작 시 새로운 기록)
 │
 └── JobInstance (다른 파라미터)
       └── JobExecution #1
```

### JobExecution 의 주요 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `status` | BatchStatus | 실행 상태 (STARTING, STARTED, COMPLETED, FAILED, STOPPED, ABANDONED) |
| `startTime` | Date | 실행 시작 시각 |
| `endTime` | Date | 실행 종료 시각 |
| `exitStatus` | ExitStatus | 종료 코드와 설명 (COMPLETED, FAILED, CUSTOM 등) |
| `createTime` | Date | JobExecution 이 생성된 시각 |
| `lastUpdated` | Date | 마지막 갱신 시각 |
| `executionContext` | ExecutionContext | 실행 중 공유되는 상태 저장소 |
| `failureExceptions` | List\<Throwable\> | 실행 중 발생한 예외 목록 |

### BatchStatus vs ExitStatus

이 둘의 차이를 이해하는 것이 중요하다.

- **BatchStatus**: 프레임워크가 관리하는 **실행 상태** (enum)
  - `COMPLETED`, `FAILED`, `STOPPED` 등 고정된 값
  - JobExecution/StepExecution 의 현재 상태를 나타냄
- **ExitStatus**: 실행 **결과**를 나타내는 값 (커스텀 가능)
  - 기본적으로 BatchStatus 와 동일하지만, 개발자가 임의의 값을 설정할 수 있음
  - Step 의 조건부 분기에서 이 값을 기준으로 다음 Step 을 결정함

```
// ExitStatus 를 커스텀하는 예시
stepExecution.setExitStatus(new ExitStatus("COMPLETED_WITH_SKIPS"));
```

---

## Step / StepExecution

### Step

- Job 을 구성하는 **독립적인 처리 단위**다.
- 하나의 Step 은 실질적인 배치 처리 로직을 담당한다.
- 두 가지 처리 모델을 지원한다:
  - **Chunk-oriented**: ItemReader → ItemProcessor → ItemWriter
  - **Tasklet**: 단일 작업 실행

```
Job
 ├── Step 1 (Chunk): 파일에서 데이터를 읽어 DB에 저장
 ├── Step 2 (Tasklet): 임시 파일 삭제
 └── Step 3 (Chunk): DB 데이터를 집계하여 리포트 생성
```

### StepExecution

- Step 의 **실제 실행 기록**이다.
- JobExecution 과 StepExecution 은 1:N 관계다.
- Step 이 실행될 때마다 새로운 StepExecution 이 생성된다.

### StepExecution 의 주요 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `status` | BatchStatus | 실행 상태 |
| `readCount` | int | 읽은 항목 수 |
| `writeCount` | int | 쓴 항목 수 |
| `commitCount` | int | 커밋된 트랜잭션 수 |
| `rollbackCount` | int | 롤백된 트랜잭션 수 |
| `readSkipCount` | int | 읽기 중 스킵된 항목 수 |
| `processSkipCount` | int | 처리 중 스킵된 항목 수 |
| `writeSkipCount` | int | 쓰기 중 스킵된 항목 수 |
| `filterCount` | int | Processor 에서 null 반환으로 필터링된 항목 수 |
| `exitStatus` | ExitStatus | 종료 상태 |

> `readCount`, `writeCount`, `skipCount` 등의 통계 정보를 통해 배치 처리 결과를 정량적으로 파악할 수 있다. 이 정보는 운영 모니터링에서 핵심적인 역할을 한다.

---

## ExecutionContext

### 개념

- **실행 중 상태를 저장하는 Key-Value 저장소**다.
- 직렬화(JSON) 되어 DB 에 영속화되므로, 실패 후 재시작 시 상태를 복원할 수 있다.
- `Map<String, Object>` 와 유사한 인터페이스를 제공한다.

### 두 가지 범위(Scope)

ExecutionContext 는 **JobExecution** 과 **StepExecution** 각각에 존재하며, 범위가 다르다.

```
JobExecution
 ├── ExecutionContext (Job 범위: 모든 Step 에서 공유)
 │
 ├── StepExecution 1
 │    └── ExecutionContext (Step 1 범위: 이 Step 에서만 접근)
 │
 └── StepExecution 2
      └── ExecutionContext (Step 2 범위: 이 Step 에서만 접근)
```

| 범위 | 접근 범위 | 용도 |
|------|-----------|------|
| Job ExecutionContext | 모든 Step 에서 공유 | Step 간 데이터 전달 |
| Step ExecutionContext | 해당 Step 내부에서만 | 재시작 시 읽기 위치 복원 등 |

### 사용 예시

```java
// Step ExecutionContext 에 현재 처리 위치 저장 (재시작용)
stepExecution.getExecutionContext().putLong("current.offset", 150000);

// Job ExecutionContext 에 Step 간 공유 데이터 저장
jobExecution.getExecutionContext().putString("outputFilePath", "/tmp/result.csv");
```

### 주의사항

- ExecutionContext 에 저장하는 객체는 **직렬화 가능**해야 한다.
- 대용량 데이터를 저장하면 DB 부하가 발생하므로, 최소한의 상태만 저장한다.
- Step ExecutionContext 간에는 직접 접근이 불가능하다. Step 간 데이터 전달은 Job ExecutionContext 를 사용한다.

---

## JobParameters

### 개념

- Job 을 실행할 때 전달하는 **파라미터**다.
- JobInstance 를 식별하는 기준이 된다. (`Job 이름 + JobParameters = JobInstance`)
- 지원하는 타입: `String`, `Long`, `Double`, `Date`

### 식별 파라미터 vs 비식별 파라미터

Spring Batch 4.x 이후로 파라미터에 **identifying** 속성이 추가되었다.

| 구분 | identifying = true (기본값) | identifying = false |
|------|---------------------------|-------------------|
| 역할 | JobInstance 식별에 사용됨 | 식별에 사용되지 않음 |
| 중복 체크 | 동일 값이면 같은 JobInstance | 값이 달라도 영향 없음 |
| 용도 | 날짜, 시퀀스 번호 등 | 런타임 설정 값 |

```java
// identifying 파라미터: JobInstance 식별에 사용
JobParameters params = new JobParametersBuilder()
    .addString("date", "2024-01-03")           // identifying (기본값)
    .addLong("chunkSize", 1000L, false)         // non-identifying
    .toJobParameters();
```

### JobParameters 접근 방법

```java
// ChunkContext 를 통한 접근
String date = chunkContext
    .getStepContext()
    .getStepExecution()
    .getJobParameters()
    .getString("date");

// Late Binding (SpEL) 을 통한 접근
@Value("#{jobParameters['date']}")
private String date;
```

---

## 메타데이터 테이블 (ERD)

Spring Batch 는 위 도메인 모델을 저장하기 위해 **6개의 메타데이터 테이블**을 사용한다.

```
┌──────────────────────┐     ┌──────────────────────────┐
│  BATCH_JOB_INSTANCE  │     │   BATCH_JOB_EXECUTION    │
│──────────────────────│     │──────────────────────────│
│  JOB_INSTANCE_ID (PK)│◄────│  JOB_INSTANCE_ID (FK)    │
│  JOB_NAME            │     │  JOB_EXECUTION_ID (PK)   │
│  JOB_KEY             │     │  STATUS                  │
│                      │     │  START_TIME / END_TIME    │
│                      │     │  EXIT_CODE / EXIT_MESSAGE │
└──────────────────────┘     └──────────┬───────────────┘
                                        │
                             ┌──────────▼───────────────┐
                             │ BATCH_JOB_EXECUTION_PARAMS│
                             │──────────────────────────│
                             │ JOB_EXECUTION_ID (FK)     │
                             │ PARAMETER_NAME            │
                             │ PARAMETER_TYPE            │
                             │ PARAMETER_VALUE           │
                             │ IDENTIFYING               │
                             └──────────────────────────┘

┌───────────────────────────┐     ┌──────────────────────────────┐
│  BATCH_STEP_EXECUTION     │     │ BATCH_STEP_EXECUTION_CONTEXT │
│───────────────────────────│     │──────────────────────────────│
│  STEP_EXECUTION_ID (PK)   │────►│ STEP_EXECUTION_ID (FK)       │
│  JOB_EXECUTION_ID (FK)    │     │ SHORT_CONTEXT                │
│  STEP_NAME                │     │ SERIALIZED_CONTEXT           │
│  STATUS                   │     └──────────────────────────────┘
│  READ_COUNT / WRITE_COUNT │
│  COMMIT_COUNT             │     ┌──────────────────────────────┐
│  SKIP_COUNT               │     │ BATCH_JOB_EXECUTION_CONTEXT  │
└───────────────────────────┘     │──────────────────────────────│
                                  │ JOB_EXECUTION_ID (FK)        │
                                  │ SHORT_CONTEXT                │
                                  │ SERIALIZED_CONTEXT           │
                                  └──────────────────────────────┘
```

| 테이블 | 설명 |
|--------|------|
| `BATCH_JOB_INSTANCE` | JobInstance 정보 (Job 이름 + 식별 키) |
| `BATCH_JOB_EXECUTION` | JobExecution 정보 (상태, 시작/종료 시간) |
| `BATCH_JOB_EXECUTION_PARAMS` | JobParameters 저장 |
| `BATCH_JOB_EXECUTION_CONTEXT` | Job 레벨 ExecutionContext |
| `BATCH_STEP_EXECUTION` | StepExecution 정보 (상태, 통계) |
| `BATCH_STEP_EXECUTION_CONTEXT` | Step 레벨 ExecutionContext |

---

## 정리

```
Job (배치 작업 정의)
 │
 ├── JobInstance (Job + JobParameters 로 식별)
 │     │
 │     └── JobExecution (실제 실행 기록, 1회 이상)
 │           ├── ExecutionContext (Job 범위 상태 저장)
 │           ├── JobParameters (실행 파라미터)
 │           │
 │           ├── StepExecution 1 (Step 실행 기록)
 │           │     └── ExecutionContext (Step 범위 상태 저장)
 │           │
 │           └── StepExecution 2
 │                 └── ExecutionContext
 │
 └── JobInstance (다른 파라미터)
       └── ...
```

핵심 포인트:
- **Job** 은 정의, **JobInstance** 는 논리적 실행, **JobExecution** 은 물리적 실행이다.
- **Step** 은 독립적 처리 단위이며, **StepExecution** 에 실행 통계가 기록된다.
- **ExecutionContext** 는 Job/Step 두 범위로 나뉘며, 재시작 시 상태 복원에 사용된다.
- **JobParameters** 는 JobInstance 를 식별하는 기준이 된다.

## 다음 장에서는

**Job 실행 흐름**을 따라가며, JobLauncher 가 Job 을 실행하고 JobRepository 가 메타데이터를 관리하는 과정을 살펴본다.
