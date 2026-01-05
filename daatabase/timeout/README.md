# Timeout

## MongoDB

---

### 1. 트랜잭션 및 락 관련 (Transaction & Lock)

트랜잭션의 무결성을 유지하면서 데드락(Deadlock)이나 과도한 대기를 방지하기 위한 설정들입니다.

* **`maxTransactionLockRequestTimeoutMillis`**
* **정의:** 트랜잭션 내의 작업이 필요한 락(Lock)을 획득하기 위해 대기하는 최대 시간입니다. 이 시간이 지나면 락 획득 실패로 트랜잭션이 중단됩니다.
* **Default:** `5` (5ms)


* **`transactionLifetimeLimitSeconds`**
* **정의:** 트랜잭션이 시작된 후 완료(Commit)되거나 취소(Abort)될 때까지 유지될 수 있는 최대 수명입니다. 이 시간이 지나면 MongoDB가 트랜잭션을 강제로 중단합니다.
* **Default:** `60` (60초)



### 2. 쿼리 및 작업 수행 관련 (Query & Operation)

개별 쿼리나 쓰기 작업이 너무 오래 걸리는 것을 제어합니다.

* **`maxTimeMS`** (가장 많이 사용됨)
* **정의:** 개별 쿼리(Find, Aggregate 등)나 명령어 실행에 허용되는 최대 시간입니다. 주로 쿼리별로 설정하거나 클라이언트 드라이버 레벨에서 설정합니다. 이 시간이 초과되면 서버가 작업을 중단합니다.
* **Default:** `0` (제한 없음/무한대)


* **`wtimeout` (Write Concern Timeout)**
* **정의:** 쓰기 작업 시 `w: "majority"` 등의 옵션을 사용할 때, 지정된 복제 수준을 만족할 때까지 기다리는 최대 시간입니다. 시간 내에 복제가 완료되지 않으면 에러를 반환합니다(데이터는 롤백되지 않을 수 있음).
* **Default:** `0` (제한 없음/무한대)



### 3. 커서 및 세션 관련 (Cursor & Session)

사용하지 않는 리소스를 정리하기 위한 타임아웃입니다.

* **`cursorTimeoutMillis`**
* **정의:** 클라이언트가 열어둔 커서(Cursor)가 유휴(Idle) 상태로 유지될 수 있는 시간입니다. 이 시간이 지나면 서버는 커서를 닫아 리소스를 반환합니다. (`noCursorTimeout` 옵션으로 무시 가능)
* **Default:** `600000` (600,000ms = 10분)


* **`localLogicalSessionTimeoutMinutes`**
* **정의:** 서버 측 세션이 비활성 상태일 때 유지되는 시간입니다. 세션이 만료되면 관련 리소스가 정리됩니다.
* **Default:** `30` (30분)



### 4. 클라이언트 드라이버 연결 관련 (Connection - Client Side)

애플리케이션(Spring Boot, Node.js 등)이 DB에 접속할 때 발생하는 타임아웃입니다. (URI Connection String에 주로 설정)

* **`connectTimeoutMS`**
* **정의:** 클라이언트가 서버와 TCP 연결(소켓 연결)을 맺는 데 기다리는 최대 시간입니다.
* **Default:** `10000` (10초) *※ 드라이버 버전에 따라 상이할 수 있음*


* **`socketTimeoutMS`**
* **정의:** 소켓 연결 후, I/O 작업(데이터 읽기/쓰기) 시 응답을 기다리는 최대 시간입니다. 쿼리가 오래 걸려도 이 설정보다 길어지면 네트워크 에러가 발생할 수 있습니다.
* **Default:** `0` (무한대)


* **`serverSelectionTimeoutMS`**
* **정의:** 드라이버가 쿼리를 수행할 적절한 서버(Primary 혹은 Secondary)를 찾기 위해 대기하는 시간입니다. 클러스터 장애 시 Failover 대기 시간과 관련이 깊습니다.
* **Default:** `30000` (30초)


## PostgreSQL

---

### 1. 트랜잭션 및 락 관련 (Transaction & Lock)

데이터 무결성과 동시성 제어를 위해 대기 시간을 관리하는 설정입니다.

* **`lock_timeout`**
* **MongoDB 대응:** `maxTransactionLockRequestTimeoutMillis`
* **정의:** 트랜잭션이 테이블이나 로우(Row)에 락을 걸기 위해 대기하는 최대 시간입니다. 이 시간이 지나면 락 획득을 포기하고 에러를 발생시킵니다.
* **Default:** `0` (비활성/무한 대기)


* **`deadlock_timeout`**
* **정의:** 두 트랜잭션이 서로 락을 기다리는 데드락(Deadlock) 상태인지 확인하기 전까지 대기하는 시간입니다. 이 시간이 지나면 데드락 감지 로직이 실행됩니다. (너무 짧으면 성능 저하, 너무 길면 감지 늦음)
* **Default:** `1s` (1초)


* **`idle_in_transaction_session_timeout`** (★ 매우 중요)
* **MongoDB 대응:** `transactionLifetimeLimitSeconds`와 유사한 목적
* **정의:** 트랜잭션을 시작(`BEGIN`)한 후 커밋이나 롤백 없이 '유휴(Idle)' 상태로 머물 수 있는 최대 시간입니다. 이 시간이 지나면 강제로 세션을 종료합니다. (PostgreSQL의 Vacuum 동작을 방해하는 것을 막기 위해 중요)
* **Default:** `0` (비활성)



### 2. 쿼리 및 작업 수행 관련 (Query & Operation)

실행 시간이 긴 쿼리를 제어하여 DB 부하를 막습니다.

* **`statement_timeout`**
* **MongoDB 대응:** `maxTimeMS`
* **정의:** 개별 쿼리(Statement)가 실행되는 최대 허용 시간입니다. 쿼리가 이 시간보다 오래 걸리면 강제로 중단(Cancel)됩니다.
* **Default:** `0` (비활성/무제한)



### 3. 세션 및 연결 리소스 관련 (Session & Connection)

서버 측에서 불필요한 연결을 정리하는 설정입니다.

* **`idle_session_timeout`** (PostgreSQL 14+)
* **MongoDB 대응:** `cursorTimeoutMillis` 등과 유사한 리소스 정리 목적
* **정의:** 트랜잭션 중이 아닌 단순 연결 상태에서 아무런 쿼리도 날리지 않고 유휴 상태인 세션을 끊는 시간입니다.
* **Default:** `0` (비활성)


* **`authentication_timeout`**
* **정의:** 클라이언트가 서버에 접속하여 인증(비밀번호 입력 등) 과정을 완료하는 데 주어지는 시간입니다. 이 시간 내에 인증을 못 하면 연결을 끊습니다.
* **Default:** `1min` (1분)



### 4. 클라이언트 드라이버 연결 관련 (Connection - JDBC/Driver)

애플리케이션(Spring, Node.js 등)의 드라이버 설정(Connection URL 등)입니다.

* **`connectTimeout`**
* **MongoDB 대응:** `connectTimeoutMS`
* **정의:** DB 서버와 최초 TCP 연결을 맺을 때 기다리는 최대 시간입니다.
* **Default:** `10` (초 - 드라이버마다 다를 수 있으나 통상 10초)


* **`socketTimeout`**
* **MongoDB 대응:** `socketTimeoutMS`
* **정의:** 쿼리를 보낸 후 결과를 받기까지 소켓에서 데이터를 기다리는 최대 시간입니다.
* **Default:** `0` (무한대)


## MySQL
네, MongoDB, PostgreSQL과 동일한 체계(트랜잭션/락, 쿼리, 세션, 클라이언트)로 **MySQL(InnoDB 스토리지 엔진 기준)**의 주요 타임아웃 설정값들을 정리해 드립니다.

MySQL은 웹 애플리케이션에서 가장 널리 사용되는 만큼, **커넥션 유지 시간(`wait_timeout`)**과 **락 대기 시간** 설정이 실제 장애 대응에 매우 중요합니다.

---

### 1. 트랜잭션 및 락 관련 (Transaction & Lock)

데이터 갱신 시 충돌이 발생했을 때 얼마나 기다릴지 결정하는 설정입니다.

* **`innodb_lock_wait_timeout`** (★ 가장 중요)
* **MongoDB/PG 대응:** `maxTransactionLockRequestTimeoutMillis` / `lock_timeout`
* **정의:** 트랜잭션이 **Row Lock(행 잠금)**을 획득하기 위해 대기하는 최대 시간입니다. 이 시간이 지나면 "Lock wait timeout exceeded" 에러가 발생하며, 쿼리(또는 트랜잭션 전체)가 롤백됩니다.
* **Default:** `50` (50초)


* **`innodb_rollback_on_timeout`**
* **정의:** 위 `innodb_lock_wait_timeout` 발생 시, 마지막 쿼리만 취소할지 트랜잭션 전체를 롤백할지 결정하는 옵션입니다.
* **Default:** `OFF` (마지막 쿼리만 롤백됨. 전체 롤백을 원하면 ON으로 변경 필요)



### 2. 쿼리 및 작업 수행 관련 (Query & Operation)

오래 걸리는 쿼리를 제어하여 시스템 리소스를 보호합니다.

* **`max_execution_time`** (MySQL 5.7.8+)
* **MongoDB/PG 대응:** `maxTimeMS` / `statement_timeout`
* **정의:** `SELECT` 쿼리(읽기 전용)가 실행될 수 있는 최대 시간(밀리초, ms)입니다. 힌트(`/*+ MAX_EXECUTION_TIME(1000) */`)로 쿼리마다 다르게 줄 수도 있고, 전역 설정도 가능합니다.
* **Default:** `0` (비활성/무제한)


* **`net_read_timeout` / `net_write_timeout**`
* **정의:** 서버가 클라이언트로부터 데이터를 읽거나(read), 결과를 보낼 때(write) 중단 없이 기다려주는 시간입니다. 네트워크가 느리거나 전송할 데이터가 매우 클 때 이 값의 영향을 받습니다.
* **Default:** `30` / `60` (초)



### 3. 세션 및 연결 리소스 관련 (Session & Connection)

유휴 커넥션을 정리하여 리소스 낭비를 막는 설정입니다. MySQL에서 가장 흔한 연결 끊김 원인입니다.

* **`wait_timeout`** (★ 매우 중요)
* **MongoDB/PG 대응:** `cursorTimeoutMillis` / `idle_session_timeout`
* **정의:** 비대화형(Non-interactive) 연결(JDBC, 애플리케이션 등)이 쿼리 요청 없이 '유휴(Idle)' 상태로 유지될 수 있는 최대 시간입니다. 이 시간이 지나면 MySQL이 연결을 끊어버립니다.
* **Default:** `28800` (28800초 = **8시간**)


* **`interactive_timeout`**
* **정의:** 대화형(Interactive) 연결(mysql cli 툴 등)에서의 유휴 대기 시간입니다.
* **Default:** `28800` (8시간)



### 4. 클라이언트 드라이버 연결 관련 (Connection - JDBC/Driver)

애플리케이션(Spring 등)의 JDBC URL 파라미터입니다.

* **`connectTimeout`**
* **정의:** DB 서버와 TCP 연결을 맺는 데 기다리는 최대 시간입니다.
* **Default:** `0` (무한대) 또는 드라이버 버전에 따라 `10000`(10초) 등 상이함.


* **`socketTimeout`**
* **정의:** 쿼리를 보낸 후 응답을 받기까지 소켓에서 기다리는 최대 시간입니다.
* **Default:** `0` (무한대)

