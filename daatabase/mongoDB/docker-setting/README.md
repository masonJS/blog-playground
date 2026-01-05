# CI 환경 MongoDB 초기화 실패 및 트랜잭션 Lock 타임아웃 해결

## 1. 개요

GitHub Actions 기반의 CI 환경에서 통합 테스트(Integration Test) 수행 중, 간헐적으로 MongoDB **트랜잭션 Lock 획득 실패 오류**와 **Replica Set 초기화 지연(무한 대기)** 현상이 발생하여 테스트가 실패하는 이슈가 확인됨. 이에 대한 원인 분석 및 영구적인 해결책을 적용함.

## 2. 발생한 문제

### A. 트랜잭션 Lock 타임아웃

테스트 실행 도중 다음과 같은 에러 로그와 함께 트랜잭션 쓰기 작업이 실패함.

```text
MongoServerError: Unable to acquire IX lock on '{ ... }' within 5ms.

```

### B. Replica Set 초기화 무한 대기

`mongo-setup` 컨테이너 로그에서 Primary 선출이 이루어지지 않고 모든 노드가 `Secondary` 상태에 머무르며 다음 단계로 진행되지 않음.

```text
Waiting for Primary... Current state: Secondary

```

---

## 3. 원인 분석

### 원인 1: 타이트한 Lock 타임아웃 설정 (5ms Issue)

* **현상:** MongoDB 서버의 `maxTransactionLockRequestTimeoutMillis` 기본값은 **5ms**임.
* **분석:** 로컬 환경과 달리 자원(CPU/Disk)이 제한적인 GitHub Actions(CI) 환경에서는 일시적인 I/O 지연이 발생하기 쉬움. 5ms는 이 지연을 버티기에 너무 짧은 시간이라, 아주 잠깐의 렉만 걸려도 바로 에러를 반환함.

### 원인 2: 초기화 경합 (Race Condition)

* **현상:** `rs.initiate()` 명령어로 3개의 노드를 동시에 초기화 시도.
* **분석:** Replica Set이 Primary를 선출하려면 과반수(Quorum)의 투표가 필요함. 하지만 CI 환경의 네트워크 지연이나 컨테이너 구동 시차로 인해 노드 간 통신이 원활하지 않아 과반수를 확보하지 못하고 모두 Secondary로 남는 데드락(Deadlock) 현상 발생.

---

## 4. 해결 방안 

### 솔루션 A: Lock 타임아웃 시간 증가

MongoDB 컨테이너 실행 명령에 파라미터를 추가하여, 트랜잭션 락 대기 시간을 5ms에서 **3초(3000ms)**로 늘려 CI 환경의 성능 변동성을 허용하도록 변경.

* **적용 코드:** `--setParameter maxTransactionLockRequestTimeoutMillis=3000`

### 솔루션 B: 단계적 Replica Set 초기화

기존의 동시 초기화 방식 대신, **"단일 노드 우선 확보 -> 멤버 추가"** 방식으로 변경하여 안정성 확보.

1. `mongo1` 단독으로 `rs.initiate()` 수행 (자신에게만 투표하므로 100% Primary 등극).
2. `mongo1`이 쓰기 가능한 상태(Writable Primary)가 될 때까지 대기.
3. 이후 `mongo2`, `mongo3`를 `rs.add()`로 클러스터에 합류시킴.
* *효과: DNS 지연이나 노드 준비 상태와 관계없이 초기화 성공 보장.*

---

## 5. 최종 설정 코드

[docker-compose.yml](docker-compose.yml)
