# Dart Dio GET 요청 시 Transfer-Encoding: chunked 헤더로 인한 서버 Hang 이슈

## 개요

모바일 앱(Flutter)에서 Dart의 HTTP 클라이언트 라이브러리인 **Dio**를 사용하여 GET 요청을 보낼 때, 서버(NestJS)에서 응답이 오지 않고 **socket timeout**이 발생하는 문제를 경험했다.

원인은 Dio가 GET 요청임에도 `Transfer-Encoding: chunked` 헤더를 함께 전송하면서, 서버 측 **body-parser**가 body payload를 기다리며 hang이 걸리는 것이었다.

## 환경

- **Client**: Flutter + Dio
- **Server**: NestJS (내부적으로 Express의 body-parser 미들웨어 사용)
- **Protocol**: HTTP/2

## 증상

1. 모바일 앱에서 특정 GET API 호출 시 응답이 돌아오지 않음
2. 서버 로그에는 요청이 도달한 흔적이 있으나, 응답 처리가 완료되지 않음
3. 일정 시간이 지난 후 `request.aborted` 에러와 함께 socket timeout 발생

## 원인 분석

### 1. Dio가 GET 요청에 Transfer-Encoding: chunked 헤더를 전송

Dio 클라이언트가 GET 요청을 보낼 때, body가 없는 요청임에도 불구하고 `Transfer-Encoding: chunked` 헤더를 포함하여 전송하고 있었다.

### 2. HTTP/2에서 Transfer-Encoding은 금지된 헤더

[RFC 9113 Section 8.2.2](https://httpwg.org/specs/rfc9113.html#rfc.section.8.2.2)에 따르면, HTTP/2에서는 아래의 **connection-specific 헤더**들이 금지되어 있다.

- `Connection`
- `Proxy-Connection`
- `Keep-Alive`
- `Transfer-Encoding`
- `Upgrade`

HTTP/1.1에서는 `Transfer-Encoding: chunked`를 통해 body를 분할 전송했지만, HTTP/2는 자체적인 **binary framing** 메커니즘을 통해 데이터를 스트리밍하기 때문에 `Transfer-Encoding` 헤더가 불필요하다. 따라서 HTTP/2 스펙에서는 이 헤더를 포함한 요청을 **malformed**로 처리하도록 규정하고 있다.

그러나 실제로는 모든 서버/프록시가 이를 엄격히 reject하지 않고, 헤더가 그대로 서버 애플리케이션 레이어까지 전달되는 경우가 있다.

### 3. body-parser의 hasBody 판단 로직

NestJS는 내부적으로 Express를 사용하며, Express의 body-parser는 요청에 body가 있는지 판단하기 위해 [`type-is`](https://github.com/jshttp/type-is) 패키지의 `hasBody` 함수를 호출한다.

```javascript
/**
 * Check if a request has a request body.
 * A request with a body __must__ either have `transfer-encoding`
 * or `content-length` headers set.
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
 */
function hasbody (req) {
  return req.headers['transfer-encoding'] !== undefined ||
    !isNaN(req.headers['content-length'])
}
```

이 함수는 `transfer-encoding` 헤더가 존재하기만 하면 body가 있다고 판단한다. 실제 body 데이터의 유무와 관계없이 **헤더의 존재 자체**만으로 `true`를 반환하는 것이다.

### 4. Hang 발생 메커니즘

전체 흐름을 정리하면 다음과 같다:

```
[Flutter/Dio Client]
    │
    │  GET /api/some-endpoint
    │  Headers: { Transfer-Encoding: chunked, ... }
    │  Body: (없음)
    │
    ▼
[NestJS Server]
    │
    ▼
[body-parser middleware]
    │
    │  hasBody(req) → transfer-encoding 헤더 존재 → true 반환
    │  → body를 읽기 위해 request stream 대기 시작
    │  → 실제 body 데이터가 전송되지 않으므로 stream이 끝나지 않음
    │  → Hang 발생
    │
    ▼
[Socket Timeout]
    │
    │  설정된 timeout 시간 초과
    │  → request.aborted 에러 발생
    │
    ▼
[연결 종료]
```

body-parser가 request stream에서 body 데이터를 읽으려 하지만, 실제로는 전송된 body가 없기 때문에 stream의 `end` 이벤트가 발생하지 않고, 결국 socket timeout까지 무한 대기하게 된다.

## 해결 방법

클라이언트(Dio) 측에서 GET 요청 시 `Transfer-Encoding` 헤더를 명시적으로 제거하여 해결했다.

```dart
// Dio Interceptor를 통한 Transfer-Encoding 헤더 제거
class HeaderCleanupInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.method == 'GET') {
      options.headers.remove('Transfer-Encoding');
      options.headers.remove('transfer-encoding');
    }
    handler.next(options);
  }
}

// Dio 인스턴스에 Interceptor 추가
final dio = Dio();
dio.interceptors.add(HeaderCleanupInterceptor());
```

## 정리

| 구분 | 내용 |
|---|---|
| **문제** | GET 요청에 `Transfer-Encoding: chunked` 헤더가 포함되어 서버 hang 발생 |
| **근본 원인** | Dio가 불필요한 connection-specific 헤더를 전송 |
| **영향** | body-parser가 존재하지 않는 body를 무한 대기 → socket timeout |
| **해결** | Dio Interceptor에서 GET 요청 시 해당 헤더 제거 |

### 교훈

- HTTP/2 환경에서는 HTTP/1.1의 connection-specific 헤더(`Transfer-Encoding`, `Keep-Alive` 등)가 **유효하지 않다**는 점을 인지해야 한다.
- body-parser의 `hasBody` 판단은 **헤더 기반**이므로, 잘못된 헤더 하나가 전체 요청 처리를 중단시킬 수 있다.
- 클라이언트 라이브러리가 자동으로 추가하는 헤더를 주기적으로 점검할 필요가 있다. 특히 프로토콜이 변경(HTTP/1.1 → HTTP/2)되는 환경에서는 더욱 주의가 필요하다.

## 참고

- [RFC 9113 - HTTP/2 Section 8.2.2 (Connection-Specific Header Fields)](https://httpwg.org/specs/rfc9113.html#rfc.section.8.2.2)
- [type-is - npm (hasBody 함수)](https://github.com/jshttp/type-is)
- [Dio - Dart HTTP Client](https://pub.dev/packages/dio)
