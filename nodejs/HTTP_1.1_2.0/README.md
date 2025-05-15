## HTTP 1.1 / 2.0


### HTTP 1.1
Pipielining
- 여러개의 요청을 하나의 TCP connection 으로 보낼수 있음
- 하지만 요청에 대한 응답의 순서는 FIFO 방식으로 순차 처리되어짐.
- 여기서 문제점은
  - 먼저 들어온 요청에 응답값이 지연되면 같은 connection에 묶인 모든 요청에 지연이 발생 (= HOL Blocking)

### HTTP 2.0

Multiplexing
- Stream 방식
- 동일한 connection 에서 한 번에 여러 요청을 보내고(병렬적) 어떤 순서로든 응답을 독립적으로 반환


HTTP 2.0 은 2015년 IETF 표준으로 채택해서 대부분 브라우저에서 지원을함.
HTTP/1의 호환성 또한 유지하니 반복적인 Handshake 및 네트워크 지연, 클라우드 비용 증가 등의 여러가지 이유로 HTTP 2.0을 사용하지 않을 이유가 없음
되도록이면 HTTP 2.0
