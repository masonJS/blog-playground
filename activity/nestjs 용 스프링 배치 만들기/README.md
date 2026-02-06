# Nest.js 로 Spring Batch 의 기능을 만들어보자.

## 목차

### Part 1. Spring Batch 아키텍처 이해

1. **Spring Batch 개요**
   - 배치 처리란 무엇인가
   - Spring Batch 가 해결하는 문제
   - 전체 아키텍처 다이어그램

2. **핵심 도메인 모델**
   - Job / JobInstance / JobExecution
   - Step / StepExecution
   - ExecutionContext
   - JobParameters

3. **Job 실행 흐름**
   - JobLauncher 의 역할
   - JobRepository 와 메타데이터 관리
   - Job → Step 실행 순서와 흐름 제어 (Sequential, Conditional Flow)

4. **Step 의 두 가지 처리 모델**
   - Chunk-oriented Processing (Reader → Processor → Writer)
   - Tasklet 기반 처리
   - Chunk Size 와 트랜잭션 경계

5. **ItemReader / ItemProcessor / ItemWriter**
   - 각 인터페이스의 책임과 계약
   - 커서 기반 vs 페이징 기반 Reader
   - Processor 체이닝
   - Writer 의 벌크 처리

6. **부가 기능**
   - Skip / Retry 정책
   - Listener (JobExecutionListener, StepExecutionListener, ChunkListener 등)
   - JobParameter 와 Late Binding

---

### Part 2. Nest.js 로 구현하기

7. **프로젝트 설정**
   - Nest.js 프로젝트 구성
   - 모듈 구조 설계 (`@batch/core` 모듈)
   - TypeORM 또는 Prisma 를 활용한 메타데이터 테이블 설계

8. **도메인 모델 구현**
   - `Job`, `JobInstance`, `JobExecution` 엔티티 정의
   - `Step`, `StepExecution` 엔티티 정의
   - `ExecutionContext` 구현 (JSON 기반 상태 저장)
   - `JobParameters` 구현

9. **JobRepository 구현**
   - 메타데이터 저장소 인터페이스 정의
   - DB 기반 JobRepository 구현
   - JobExecution / StepExecution 상태 관리

10. **JobLauncher 구현**
    - Job 실행 진입점 구현
    - 동기 / 비동기 실행 지원
    - 중복 실행 방지 로직

11. **Step 구현 - Tasklet 모델**
    - Tasklet 인터페이스 정의
    - TaskletStep 실행 로직 구현
    - RepeatStatus 를 통한 반복 제어

12. **Step 구현 - Chunk 모델**
    - `ItemReader<T>` 인터페이스 구현
    - `ItemProcessor<I, O>` 인터페이스 구현
    - `ItemWriter<T>` 인터페이스 구현
    - ChunkOrientedStep: Read → Process → Write 루프 구현
    - Chunk Size 와 트랜잭션 경계 처리

13. **흐름 제어 구현**
    - SimpleJob: 순차 Step 실행
    - FlowJob: 조건부 분기 (on / to / from)
    - Step 의 ExitStatus 를 활용한 분기 로직

14. **Skip / Retry 정책 구현**
    - SkipPolicy 인터페이스와 기본 구현체
    - RetryPolicy 인터페이스와 기본 구현체
    - BackOffPolicy (지수 백오프 등)

15. **Listener 구현**
    - JobExecutionListener
    - StepExecutionListener
    - ChunkListener / ItemReadListener / ItemWriteListener
    - Nest.js 데코레이터 기반 Listener 등록

16. **스케줄링 통합**
    - `@nestjs/schedule` 과의 연동
    - Cron 기반 Job 실행
    - 외부 트리거 (REST API) 를 통한 Job 실행

---

### Part 3. 심화

17. **병렬 처리**
    - Multi-threaded Step (Worker Threads 활용)
    - Partitioning: 데이터 분할 병렬 처리
    - BullMQ 를 활용한 분산 Step 실행

18. **재시작과 멱등성**
    - 실패한 Job 재시작 전략
    - StepExecution 의 상태 복원
    - 멱등한 Writer 설계

19. **모니터링과 운영**
    - Job 실행 이력 조회 API
    - 실행 상태 대시보드 (간단한 Admin UI)
    - 알림 연동 (Slack, Email)

20. **실전 예제: 대용량 데이터 마이그레이션**
    - CSV 파일 → DB 적재 배치
    - DB to DB 마이그레이션 배치
    - 성능 튜닝과 벤치마크
