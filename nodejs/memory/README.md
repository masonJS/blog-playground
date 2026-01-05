# Memory

### JavaScript 메모리 관리

- [JavaScript의 메모리 관리](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Memory_management)

### Node.js 메모리 관리
- 메모리 구조: 힙(객체/배열/함수 저장), 스택(함수 호출/지역변수, LIFO, 작고 빠름).

- 힙 세대관리: New Space(단명 객체, 잦은 마이너 GC) → Old Space(장수 객체, 드문/무거운 GC).

- 위험 신호: Old Space 증가·가득참 → OOM/응답 지연; 깊은 재귀 → 스택 오버플로.

- 모니터링: process.memoryUsage()로 rss/heapTotal/heapUsed/external/arrayBuffers 추적; heapUsed 지속 증가 시 누수 의심.

- 힙 제한 확인: v8.getHeapStatistics().heap_size_limit로 최대 힙 크기 확인.

- 튜닝 플래그:
  - max-old-space-size: Old Space 상한 증가(세션·캐시 많은 앱에 유용). 
  - – max-semi-space-size: New Space 확대(마이너 GC 빈도 감소, 고처리량 API에 유리). 
  - –gc-interval: GC 간격 조정(과도하면 성능 저하). 
  - –expose-gc: 수동 GC 트리거(대량 처리 직후 회수).

- [Understanding and Tuning Memory](https://nodejs.org/en/learn/diagnostics/memory/understanding-and-tuning-memory#understanding-and-tuning-memory)


### Node.js 20+ memory management in containers
- 컨테이너 인식: Node.js(12+부터, 특히 20)는 cgroups 제한을 감지해 V8 힙 최대치를 자동 조정.

- 기본 힙 규칙: 컨테이너 메모리의 약 50%를 힙으로 사용(최대 4 Gi까지), 이후 기본 상한은 2 Gi.

- 수동 설정: –max-old-space-size로 기본값을 덮어써 컨테이너 크기와 상관없이 힙 상한을 지정 가능.

- 한계와 오류: 힙만 키우면 누수는 해결되지 않음; 근본 문제 있으면 OOM은 지연될 뿐 결국 발생.

- 스레드/CPU: JS는 단일 스레드; 병렬화는 worker_threads로. CPU보다 워커 수가 과도하면 컨텍스트 스위칭 오버헤드로 역효과.

- 모니터링/디버깅: –trace-gc, –expose-gc, 힙 스냅샷으로 메모리 핫스팟 파악. 일부 출력은 노드(호스트) 통계일 수 있음.

- 운영 팁: 자원 한/두 배로 조정해 재현·조사, 불필요한 배열·객체는 null 처리해 GC 회수 가능하게 유지.

- QoS/제한: 컨테이너는 limits 기준으로 OOM Killer가 적용되며, Kubernetes QoS(Guaranteed/Burstable/Best Effort) 규칙을 따름.

- [Node.js 20+ memory management in containers](https://developers.redhat.com/articles/2025/10/10/nodejs-20-memory-management-containers#)

### Node.js memory management in container environments

- [Node.js memory management in container environments](https://developer.ibm.com/articles/nodejs-memory-management-in-container-environments/)



### Allocation failed — process out of memory
- Node.js 메모리 부족으로 인해 발생하는 이슈
- Node.js 버전별로 기본 heap 메모리 사이즈가 다르다.
```
Node.js Version   Limit
----------------- -------
20.x             4.0 GB
19.x             4.0 GB
18.x             4.0 GB
17.x             4.0 GB
16.x             4.0 GB
15.x             4.0 GB  
14.x             4.0 GB  
13.x             2.0 GB  
12.x             2.0 GB  
11.x             1.4 GB  
10.x             1.4 GB  
9.x              1.4 GB.
```
- [참고글](https://medium.com/geekculture/node-js-default-memory-settings-3c0fe8a9ba1)
- heap 메모리 사이즈를 확인하는 방법
```bash
$ node

> v8.getHeapStatistics()
{
  ....
  heap_size_limit: ,
}
```
- heap 메모리 사이즈를 늘리는 방법
```bash
NODE_OPTIONS=--max_old_space_size=xxx 
```

- [참고글](https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js)
