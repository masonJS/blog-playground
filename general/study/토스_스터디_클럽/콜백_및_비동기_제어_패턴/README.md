# 콜백 및 비동기 제어 패턴

## 스터디간에 나왔던 이야기

### 이벤트 루프
Node.js 신입 개발자 면접 질문중 단골로 나오는 문제이다.

"아래의 코드에서 출력되는 로그 결과와 이유는?"

```js
setTimeout(() => {
    console.log('setTimeout log');
}, 0);

console.log('console.log');
```
질문에 대한 답은 `cosole.log`, `setTimeout log`순으로 출력이 되며 아래의 순서로 nodejs는 동작한다.  
1. 이벤트 루프가 실행된다.
2. setTimeout 실행문을 Liberv 안에 타이머 처리를 담당하는 Timer Phase에게 전달한다.
2. 호출스택에 `console.log` 출력문을 실행한다.
3. 이벤트 루프는 각각의 비동기 처리를 담당하는 Phase들의 순회하면서 실행가능 작업이 있는지 큐를 확인한다.
4. 0초가되어 실행가능해진 setTimeout 실행문은 Timer Task Queue에 콜백함수가 담겨진다.
5. 이벤트 루프는 Timer 큐에 작업을 확인하고 콜백 함수를 실행한다.
6. 이벤트 루프는 더이상 실행할 큐 작업이 없는지 확인한뒤 종료한다.

node.js의 이벤트 루프의 역할을 잘 기억해두는것이 좋다.    
이벤트 루프는 js 호출 스택이 비어져있는지 옵저버하고 task Queue 또는 microTask Queue에 쌓인 콜백 함수들을 순회하면서 처리하는 역할을 담당한다.

### 이벤트 루프를 차단시키는 모듈들
```
1.Encryption
- crypto.randomBytes (synchronous version)
- crypto.randomFillSync
- crypto.pbkdf2Sync
- You should also be careful about providing large input to the encryption and decryption routines.

2. Compression
- zlib.inflateSync
- zlib.deflateSync

3. File system:
- Do not use the synchronous file system APIs. For example, if the file you access is in a distributed file system like NFS, access times can vary widely.

4. Child process:
- child_process.spawnSync
- child_process.execSync
- child_process.execFileSync

5. JSON.parse, JSON.stringify
```

### UV_THREADPOOL_SIZE(default=4) 증가로 인한 성능 향상?

(node 쓰레드풀의 사이즈를 확장해서 성능 튜닝을 할수 있는 레퍼런스들에 대한 생각 - [관련 링크](https://dev.to/johnjardincodes/increase-node-js-performance-with-libuv-thread-pool-5h10))

- thread_pool을 늘렸다고 해서 db io 작업들은 os kernel에서 처리하기 때문에 효과가 없다
- cpu 집약적인 처리의 성능을 높이기이해 pool size를 늘렸다고 해서 성능 향상을 크게 기대하기 어렵다. 
- thread 개수가 늘어난 대신 전체적인 thread 성능을 떨어진다.


## 스터디 책 내용 정리

### Node.js 철학
**작은 외부 인터페이스**

- Node.js의 모듈은 명확하게 사용될수 있도록 오용되지 않도록 작은 사이즈, 범위, 최소한의 기능을 노출시킨다.
- Node.js의 모듈이 정의하는 가장 일반적인 패턴은 단일 진입점을 제공하기 위해 단 하나의 함수나 클래스를 노출시킨다.
- Node.js의 모듈은 확장보다는 사용되기 위해 만들어졌다.
  - 확장의 가능성을 제한해 덜 유연하다고 볼순 있지만 유스케이스를 줄이고, 구현을 단순화, 유지관리를 용이하게 한다는 이점을 가진다.
- Node.js의 모듈은 내부를 외부에 노출시키지 않기 위해서 클래스 보다 함수를 노출시키는것을 선호한다.

### Node.js는 어떻게 작동하는가
**논 블로킹 I/O**

- 데이터의 읽기, 쓰기작업의 대기가 없이 즉시 반환하는 방식
- 실제 데이터가 반환될 때까지 루프 내에서 리소스를 적극적으로 polling (= busy-waiting) 
- 서로 다른 리소스를 같은 쓰레드에 처리할 수는 있지만 비효율적인 CPU 낭비를 초래

**이벤트 디멀티플렉싱**

- 디멀티플랙싱이란 신호가 원래의 구성요소로 다시 분할되는 작업을 뜻한다.
- 이벤트 디멀티플렉서의 작동 방식
```
watchedList.add(docketA, FOR_READ); 
watchedList.add(fileB, FOR_READ);

// 동기식으로 관찰되는 리소스들중에 읽을 준비가 된 리소스가 있을때까지 블로킹 처리
// 준비된 리소스가 생기면, 이벤트 디멀티 플렉서는 처리를 위한 새로운 이벤트 세트를 반환
while(events = demultiplexer.watch(watchedList)) { 
  
  // 이벤트 루프
  // 디멀티 플렉서에서 반환된 각 이벤트를 처리
  // 모든 이벤트가 처리되면 디멀티플렉서가 처리가능한 이벤트를 반환하기 전까지 블로킹
  for (event of events) { 
    // 이벤트와 관련된 리소스는 블로킹 하지 않으며 항상 데이터를 반환
    data = event.resource.read();
    if (data === RESOURCE_CLOSED) {
      // 리소스가 닫히고 관찰되는 리스트에서 삭제
      demultiplexer.unwatch(event.resource);
    } else {
      // 실제 데이터를 받으면 처리
      consumeData(data);
    }
  }
}

```
- 이벤트 디멀티플렉서가 watch -> 이벤트를 이벤트 루프에게 전달 -> 이벤트 루프가 이벤트 큐에서 각 이벤트를 처리하고 각 이벤트에 연결된 핸들러를 호출 -> 이벤트가 전부 처리되면 이벤트 디멀티플렉서가 이벤트를 줄때까지 대기

**리엑터 패턴**

- 여기서 리엑터는 무한 반복문을 실행해 이벤트가 발생할 때까지 대기하다가 이벤트가 발생하면 처리할 수 있는 핸들러에게 디스패치하는 것으로 이벤트 루프를 뜻한다.
- Node.js는 콜백 함수라는 이벤트를 받아 로직을 처리하는 이벤트 핸들러를 사용한다.
- 리액터 패턴 작동 방식
1. 애플리케이션이 이벤트 디멀티플렉서에게 요청 전달하여 새로운 I/O 작업 생성
   - 이 요청 안에는 작업이 완료되었을때 호출될 핸들러를 명시
   - 요청을 이벤트 디멀티플렉서에게 전달한 후에 제어권은 다시 애플리케이션에서 가짐
2. I/O 작업이 완료 되면 이벤트 디멀티플렉서는 이벤트를 생성하여 이벤트 큐에 저장
3. 이벤트 루프는 순회하면서 이벤트 큐에서 이벤트에 해당하는 핸들러를 호출
   - 핸들러의 실행이 완료되면 다시 제어권을 이벤트에게 넘겨줌.
   - 핸들러 실행중에 다른 비동기 작업을 요청했을시 이벤트 디멀티플렉서에게 요청 전달
4. 이벤트 큐의 모든 항목이 처리되어지면 이벤트 디멀티플렉서가 이벤트를 줄때까지 대기

### CommonJS 모듈
- require는 로컬 파일 시스템으로부터 모듈을 임포트해준다.
- exports와 module.exports는 특별한 변수로서 현재 모듈에서 공개될 기능들을 내보내기 위해서 사용된다.

**module.exports 대 exports**

- exports 객체에 속성이나 메서드를 추가하려는 경우 exports 사용 
- 전체 exports 객체를 함수나 객체와 같은 단일 값으로 바꾸려는 경우 module.exports 사용 
- 둘중 특정 사용 사례와 코딩 스타일에 따라 선택

**require 함수는 동기적이다.**

- require 함수는 모듈을 로드할 때까지 대기(동기식)한다.
- Node.js의 핵심 라이브러리가 비동기 방식에 대한 대안을 동기식 API를 제공하는 이유중 하나

### ESM: ECMAScript 모듈

- ECMAScript 2015(ES6)에서 도입된 모듈 시스템
- 순환 종속성에 대한 지원과 비동기적으로 모듈을 로드 가능
- CommonJS 와 달리 ES 모듈은 static 하다.
```js
// esm
if (condition) {
    import {foo} from 'foo';
} else {
    import {bar} from 'bar';
}
```
```js
// commonjs
let module = null;

if (condition) {
    module = require('foo');
} else {
    module = require('bar');
}
```

**Node.js에서 ESM의 사용**
- ESM 모듈 사용 방법
  - 모듈 파일의 확장자를 .mjs로 지정
  - package.json 파일에 type 필드에 'module'값을 설정
- ESM 에서는 import할때 파일의 확장자를 구체적으로 명시해줘야 한다. (commonjs는 생략 가능)


