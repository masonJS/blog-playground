# 트랜잭션

## 정의
- 데이터베이스에서 하나의 논리적 작업 단위를 구성하는 여러 읽기/쓰기 연산의 묶음
- 하나의 트랜잭션 내 모든 연산은 전부 성공(커밋)하거나 전부 실패(어보트)하여 부분적 완료 상태가 존재하지 않음
- 애플리케이션이 오류 처리를 단순화할 수 있도록 안전성을 보장하는 메커니즘

## ACID
### 원자성
- 여러 읽기, 쓰기 작업이 하나의 원자적인 트랜잭션으로 묶여 결함에 대한 최종 완료(커밋) 또는 취소(어보트)되어지는 성질
- 오류가 생겼을때 트랜잭션을 어보트하고 해당 트랜잭션에서 기록한 모든 내용을 취소하는 성질 == 어보트 능력
- 부분 취소의 결과가 나타나지 않도록 전부 반영 or 전부 실패

### 일관성
- 데이터베이스의 규칙(제약 조건)을 유지시키면서 애플리케이션의 로직을 통해 일관성을 처리하는 성질 (데이터베이스 + 애플리케이션 책임)

### 격리성
- 동시에 실행되는 트랜잭션을 서로 격리하는 성질 (동시성 제어)
- 두 클라이언트가 하나의 데이터베이스의 데이터를 업데이트 할때 발생하는 경쟁 조건의 문제를 해결
- isolation level이 존재

### 지속성
- 성공적으로 트랜잭션 커밋이 됬을시 데이터베이스에 영구적으로 저장 및 유실 방지 보장

## 격리
- 여러 클라이언트가 같은 데이터에 접근할때 발생하는 경쟁 상태(race condition)를 막기 위해 격리
- 트랜잭션을 서로 격리해서 다른 트랜잭션이 영향을 주지 못하게 함

### 격리 수준별 문제 발생 요약

| 격리 수준 | Dirty Read | Read Skew (Non-Repeatable Read) | Lost Update | Phantom Read |
|---|:---:|:---:|:---:|:---:|
| Read Uncommitted | O | O | O | O |
| Read Committed | X | O | O | O |
| Repeatable Read | X | X | O | O (MySQL은 Gap Lock으로 방지) |
| Serializable | X | X | X | X |

### Read Uncommitted
- Dirty Read 발생
  - 커밋되지 않은 데이터를 조회
- Dirty Write 발생
  - 커밋되지 않은 데이터를 쓰기

<img src="dirty_read.png" width="600">

### Read Committed
- Dirty Read & Write 방지
  - 커밋된 데이터만 조회
    - 커밋되어진 값과 트랜잭션 진행중인 값을 분리하여 커밋되어진 값만 조회
  - 커밋된 데이터만 쓰기
    - 레코드 단위로 잠금 사용
- Read Skew(Non-Repeatable Read) 발생 가능
  - 하나의 트랜잭션에서 같은 행을 두 번 조회했을 때, 그 사이에 다른 트랜잭션이 해당 행을 수정/커밋하여 서로 다른 값이 조회되는 현상
  - 단일 시점의 일관된 스냅샷을 보장하지 않기 때문에 발생
  - Phantom Read와의 차이
    - Read Skew: 이미 존재하는 **같은 행**의 **값**이 달라짐 (원인: UPDATE)
    - Phantom Read: 범위 쿼리 결과의 **행 집합** 자체가 달라짐 (원인: INSERT/DELETE)
    - Read Skew는 Row Lock으로 방지 가능하지만, Phantom Read는 아직 존재하지 않는 행에 대한 잠금이 불가하여 Row Lock만으로 방지 불가

<img src="read_skew.png" width="600">

### Repeatable Read
- 트랜잭션마다 트랜잭션 ID를 부여하여 트랜잭션 ID보다 작은 트랜잭션 번호에서 변경한 것만 읽음
- MVCC 방식

<img src="mvcc.png" width="600">

- Lost Update 발생 가능
  - 두 개의 트랜잭션이 같은 데이터를 수정할 때 발생하는 문제 ex) count 증가, 위키 페이지 수정

<img src="lost_update.png" width="600">

- 변경 유실을 막는 방법
  - 원자적(atomic) 연산
    - DB가 지원하는 원자적 연산 사용
    - `UPDATE ... SET count = count + 1`
  - 명시적 잠금
    - 조회할때 수정할 행을 잠금
    - `SELECT ... FOR UPDATE`

<img src="명시적_lock.png" width="600">

  - CAS
    - Compare And Swap

<img src="cas_lock.png" width="600">

- Phantom Read 발생 가능
  - 한 트랜잭션에서 같은 조건으로 범위 쿼리를 두 번 실행했을 때, 그 사이에 다른 트랜잭션이 INSERT/DELETE하여 결과 행의 집합이 달라지는 현상
  - Lost Update와의 차이: Lost Update는 같은 행을 수정하여 발생하지만, Phantom Read는 다른 트랜잭션의 INSERT/DELETE로 쿼리 결과의 행 수 자체가 변하는 문제

<img src="phantom_read.png" width="600">

- Repeatable Read에서 Phantom Read를 방지하지 못하는 이유
  - MVCC 스냅샷의 한계
    - 단순 조회(SELECT)에서는 MVCC 스냅샷이 트랜잭션 시작 시점의 데이터를 보여주므로 Phantom Read가 발생하지 않음
    - 그러나 **쓰기(UPDATE/DELETE)는 스냅샷이 아닌 현재 커밋된 최신 데이터를 기준으로 동작**
    - 다른 트랜잭션이 INSERT한 행이 쓰기 연산의 대상에 포함되면, 이후 해당 행이 현재 트랜잭션의 스냅샷에도 보이게 됨
  - Row Lock의 근본적 한계
    - Repeatable Read는 이미 존재하는 행에 대해서만 Row Lock으로 반복 읽기를 보장
    - **아직 존재하지 않는 행**은 잠글 대상 자체가 없으므로 Row Lock으로 보호 불가
    - 이를 해결하려면 인덱스 범위 잠금(Gap Lock)이나 조건 기반 잠금(Predicate Lock)이 필요 → Serializable 수준에서 제공
  ```
  TX1: SELECT * FROM employee WHERE dept = 'A';  → 3건
  TX2: INSERT INTO employee (id=4, dept='A'); COMMIT;
  TX1: UPDATE employee SET bonus = 100 WHERE dept = 'A';  → 4건 업데이트 (TX2가 삽입한 id=4 포함)
  TX1: SELECT * FROM employee WHERE dept = 'A';  → 4건 (유령 행 출현)
  ```

- Write Skew 발생 가능
  - 두 트랜잭션이 각각 같은 조건을 읽고 서로 다른 행을 수정하지만, 전체 제약 조건이 깨지는 현상
  - 개별 트랜잭션은 제약 조건을 위반하지 않지만, 동시에 실행되면 제약 조건이 깨짐
  - ex) 병원에서 최소 1명의 의사가 당직이어야 하는 규칙이 있을 때, 2명의 당직 의사가 동시에 당직 해제 요청을 하면 각각 "나 외에 1명이 있으니 해제 가능"이라 판단하여 둘 다 해제됨
  - 해결: Serializable 격리 수준 사용 또는 `SELECT ... FOR UPDATE`로 관련 행을 명시적으로 잠금


### Serializable
- 가장 단순한 격리 수준이지만 가장 엄격한 격리 수준
- 일관성이 보장되지만 성능이 가장 떨어짐
- 구현 방식
  - 실제 직렬 실행
    - 트랜잭션을 단일 스레드에서 순차적으로 실행
    - 구현이 단순하지만 처리량이 제한됨
    - 트랜잭션이 빠르고 짧을 때 적합
  - 2PL (Two-Phase Locking)
    - 읽기: 공유 잠금(Shared Lock) 획득 → 다른 트랜잭션도 읽기 가능, 쓰기 불가
    - 쓰기: 배타 잠금(Exclusive Lock) 획득 → 다른 트랜잭션의 읽기/쓰기 모두 불가
    - 잠금 확장(Growing) 단계와 잠금 축소(Shrinking) 단계로 구성
    - 교착 상태(Deadlock) 발생 가능
  - SSI (Serializable Snapshot Isolation)
    - 낙관적(Optimistic) 동시성 제어 방식
    - 스냅샷 격리 기반으로 동작하되, 커밋 시점에 직렬성 위반 여부를 검증
    - 충돌이 감지되면 해당 트랜잭션을 어보트
    - 2PL보다 성능이 좋고 직렬 실행보다 동시성이 높음


## MySQL & PostgreSQL & MongoDB

### MySQL
- 기본 격리 수준 : Repeatable Read
- InnoDB의 Phantom Read 방지
  - Gap Lock: 인덱스 레코드 사이의 간격(gap)을 잠금하여 다른 트랜잭션의 INSERT를 방지
  - Next-Key Lock: Record Lock + Gap Lock의 결합으로 인덱스 레코드와 그 앞의 간격을 함께 잠금
  - Repeatable Read 수준에서도 Phantom Read를 대부분 방지 (다른 DB와의 차이점)
- Lost Update 발생시 해결 방안
  - 명시적 잠금 (Locking Read)
    - `SELECT ... FOR UPDATE` : 배타 잠금(Exclusive Lock) → 다른 트랜잭션의 읽기(locking read)/쓰기 차단
    - `SELECT ... LOCK IN SHARE MODE` : 공유 잠금(Shared Lock) → 다른 트랜잭션의 쓰기만 차단, 읽기는 허용


### PostgreSQL
- 기본 격리 수준 : Read Committed
- Lost Update 발생시 해결 방안
  - Repeatable Read로 격리 수준 변경
    - first-updater-win 적용
    - 같은 데이터에 먼저 update한 tx가 commit되면 나중에 update한 tx는 rollback된다.
    - 데이터의 일관성 보장

> 이미 다른 동시 트랜잭션에 의해 업데이트(또는 삭제 또는 잠김)되었을 수 있습니다.
이 경우 Repeatable Read는 첫 번째 업데이트 트랜잭션이 커밋되거나 롤백될 때까지 기다립니다(아직 진행 중인 경우).
첫 번째 업데이터가 롤백되면 그 효과는 무효화되고 Repeatable Read 트랜잭션은 원래 발견된 행을 계속 업데이트할 수 있습니다.
그러나 첫 번째 업데이터가 커밋하면(그리고 단순히 잠근 것이 아니라 실제로 행을 업데이트하거나 삭제하면) Repeatable Read 트랜잭션은 아래와 같은 메시지와 함께 롤백됩니다.
> > ERROR:  could not serialize access due to concurrent update
>
> [PostgreSQL 공식 문서](https://www.postgresql.org/docs/9.5/transaction-iso.html)

### MongoDB
- 스토리지 엔진 : WiredTiger (3.2 이후 기본 엔진)
- WiredTiger는 MVCC 기반의 document-level 동시성 제어를 사용

#### 단일 문서 원자성
- MongoDB는 단일 문서(document) 내의 연산은 기본적으로 원자적(atomic)
- 하나의 document에 embedded document나 배열로 관련 데이터를 함께 저장하면 별도 트랜잭션 없이도 원자성 보장
- RDB의 여러 테이블에 걸친 정규화된 데이터를 하나의 document에 비정규화하여 저장하는 것이 MongoDB의 기본 설계 패턴

#### Multi-Document Transaction
- 여러 document/collection에 걸친 원자적 연산이 필요할 때 사용
- 지원 버전
  - 4.0 : Replica Set 환경에서 multi-document transaction 지원
  - 4.2 : Sharded Cluster 환경에서 distributed transaction 지원
- 격리 수준 : Snapshot Isolation (Repeatable Read와 유사)
  - 트랜잭션 시작 시점의 스냅샷을 기반으로 데이터를 읽음
  - 트랜잭션 내에서 일관된 데이터 뷰를 보장

#### Read Concern & Write Concern
- Read Concern : 읽기 연산의 일관성 수준을 제어
  - `local` : 노드의 최신 데이터를 읽음 (롤백 가능성 있음, 기본값)
  - `majority` : 과반수 노드에 커밋된 데이터만 읽음 (롤백 가능성 없음)
  - `snapshot` : multi-document transaction에서 사용, 트랜잭션 시작 시점의 스냅샷 읽기
  - `linearizable` : 읽기 시점까지 과반수 확인된 데이터를 읽음 (가장 강력한 일관성, 단일 문서 읽기에만 사용)
- Write Concern : 쓰기 연산의 확인 수준을 제어
  - `w: 0` : 쓰기 확인 없음 (fire-and-forget)
  - `w: 1` : Primary 노드 기록 확인 (기본값)
  - `w: "majority"` : 과반수 노드에 기록 확인 (데이터 유실 방지)
- Multi-Document Transaction 권장 설정
  - Read Concern: `snapshot` + Write Concern: `majority`로 설정하여 일관성과 내구성을 함께 보장

#### RDB 트랜잭션과의 차이
- RDB는 트랜잭션이 기본 연산 단위이지만, MongoDB는 단일 문서 원자성이 기본 설계 패턴
- Multi-Document Transaction은 성능 비용이 크므로 가능하면 데이터 모델링으로 해결하는 것을 권장
- 트랜잭션 실행 시간 제한: 기본 60초 (트랜잭션이 길어지면 자동으로 어보트)