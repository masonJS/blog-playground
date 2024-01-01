## node16

### node16 url.parse() 보안 취약점
[관련 기술블로그](https://toss.tech/article/nodejs-security-contribution)

### 2023-09 부터 node 16 버전 이하 지원 종료
[공식 문서](https://nodejs.org/en/blog/announcements/nodejs16-eol)에 따르면 2023-09 부터 node 16 버전 이하 지원 종료 예정이라고 합니다.

## node18
변경사항        
- `node:fetch` http client 내장 모듈
- `node:test` test runner 내장 모듈

### node18 버전에서 axios 로 https 요청시 에러
- [관련 이슈](https://dev.to/johnnyreilly/nodejs-18-axios-and-unsafe-legacy-renegotiation-disabled-18ki)
```
에러는 "write EPROTO C0474B4C317F0000:error:0A000152:SSL routines:final_renegotiate:unsafe legacy renegotiation disabled:" 가 나오고 로컬에서도 재현되네요.      
관련 에러로 검색해보니 node 18 버전에서 보안을 위해 legacy ssl 통신을 막아두어서 발생했고 node 16으로 다운그레이드 해서 해결했다고 하네요.       
다른 답변에서는 axios 내부적으로 사용하는 httpsAgent를 legacy 연결을 허용하게 만드는 방법이 있다고 하는데 테스트가 필요할거 같아요
```

### node18 버전 jest 메모리 누수 이슈
- [관련 이슈](https://github.com/facebook/jest/issues/11956)
```
현재 jest에서는 node 16.11이상 버전부터는 메모리릭 이슈가 있습니다.              
그래서 테스트가 많아질수록 점점 성능 저하가 발생하는 이슈가 있어서 위 이슈건도 확인해보면 node 18로 올리지 않고 16.10으로 다운그레이드 해서 사용하는 답변들이 많습니다.        
```

## node20

### node20 성능 개선 사항
- [관련 이슈](https://blog.rafaelgss.dev/state-of-nodejs-performance-2023)
```
nodeJS TSC(기술 운영 위원회) 맴버 한분에 nodejs v16, 18, 20 버전별 성능 분석한 내용이 있어서 공유 드립니다
파일 시스템, 모듈, http, streams, url, buffer 등으로 나누어 성능 향상에 대해서 비교를 해본 글인데요.
버전에 올라갈수록 개략적으로 성능이 향상되었지만 대체적으로 눈에 띄는건

http - HTTP server + parser
module - require , module.require

두 파트에서는 버전을 올리면 올릴수록 성능 향상을 기대할수 있는 부분이라
node.js 최적화를 위해 버전 업데이트를 고려해봐도 좋을꺼같네요.

또하나 url부분은 이전에 url.parse 취약점이 난 이후부터 20 버전에는 WHATWG URL API를 공식적으로 지원해주는걸 확인할수 잇습니당

추가적으로 흥미로운 실험으로
string 타입을 number 타입으로 파싱하는 + or parseInt(x, 10) 이 두 방법에 대해선 v20 버전전까지는 + 가 parseInt(x, 10) 보다 훨씬 더 빠른 ops를 냈네요.
그리고 배열의 마지막 요소를 접근하는 at() 과 array[array.length - 1] 두 방법에 대해서는 v18 버전에서 array[array.length - 1] 방식이 훨씬 더 빠른 ops를 냈네요. 
```
