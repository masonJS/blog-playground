[FEConf 2023 [B2] SSR 환경(Node.js) 메모리 누수 디버깅 가이드](https://www.youtube.com/watch?v=P3C7fzMqIYg)

발단
- OOM - out of memory 발생 이슈로 인해 발표 선정

발표 내용 
- 메모리 누수로 인해 
  - 메모리 부족으로 성능 악화 
  - GC 활동으로 인한 CPU 사용량 증가 → 이벤트 루프 잦은 블록킹 
  - Node 서버가 죽음
- 메모리 누수 발생 
  - `Allocation failed - JavaScript heap out of memory`
- 해결 방법 
  - 힙 메모리를 늘려주거나, 메모리 누수 원인 파악 및 해결 
- 모니터링은 어떻게? 
  - SSR(Node.js)
    - 다양한 모니터링 툴 붙이기 쉬움(데이터독 등)
  - 클라이언트(크롬)
    - 🤔
    그러나 방법은 동일
- V8 GC 동작 방식 
  - Mark And Sweep 
    - root를 기준으로 참조하고 있는 객체는 mark (heap 메모리에 유지), 참조하고 있지 않은 객체는 sweep 
  - Young Generation | Old Generation 
    - Young Generation → --max-semi-space-size * 3 
      - Minor GC 주기적으로 돈다 
    - Old Generation → --max-old-space-size 
      - Young Generation 영역에서 Minor GC에 살아남은 메모리가 넘어오는 영역 
      - 최종적으로 heap 영역에 많은 메모리가 존재하는 경우 OOM 발생
- 힙 메모리 영역을 늘려주는 방법 
  - --max-old-space-size = {{메모리사이즈값}} 
- 메모리 누수를 일으키는 요인 
  - 전역 변수 
  - 클로저 
  - 해제되지 않은 타이머(clearTimeout)
- 디버깅 
  - `node --inspect index.js`
  - DevTools - memory 탭 
    - [메모리 문제 해결  |  DevTools  |  Chrome for Developers](https://developer.chrome.com/docs/devtools/memory-problems?hl=ko) 
    - shallow size 
      - 오브젝트 자신의 크기 
    - retained size 
      - 나 자신 + 참조하고 있는 오브젝트들의 크기 
    - shallow size 에 비해서  retained size가 상대적은 큰 영역이 메모리 누수의 범인
- using 키워드를 사용해서 [메모리 누수 해결](https://www.youtube.com/watch?v=P3C7fzMqIYg&t=2230s)
- 참고 
  - [자바스크립트 v8 엔진의 가비지 컬렉션 동작 방식 | 카카오엔터테인먼트 FE 기술블로그](https://fe-developers.kakaoent.com/2022/220519-garbage-collection/) 
  - [V8 엔진(자바스크립트, NodeJS, Deno, WebAssembly) 내부의 메모리 관리 시각화하기](https://ui.toast.com/weekly-pick/ko_20200228) 
  - [당신이 모르는 자바스크립트의 메모리 누수의 비밀](https://ui.toast.com/weekly-pick/ko_20210611) 
