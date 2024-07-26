## DB Connection Pool (DBCP)

### 커넥션 풀을 사용해야 하는 이유
**처리 비용 절감**   
쿼리 수행을 위해 일반적으로 커넥션을 생성함.   
- TCP 기반으로 연결을 맺고, 연결을 끊음.  
- Three-way handshake, Four-way handshake 등의 과정을 거침.
- 커넥션을 생성하는데에는 시간적인 비용이 발생함.

**일관된 성능 유지**   
- 사용하려는 커낵션 개수를 일정수준으로 제한하고 관리함.
- DB의 과부하 상태를 방지 -> 서비스 장애 방지


### IDLE 커넥션
- 커넥션 풀에 있는 커넥션 중, 사용되지 않는 커넥션
- 빈번한 데이터베이스 액세스를 위해 연결을 설정하는 오버헤드를 줄이기 위해 열려 있는 연결 수를 유지하는 연결 풀링 메커니즘
- 일부 유휴 연결이 있는 것은 정상이며 성능상의 이유로 유익할 수 있지만(예: 반복적으로 연결을 열고 닫는 오버헤드 최소화) 유휴 연결이 너무 많으면 메모리 및 네트워크 포트와 같은 데이터베이스 서버의 불필요한 리소스를 소비


### MySQL Connection Pool

- max_connections
  - 풀이 가질 수 있는 최대 커넥션 개수 
  - = 사용중 (in-use) 커넥션 + 유휴 (idle) 커넥션 
- wait_timeout
  - `inactive`상태의 커넥션을 유지하는 시간
  - 비정상적인 connection 종료 및 반환을 하지 않은 경우, 네트워크 단절 => inactive 상태의 커넥션
  - `wait_timeout` 시간이 지나면, 해당 커넥션은 종료됨.
- connect_timeout
  - 커넥션을 맺기 위해 대기하는 시간
  - 사용중인 커넥션으로 커넥션 풀이 가득 찬 경우, 커넥션을 맺기 위해 대기하는 시간
  - 순간적인 트래픽 증가시 커넥션 풀이 가득 차는 경우가 발생할 수 있음.
  - `connect_timeout`을 수정하여 사용자에게 응답이 없는 결과보다 빠른 응답을 제공하는 것이 좋음.

### PostgreSQL Connection Pool

- max_connections
  - 풀이 가질 수 있는 최대 커넥션 개수 
  - pg npm 에서는 `max`로 설정
- statement_timeout
  - 쿼리 수행 제한 시간 
  - 쿼리 수행 시간이 `statement_timeout` 시간을 초과하면, 해당 쿼리는 종료됨.
- connection_timeout
  - mysql의 `connect_timeout`과 동일한 기능
  - pg npm 에서는 `connectionTimeoutMillis`로 설정


- [참고 영상](https://www.youtube.com/watch?v=6Q7iRTb4tQE)
