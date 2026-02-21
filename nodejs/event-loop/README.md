# Event Loop

### call stack
- call stack 실행은 LIFO(Last In First Out) 방식으로 동기적으로 동작
- 느린 작업 하나로 인해 전체 프로그램이 느려지는 현상이 발생할 수 있음.
- 병목을 해결하기 위해 nodejs는 libuv를 사용하여 비동기 작업을 지원

### libuv
- 비동기 i/o를 지원하는 c언어 라이브러리
- 윈도우, 리눅스 커널을 wrapping한 추상화한 구조
- **event loop, thread pool, event queue로 구성**
- 파일 읽기, DNS Lookup 등 os 커널이 비동기 api를 지원하지 않는 작업인 경우 별도의 thread pool을 사용
  - uv_threadpool의 환경 변수 값 조정 가능 (default=4)

### event loop phases
- libuv의 event loop는 6가지 phase로 구성
- 각각의 phase 마다 별도의 event queue를 가짐
- 각 phase는 순서대로 라운드 로빈 방식으로 실행되며, 한 바퀴를 **tick** 이라고 함

```
   ┌───────────────────────────┐
┌─>│         Timers            │  setTimeout, setInterval 콜백 실행
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     Pending Callbacks     │  이전 루프에서 지연된 I/O 콜백 실행 (TCP 에러 콜백 등)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       Idle, Prepare       │  내부적으로만 사용
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │          Poll             │  새로운 I/O 이벤트를 가져와 관련 콜백 실행
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │          Check            │  setImmediate 콜백 실행
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      Close Callbacks      │  .on('close', ...) 같은 close 이벤트 콜백 실행
   └───────────────────────────┘
```

#### Timers
- `setTimeout`, `setInterval`로 등록한 콜백이 실행되는 phase
- 지정한 시간이 지난 콜백을 실행하며, 정확한 시간 보장은 아닌 **최소 지연 시간**을 보장

#### Pending Callbacks
- 이전 루프 반복에서 수행되지 못한 I/O 콜백을 실행
- 예: TCP 연결 시 `ECONNREFUSED` 에러 콜백

#### Poll
- 거의 모든 I/O 관련 콜백이 실행되는 핵심 phase
- poll queue가 비어있을 때:
  - `setImmediate`가 예약되어 있으면 → Check phase로 이동
  - 예약된 것이 없으면 → 새로운 I/O 이벤트가 올 때까지 대기 (blocking)
  - Timer가 만료되었으면 → Timers phase로 돌아감

#### Check
- `setImmediate` 콜백이 실행되는 phase
- Poll phase가 완료된 직후 실행됨

#### Close Callbacks
- `socket.on('close', ...)` 같은 close 이벤트 콜백이 실행되는 phase

### Microtask Queue
- event loop의 phase 사이사이마다 **우선적으로** 실행되는 별도의 큐
- phase 전환 전에 microtask queue가 완전히 비워질 때까지 실행됨

| 우선순위 | 종류 | 설명 |
|---|---|---|
| 1 | `process.nextTick` | 현재 phase 끝나자마자 즉시 실행 (nextTickQueue) |
| 2 | `Promise.then / catch / finally` | nextTick 다음, 다음 phase 전에 실행 (microTaskQueue) |

### setTimeout vs setImmediate vs process.nextTick

#### process.nextTick
- event loop의 phase에 속하지 않으며, **현재 작업이 완료된 직후** 즉시 실행
- 어떤 phase에서 호출하든 해당 phase가 끝나기 전에 nextTickQueue가 먼저 전부 소비됨
- 재귀 호출 시 event loop가 다음 phase로 넘어가지 못하고 **starvation(기아)** 이 발생할 수 있음

```js
// starvation 예시 - I/O 콜백이 영원히 실행되지 못함
function recursive() {
  process.nextTick(recursive);
}
recursive();
```

- 주요 사용 사례:
  - 이벤트 핸들러 등록 후 동기 코드가 끝나기 전에 콜백이 실행되는 것을 방지
  - API 일관성 보장 (동기/비동기 혼용 방지)

```js
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {
  constructor() {
    super();
    // emit을 nextTick으로 감싸지 않으면, 아래 on('event') 등록 전에 emit이 실행되어 이벤트를 놓침
    process.nextTick(() => this.emit('event'));
  }
}
const emitter = new MyEmitter();
emitter.on('event', () => console.log('event fired')); // 정상 동작
```

#### setImmediate
- Check phase에서 실행되며, poll phase가 완료된 **직후** 실행이 보장됨
- I/O 콜백 내부에서 호출하면 항상 `setTimeout(fn, 0)` 보다 먼저 실행됨

```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setImmediate(() => console.log('setImmediate'));  // 항상 먼저
  setTimeout(() => console.log('setTimeout'), 0);   // 항상 나중
});
// 실행 순서: setImmediate → setTimeout
// I/O 콜백은 Poll phase에서 실행되므로, 다음 phase인 Check(setImmediate)가 Timers(setTimeout)보다 먼저 도달
```

#### setTimeout(fn, 0)
- Timers phase에서 실행되며, 내부적으로 `setTimeout(fn, 1)`과 동일하게 처리됨
- 최소 지연 시간만 보장하므로 시스템 부하에 따라 실행 시점이 달라질 수 있음

#### setTimeout(fn, 0) vs setImmediate - 메인 모듈에서의 실행 순서

```js
// 메인 모듈 (I/O 콜백 외부)에서는 실행 순서가 비결정적
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
// setTimeout → setImmediate 또는 setImmediate → setTimeout (실행마다 달라질 수 있음)
```
- 메인 모듈에서 실행 순서가 비결정적인 이유:
  - `setTimeout(fn, 0)`은 내부적으로 1ms 지연으로 처리됨
  - event loop 진입 시점에서 1ms가 이미 경과했으면 Timers phase에서 `setTimeout` 콜백이 먼저 실행
  - 1ms가 아직 경과하지 않았으면 Timers phase를 건너뛰고 Poll → Check phase에서 `setImmediate`가 먼저 실행
  - 프로세스 시작 시 초기화 비용이 1ms 이내인지 여부에 따라 달라지므로 **비결정적**

#### 종합 비교

| 구분 | 실행 위치 | 우선순위 | 사용 사례 |
|---|---|---|---|
| `process.nextTick` | 현재 phase 직후 (microtask) | 가장 높음 | API 일관성 보장, 이벤트 핸들러 등록 보장 |
| `Promise.then` | 현재 phase 직후 (microtask) | nextTick 다음 | 비동기 흐름 제어 |
| `setImmediate` | Check phase | phase 레벨 | I/O 완료 후 즉시 실행이 필요한 경우 |
| `setTimeout(fn, 0)` | Timers phase | phase 레벨 | 최소 지연 후 실행 |

```js
setTimeout(() => console.log('1. setTimeout'), 0);
setImmediate(() => console.log('2. setImmediate'));
process.nextTick(() => console.log('3. nextTick'));
Promise.resolve().then(() => console.log('4. promise'));

// 확정 순서: nextTick → promise → 이후 setTimeout/setImmediate는 비결정적
```

### 동작 원리

#### 전체 흐름

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Application │────>│   libuv       │────>│  OS Kernel   │
  │  (JS Code)   │     │  (Event Loop) │     │  / Thread Pool│
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                     │
         │  비동기 호출        │  작업 위임           │  작업 완료
         │  (fs.readFile 등)  │                     │
         │                    │<────────────────────┘
         │                    │  완료 콜백을
         │                    │  event queue에 등록
         │<───────────────────┘
         │  call stack이 비면
         │  콜백 실행
```

#### 1단계: 비동기 작업 요청

```js
const fs = require('fs');

// JS 코드에서 비동기 I/O 작업을 호출
fs.readFile('/path/to/file', (err, data) => {
  console.log(data);
});

console.log('이 코드가 먼저 실행됨');
```

- `fs.readFile` 호출 시 V8 엔진은 이를 직접 처리하지 않고 libuv에 위임
- 콜백 함수 `(err, data) => { ... }` 는 등록만 해두고, JS 코드는 다음 줄로 바로 넘어감

#### 2단계: libuv의 작업 분배

libuv는 작업의 종류에 따라 처리 방식을 결정:

| 작업 종류 | 처리 방식 | 예시 |
|---|---|---|
| OS 커널이 비동기 지원 | **커널 비동기 API** (epoll/kqueue/IOCP) | 네트워크 소켓, TCP/UDP, pipe |
| OS 커널이 비동기 미지원 | **thread pool** (worker thread) | 파일 읽기/쓰기, DNS Lookup, 압축 |

- 커널 비동기 API: OS가 직접 비동기로 처리하므로 별도 스레드 불필요
  - Linux: `epoll`, macOS: `kqueue`, Windows: `IOCP`
- thread pool: OS가 비동기 API를 제공하지 않는 작업을 별도 스레드에서 실행
  - 기본 4개의 worker thread (`UV_THREADPOOL_SIZE` 환경변수로 최대 1024까지 조정 가능)

#### 3단계: 작업 완료 및 콜백 등록

- 커널 또는 thread pool에서 작업이 완료되면, libuv는 완료된 작업의 콜백을 해당 phase의 event queue에 등록
- 콜백이 등록되는 queue는 작업 종류에 따라 다름:
  - `setTimeout` 콜백 → Timers queue
  - I/O 작업 콜백 → Poll queue
  - `setImmediate` 콜백 → Check queue

#### 4단계: event loop의 콜백 실행

- event loop는 각 phase를 순회하면서 해당 phase의 queue에 등록된 콜백을 call stack으로 이동시켜 실행
- **각 phase 전환 시점마다** microtask queue(`process.nextTick`, `Promise`)를 먼저 소비

```js
const fs = require('fs');

console.log('1. 동기 코드 실행');               // call stack에서 즉시 실행

fs.readFile(__filename, () => {                 // libuv → thread pool로 위임
  console.log('4. I/O 콜백 (Poll phase)');

  setImmediate(() => {
    console.log('5. setImmediate (Check phase)');
  });
});

setTimeout(() => {
  console.log('3. setTimeout (Timers phase)');
}, 0);

process.nextTick(() => {
  console.log('2. nextTick (microtask)');        // 동기 코드 완료 직후, phase 진입 전 실행
});

// 실행 순서: 1 → 2 → 3 → 4 → 5
```

#### event loop 종료 조건
- event loop는 아래 조건을 모두 만족하면 종료됨:
  - 모든 phase의 queue가 비어있음
  - 대기 중인 비동기 작업(timer, I/O 등)이 없음
  - `ref`된 핸들이 없음 (활성 소켓, 서버 등)
- 반대로 `http.createServer()` 같은 활성 핸들이 있으면 event loop는 계속 실행됨


- https://evan-moon.github.io/2019/08/01/nodejs-event-loop-workflow/#workflow-with-examples
- https://medium.com/zigbang/nodejs-event-loop%ED%8C%8C%ED%97%A4%EC%B9%98%EA%B8%B0-16e9290f2b30
- https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
