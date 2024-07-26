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

## PostgreSQL MVCC
- MGA(Multi Generation Architecture) 방식
  - 튜플을 업데이트할 때 새로운 값으로 replace 처리하는 것이 아니라, 새로운 튜플을 추가하고 이전 튜플은 유효 범위를 마킹하여 처리하는 방식
- 데이터 페이지 내에 변경되기 이전 Tuple과 변경된 신규 Tuple을 같은 page에 저장
- Tuple의 헤더에는 Tuple이 생성된 트랜잭션 ID와 Tuple이 삭제된 트랜잭션 ID를 저장
- Tuple의 헤더에 저장된 트랜잭션 ID와 현재 트랜잭션의 ID를 비교하여 현재 트랜잭션의 ID보다 작거나 같은 트랜잭션 ID를 가지는 데이터만 읽음
