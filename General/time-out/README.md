## server

### keepAliveTimeout
- http persistent 연결 유지에 대한 제한 시간
- AWS ELB <-> server 통신을 할때 ELB idleTimeout 시간보다 server의 keepAliveTimeout 시간을 더 높게 잡아야한다.

### requestTimeout
- 요청에 대한 응답 시간

## database


### statementTimeout
