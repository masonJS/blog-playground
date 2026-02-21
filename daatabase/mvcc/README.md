# MVCC

## 정의
- Multi-Version Concurrency Control
- 동시에 여러 트랜잭션이 수행되는 환경에서 각 트랜잭션에게 쿼리 수행 시점의 데이터를 제공하여 읽기 일관성을 보장하고 Read/Write 간의 충돌 및 lock을 방지하여 동시성을 높일 수 있는 기능
- 트랜잭션이 시작된 시점의 Transaction ID와 같거나 작은 Transaction ID를 가지는 데이터를 읽음


## MySQL MVCC
- Undo Segment 방식
  - 업데이트된 최신 데이터는 기존 데이터 블록의 레코드에 반영하고 변경 전 값을 undo 영역이라는 별도의 공간에 저장하여 갱신에 대한 버전관리를 하는 방식
- undo 영역(undo log)과 레코드의 헤더에 존재하는 트랜잭션 ID를 이용하여 구현
- undo 영역에는 트랜잭션 ID, 트랜잭션의 시작 시점, 트랜잭션의 커밋 여부, 트랜잭션의 변경 내용이 저장
- 트랜잭션의 시작 시점과 undo 영역에 저장된 트랜잭션 ID를 비교하여 트랜잭션의 시작 시점보다 작거나 같은 트랜잭션 ID를 가지는 데이터만 읽음

### Read View (Consistent Read View)
- 트랜잭션이 SELECT를 수행할 때 "어떤 버전의 데이터를 보여줄지" 판단하는 기준이 되는 스냅샷
- Read View 구성 요소
  - `m_ids` : Read View 생성 시점에 활성 상태(커밋되지 않은)인 트랜잭션 ID 목록
  - `min_trx_id` : m_ids 중 가장 작은 트랜잭션 ID
  - `max_trx_id` : Read View 생성 시점에 다음으로 할당될 트랜잭션 ID
  - `creator_trx_id` : Read View를 생성한 트랜잭션의 ID
- 가시성 판단 규칙
  - 레코드의 trx_id < min_trx_id → Read View 생성 전에 커밋된 데이터 → **보임**
  - 레코드의 trx_id >= max_trx_id → Read View 생성 후에 시작된 트랜잭션 → **안 보임**
  - min_trx_id <= 레코드의 trx_id < max_trx_id → m_ids에 포함 여부로 판단
    - m_ids에 포함 → 아직 커밋되지 않은 트랜잭션 → **안 보임** → undo log에서 이전 버전 조회
    - m_ids에 미포함 → 이미 커밋된 트랜잭션 → **보임**
- Read View 생성 시점
  - Read Committed : SELECT 실행마다 새로운 Read View 생성
  - Repeatable Read : 트랜잭션 내 첫 번째 SELECT 시 Read View 생성 후 트랜잭션 종료까지 재사용

### Undo Log Purge
- undo log는 무한히 보관되지 않으며, 더 이상 참조할 트랜잭션이 없을 때 정리(purge)됨
- Purge Thread가 백그라운드에서 주기적으로 불필요한 undo log를 삭제
- 장기 실행 트랜잭션이 존재하면 해당 트랜잭션이 참조할 수 있는 undo log를 정리할 수 없어 undo tablespace가 비대해지는 문제 발생

## PostgreSQL MVCC
- MGA(Multi Generation Architecture) 방식
  - 튜플을 업데이트할 때 새로운 값으로 replace 처리하는 것이 아니라, 새로운 튜플을 추가하고 이전 튜플은 유효 범위를 마킹하여 처리하는 방식
- 데이터 페이지 내에 변경되기 이전 Tuple과 변경된 신규 Tuple을 같은 page에 저장
- Tuple의 헤더에는 Tuple이 생성된 트랜잭션 ID와 Tuple이 삭제된 트랜잭션 ID를 저장
- Tuple의 헤더에 저장된 트랜잭션 ID와 현재 트랜잭션의 ID를 비교하여 현재 트랜잭션의 ID보다 작거나 같은 트랜잭션 ID를 가지는 데이터만 읽음

### xmin / xmax
- Tuple 헤더에 저장되는 트랜잭션 ID의 실제 명칭
  - `xmin` : 해당 Tuple을 **생성(INSERT)** 한 트랜잭션 ID
  - `xmax` : 해당 Tuple을 **삭제(DELETE) 또는 갱신(UPDATE)** 한 트랜잭션 ID (없으면 0)
- 가시성 판단 예시
  - xmin이 커밋됨 & xmax가 0 (또는 미커밋) → 현재 유효한 Tuple → **보임**
  - xmin이 커밋됨 & xmax가 커밋됨 → 이미 삭제/갱신된 Tuple → **안 보임**
  - xmin이 미커밋 → 아직 커밋되지 않은 트랜잭션이 생성한 Tuple → **안 보임** (Dirty Read 방지)
- UPDATE 시 동작
  - 기존 Tuple의 xmax에 현재 트랜잭션 ID를 기록 (삭제 마킹)
  - 새로운 Tuple을 생성하고 xmin에 현재 트랜잭션 ID를 기록
  - 기존 Tuple에서 새 Tuple을 가리키는 포인터(ctid)를 설정

### VACUUM
- MGA 방식의 특성상 UPDATE/DELETE 시 이전 Tuple이 즉시 삭제되지 않고 Dead Tuple로 남음
- Dead Tuple이 누적되면 테이블 크기 증가(Table Bloat) 및 쿼리 성능 저하 발생
- VACUUM의 역할
  - Dead Tuple이 차지하던 공간을 재사용 가능하도록 반환
  - Transaction ID Wraparound 방지를 위한 Tuple Freezing 수행
- VACUUM 종류
  - `VACUUM` : Dead Tuple 공간을 재사용 가능 상태로 변경 (OS에 반환하지는 않음)
  - `VACUUM FULL` : 테이블을 재작성하여 실제 디스크 공간을 OS에 반환 (테이블 전체 잠금 발생)
  - `autovacuum` : 백그라운드에서 자동으로 실행되는 VACUUM (운영 환경에서 필수)

### HOT (Heap Only Tuple) Update
- 같은 page 내에서 UPDATE 시 인덱스 갱신 없이 Heap 내에서만 새 Tuple을 생성하는 최적화
- 조건: 업데이트되는 컬럼이 인덱스 컬럼을 포함하지 않고, 새 Tuple이 같은 page에 저장될 수 있을 때
- 이전 Tuple에서 새 Tuple로의 포인터 체인을 통해 접근
- 인덱스 업데이트 비용을 줄여 UPDATE 성능을 향상


## MongoDB MVCC
- WiredTiger 스토리지 엔진 기반 (3.2 이후 기본 엔진)
- document-level 동시성 제어를 사용하여 같은 collection 내의 서로 다른 document에 대한 동시 쓰기가 가능
- WiredTiger 내부적으로 스냅샷 기반의 MVCC를 사용하여 읽기 일관성 보장
- 트랜잭션 시작 시점의 일관된 스냅샷을 제공하며, 쓰기 충돌 발생 시 자동으로 재시도 또는 어보트
- MySQL/PostgreSQL과의 차이
  - MySQL/PostgreSQL은 행(row/tuple) 단위 MVCC이지만, MongoDB는 document 단위 MVCC
  - 단일 document 연산은 별도 트랜잭션 없이도 원자적으로 처리


## MySQL vs PostgreSQL MVCC 비교

| | MySQL (InnoDB) | PostgreSQL |
|---|---|---|
| 방식 | Undo Segment | MGA (Multi Generation Architecture) |
| 이전 버전 저장 위치 | undo log (별도 공간) | 동일 데이터 page 내 |
| 최신 데이터 위치 | 원본 레코드에 즉시 반영 | 새 Tuple로 추가 |
| 버전 정리 | Purge Thread가 undo log 삭제 | VACUUM이 Dead Tuple 정리 |
| 정리 부담 | 장기 트랜잭션 시 undo tablespace 비대화 | Dead Tuple 누적으로 Table Bloat 발생 |
| 인덱스 영향 | 인덱스는 항상 최신 레코드를 가리킴 | UPDATE 시 인덱스도 갱신 필요 (HOT으로 최적화) |


## MVCC의 한계
- Write-Write 충돌은 해결하지 못함
  - MVCC는 Read-Write 간의 충돌을 방지하지만, 두 트랜잭션이 같은 데이터를 동시에 쓰는 경우 별도의 잠금 또는 충돌 감지 메커니즘이 필요
- Phantom Read 방지 불가
  - MVCC의 스냅샷은 기존 행의 가시성만 판단하며, 새로 삽입되는 행에 대해서는 보호하지 못함
  - Gap Lock(MySQL) 또는 Serializable 격리 수준으로 별도 해결 필요
- 저장 공간 오버헤드
  - 여러 버전의 데이터를 유지해야 하므로 추가적인 저장 공간이 필요
  - MySQL은 undo log, PostgreSQL은 Dead Tuple로 인한 공간 부담
- 장기 실행 트랜잭션 문제
  - 오래 실행되는 트랜잭션이 있으면 이전 버전을 정리할 수 없어 성능 저하 발생
