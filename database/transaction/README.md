# 트랜잭션

## 정의 

## ACID
### 원자성
- 여러 읽기, 쓰기 작업이 하나의 원자적인 트랜잭션으로 묶여 결함에 대한 최종 완료(커밋) 또는 취소(어보트)되어지는 성질
- 오류가 생겼을때 트랜잭션을 어보트하고 해당 트랜잭션에서 기록한 모든 내용을 취소하는 성질 == 어보트 능력
- 부분 취소의 결과가 나타나지 않도록 전부 반영 or 전부 실패

### 일관성
- 데이터베이스의 규칠(제약 조건)을 유지시키면서 애플리케이션의 로직을 통해 일관성을 처리하는 성질 (데이터베이스 + 애플리케이션 책임)

### 격리성
- 동시에 실행되는 트랜잭션을 서로 격리하는 성질 (동시성 제어)
- 두 클라이언트가 하나의 데이터베이스의 데이터를 업데이트 할때 발생하는 경쟁 조건의 문제를 해결
- isolation level이 존재

### 지속성
- 성공적으로 트랜잭션 커밋이 됬을시 데이터베이스에 영구적으로 저장 및 유실 방지 보장

## Isolation level

Dirty Read

Non-repeatable Read (==Fuzzy read)

Phantom Read



