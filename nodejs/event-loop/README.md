# Event Loop

### call stack
- call stack 실행은 FIFO(First In First Out) 방식으로 동기적으로 동작
- 느린 작업 하나로 인해 전체 프로그램이 느려지는 현상이 발생할 수 있음.
- 병목을 해결하기 위해 nodejs는 libuv를 사용하여 비동기 작업을 지원

### libuv
- 비동기 i/o를 지원하는 c언어 라이브러리
- 윈도우, 리눅스 커널을 wrapping한 추상화한 구조
- **event loop, thread pool, event queue로 구성**
- os 커널이 비동기 api를 지원하지 않는 작업인 경우 별도의 thread pool을 사용
  - uv_threadpool의 환경 변수 값 조정 가능 (default=4)

### event loop phases
- libuv의 event loop는 6가지 phase로 구성
- 각각의 phase 마다 별도의 event queue를 가짐


### event loop 동작 원리
1. blocking i/o 작업에 대해 thread pool에서 사용가능한 worker thread에게 작업 위임 
2. worker thread에서 작업을 완료하면 event queue에 완료된 작업 callback을 넣음 
3. event loop는 주기적으로 call stack이 비었는지 체크한후 event queue에 대기중인 callback이 있다면
   call stack으로 이동시킴


- https://evan-moon.github.io/2019/08/01/nodejs-event-loop-workflow/#workflow-with-examples
- https://medium.com/zigbang/nodejs-event-loop%ED%8C%8C%ED%97%A4%EC%B9%98%EA%B8%B0-16e9290f2b30


