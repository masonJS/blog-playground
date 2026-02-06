# 3. Job 실행 흐름

이 장에서는 배치 Job 이 실행되는 전체 흐름을 따라가며, JobLauncher · JobRepository · Job · Step 이 어떻게 협력하는지 살펴본다.

---

## JobLauncher 의 역할

### 개념

JobLauncher 는 **Job 실행의 진입점**이다. Job 과 JobParameters 를 받아 실행을 시작하고, JobExecution 을 반환한다.

```java
public interface JobLauncher {
    JobExecution run(Job job, JobParameters jobParameters)
        throws JobExecutionAlreadyRunningException,
               JobRestartException,
               JobInstanceAlreadyCompleteException,
               JobParametersInvalidException;
}
```

### 실행 시 수행하는 일

```
JobLauncher.run(job, jobParameters)
 │
 ├── 1. JobParameters 유효성 검증
 ├── 2. JobInstance 조회 또는 생성
 │     └── JobRepository 에서 동일 JobParameters 로 기존 JobInstance 검색
 ├── 3. 실행 가능 여부 판단
 │     ├── 이미 COMPLETED → JobInstanceAlreadyCompleteException
 │     ├── 이미 STARTED (실행 중) → JobExecutionAlreadyRunningException
 │     └── 재시작 불가능한 Job → JobRestartException
 ├── 4. 새 JobExecution 생성 및 저장
 └── 5. Job.execute(jobExecution) 호출
```

### 동기 vs 비동기 실행

Spring Batch 의 기본 구현체인 `SimpleJobLauncher` 는 `TaskExecutor` 설정에 따라 동기/비동기 실행을 지원한다.

```
동기 실행 (SyncTaskExecutor - 기본값)
┌──────────┐    run()     ┌─────┐    execute()    ┌──────┐
│ Scheduler│──────────────►│ Job │───────────────►│ Step │
│          │◄──────────────│     │◄───────────────│      │
└──────────┘  JobExecution └─────┘   완료 후 반환   └──────┘
              (COMPLETED)

비동기 실행 (SimpleAsyncTaskExecutor)
┌──────────┐    run()     ┌─────┐    execute()    ┌──────┐
│ Scheduler│──────────────►│ Job │───────────────►│ Step │
│          │◄──즉시 반환────│     │                │      │
└──────────┘  JobExecution └─────┘                └──────┘
              (STARTING)         ···비동기로 실행 중···
```

| 방식 | 반환 시점 | 반환되는 상태 | 적합한 상황 |
|------|-----------|-------------|------------|
| 동기 | Job 완료 후 | COMPLETED / FAILED | 스케줄러에서 순차 실행 |
| 비동기 | 즉시 | STARTING | HTTP 요청으로 Job 트리거, 긴 배치 작업 |

---

## JobRepository 와 메타데이터 관리

### 개념

JobRepository 는 **배치 메타데이터의 CRUD 를 담당하는 저장소**다. Job 실행의 모든 상태 변화가 이곳을 거친다.

```java
public interface JobRepository {
    // JobInstance 관련
    boolean isJobInstanceExists(String jobName, JobParameters jobParameters);
    JobInstance createJobInstance(String jobName, JobParameters jobParameters);

    // JobExecution 관련
    JobExecution createJobExecution(String jobName, JobParameters jobParameters);
    void update(JobExecution jobExecution);
    JobExecution getLastJobExecution(String jobName, JobParameters jobParameters);

    // StepExecution 관련
    void add(StepExecution stepExecution);
    void update(StepExecution stepExecution);
    StepExecution getLastStepExecution(JobInstance jobInstance, String stepName);

    // ExecutionContext 관련
    void updateExecutionContext(JobExecution jobExecution);
    void updateExecutionContext(StepExecution stepExecution);
}
```

### JobRepository 가 개입하는 시점

Job 실행의 **모든 상태 변화 시점**에 JobRepository 가 호출된다.

```
시점                          │ 저장하는 내용
─────────────────────────────┼──────────────────────────────
Job 실행 시작 전              │ JobInstance 생성, JobExecution 생성 (STARTING)
Job 실행 시작                 │ JobExecution 상태 → STARTED, startTime 기록
Step 실행 시작                │ StepExecution 생성 (STARTED)
Chunk 커밋마다                │ StepExecution 통계 갱신 (readCount, writeCount 등)
Step 실행 완료                │ StepExecution 상태 → COMPLETED/FAILED
Job 실행 완료                 │ JobExecution 상태 → COMPLETED/FAILED, endTime 기록
```

> Chunk 커밋마다 StepExecution 이 갱신되기 때문에, 실패 시 마지막으로 커밋된 Chunk 이후부터 재시작이 가능하다.

### 저장소 구현체

| 구현체 | 저장 위치 | 특징 |
|--------|----------|------|
| `JdbcJobRepositoryFactoryBean` | RDBMS | 운영 환경 기본 선택. 6개 메타데이터 테이블 사용 |
| `MapJobRepositoryFactoryBean` | 메모리 (Map) | 테스트/프로토타이핑 용도. 재시작 시 상태 유실 |

---

## Job 실행의 전체 흐름

### 최초 실행

```
┌─────────────┐
│ JobLauncher  │
└──────┬──────┘
       │ run(job, params)
       ▼
┌─────────────────┐
│  JobRepository   │ ① JobInstance 존재 여부 확인 → 없음
│                  │ ② 새 JobInstance 생성
│                  │ ③ 새 JobExecution 생성 (STARTING)
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│     Job      │ ④ JobExecution 상태 → STARTED
│              │ ⑤ JobExecutionListener.beforeJob() 호출
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 1     │ ⑥ StepExecution 생성 (STARTED)
│              │ ⑦ Chunk 반복: Read → Process → Write → Commit
│              │ ⑧ StepExecution 상태 → COMPLETED
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 2     │ ⑨ StepExecution 생성 (STARTED)
│              │ ⑩ 처리 수행
│              │ ⑪ StepExecution 상태 → COMPLETED
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     Job      │ ⑫ JobExecutionListener.afterJob() 호출
│              │ ⑬ JobExecution 상태 → COMPLETED
└─────────────┘
```

### 실패 후 재시작

```
[첫 번째 실행 - 실패]

Step 1: COMPLETED ✓
Step 2: FAILED ✗ (3번째 Chunk 에서 예외 발생)
  └── StepExecution: readCount=2500, writeCount=2000, commitCount=2
JobExecution #1: FAILED

──────────────────────────────────────

[두 번째 실행 - 재시작]

JobLauncher.run(job, 동일한 params)
  │
  ├── JobRepository: 기존 JobInstance 발견 (FAILED 상태)
  ├── 새 JobExecution #2 생성
  │
  ├── Step 1: 이전에 COMPLETED → 스킵
  │
  └── Step 2: 이전 StepExecution 의 ExecutionContext 복원
        ├── 마지막 커밋 지점(2000건)부터 재개
        ├── 나머지 데이터 처리
        └── StepExecution: COMPLETED ✓

JobExecution #2: COMPLETED ✓
```

> 재시작 시 이미 COMPLETED 된 Step 은 건너뛴다. 이 동작은 Step 의 `allowStartIfComplete` 설정으로 변경할 수 있다.

---

## Job → Step 실행 순서와 흐름 제어

### Sequential Flow (순차 실행)

가장 기본적인 형태로, Step 을 정의된 순서대로 실행한다.

```java
@Bean
public Job sequentialJob() {
    return jobBuilderFactory.get("sequentialJob")
        .start(step1())
        .next(step2())
        .next(step3())
        .build();
}
```

```
Step 1 → Step 2 → Step 3
  ✓        ✓        ✓     → Job COMPLETED

Step 1 → Step 2 → Step 3
  ✓        ✗              → Job FAILED (Step 3 실행하지 않음)
```

### Conditional Flow (조건부 분기)

Step 의 **ExitStatus** 에 따라 다음에 실행할 Step 을 결정한다.

```java
@Bean
public Job conditionalJob() {
    return jobBuilderFactory.get("conditionalJob")
        .start(step1())
            .on("COMPLETED").to(step2())          // 정상 완료 시
            .from(step1())
            .on("FAILED").to(errorHandlingStep())  // 실패 시
            .from(step1())
            .on("*").to(defaultStep())             // 그 외
        .end()
        .build();
}
```

```
                    ┌── COMPLETED ──► Step 2 ──► ...
                    │
Step 1 ─── ExitStatus ─── FAILED ────► ErrorHandlingStep
                    │
                    └── * (기타) ────► DefaultStep
```

### 패턴 매칭 규칙

| 패턴 | 의미 | 예시 |
|------|------|------|
| `COMPLETED` | 정확히 일치 | ExitStatus 가 "COMPLETED" 일 때만 |
| `FAILED` | 정확히 일치 | ExitStatus 가 "FAILED" 일 때만 |
| `*` | 모든 값 (와일드카드) | 위 조건에 매칭되지 않는 모든 경우 |
| `COMPLETED*` | 접두사 매칭 | "COMPLETED", "COMPLETED_WITH_SKIPS" 등 |

### Flow 와 분기 종료

조건부 흐름의 종료 방식은 세 가지가 있다.

```java
// 1. end() - Job 을 COMPLETED 로 종료
.from(step1()).on("SKIPPED").end()

// 2. fail() - Job 을 FAILED 로 종료
.from(step1()).on("ERROR").fail()

// 3. stopAndRestart(step) - Job 을 STOPPED 로 종료하고, 재시작 시 지정된 Step 부터 실행
.from(step1()).on("PAUSE").stopAndRestart(step2())
```

| 메서드 | JobExecution 상태 | 재시작 가능 | 용도 |
|--------|-------------------|-----------|------|
| `end()` | COMPLETED | 불가 | 정상 종료 처리 |
| `fail()` | FAILED | 가능 | 명시적 실패 처리 |
| `stopAndRestart()` | STOPPED | 가능 (지정 Step 부터) | 수동 개입 후 재시작 |

---

## 실행 흐름 내부 코드 레벨 추적

Spring Batch 의 실행 흐름을 코드 레벨에서 좀 더 구체적으로 추적하면 다음과 같다.

```
SimpleJobLauncher.run(job, params)
  │
  ├── jobRepository.getLastJobExecution(jobName, params)
  ├── jobRepository.createJobExecution(jobName, params)
  │
  └── job.execute(jobExecution)                         // AbstractJob
        │
        ├── listener.beforeJob(jobExecution)
        │
        ├── doExecute(jobExecution)                     // SimpleJob
        │     │
        │     └── for (Step step : steps)
        │           │
        │           ├── 이전 StepExecution 이 COMPLETED 이면 스킵
        │           │
        │           └── step.execute(stepExecution)     // AbstractStep
        │                 │
        │                 ├── listener.beforeStep(stepExecution)
        │                 ├── doExecute(stepExecution)  // TaskletStep
        │                 │     │
        │                 │     └── while (not complete)
        │                 │           │
        │                 │           ├── transaction.begin()
        │                 │           ├── tasklet.execute()  // ChunkOrientedTasklet
        │                 │           │     ├── reader.read() × chunkSize
        │                 │           │     ├── processor.process() × items
        │                 │           │     └── writer.write(items)
        │                 │           ├── stepExecution 통계 갱신
        │                 │           └── transaction.commit()
        │                 │
        │                 ├── listener.afterStep(stepExecution)
        │                 └── stepExecution 상태 갱신 → JobRepository 저장
        │
        ├── listener.afterJob(jobExecution)
        └── jobExecution 상태 갱신 → JobRepository 저장
```

> 주목할 점: Chunk 처리는 내부적으로 `ChunkOrientedTasklet` 이라는 Tasklet 으로 구현되어 있다. 즉, **모든 Step 은 결국 Tasklet 기반으로 동작**하며, Chunk 모델은 이를 한 단계 추상화한 것이다.

---

## 정리

| 컴포넌트 | 핵심 책임 |
|---------|----------|
| **JobLauncher** | Job 실행 진입점. 실행 가능 여부 판단, JobExecution 생성 |
| **JobRepository** | 모든 메타데이터의 영속화. 재시작 지원의 핵심 |
| **Job** | Step 들의 실행 순서 관리. 순차/조건부 흐름 제어 |
| **Step** | 실질적인 배치 처리 수행. Chunk 또는 Tasklet 모델로 동작 |

핵심 포인트:
- JobLauncher 는 **중복 실행 방지**와 **재시작 판단**을 담당한다.
- JobRepository 는 **Chunk 커밋마다** 상태를 저장하여 세밀한 재시작을 가능하게 한다.
- Conditional Flow 는 **ExitStatus** 를 기준으로 분기하며, BatchStatus 와 혼동하지 않아야 한다.
- 모든 Step 은 내부적으로 **Tasklet 기반**이며, Chunk 모델은 `ChunkOrientedTasklet` 로 구현된다.

## 다음 장에서는

Step 의 두 가지 처리 모델인 **Chunk-oriented Processing** 과 **Tasklet 기반 처리**를 구체적으로 비교하고, 각각의 동작 원리를 살펴본다.
