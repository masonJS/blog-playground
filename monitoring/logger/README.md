# 우리는 왜 console.log 대신 logger 라이브러리를 사용해야될까?

## 1. 로그 레벨 관리

- 다양한 로그 레벨(예: error, warn, info, verbose, debug, silly)을 제공
- 로그의 중요도에 따라 적절히 분류하고 필터링
- 개발 환경(local, development, production)에 따라 특정 수준의 로그만을 쉽게 검토하거나 무시할 수 있게 함

```javascript
// console.log - 모든 로그가 동일한 레벨로 출력됨
console.log('서버 시작됨');
console.log('DB 연결 실패!');
console.log('유저 요청 처리 중...');

// logger - 레벨별로 분류하여 필터링 가능
logger.info('서버 시작됨');
logger.error('DB 연결 실패!');
logger.debug('유저 요청 처리 중...');
```

### 환경별 로그 레벨 설정 예시

| 환경 | 로그 레벨 | 출력되는 로그 |
|------|----------|-------------|
| local | debug | error, warn, info, verbose, debug |
| development | info | error, warn, info |
| production | warn | error, warn |

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
});
```

## 2. 로그의 유연한 출력

파일 시스템, 원격 서버, 콘솔 등 다양한 `transports`를 통해 로그를 저장하거나 전송할 수 있다.

```javascript
const logger = winston.createLogger({
  transports: [
    // 콘솔 출력
    new winston.transports.Console(),

    // 파일 저장
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),

    // 원격 전송 (예: Elasticsearch)
    new WinstonElasticsearch({ index: 'app-logs' }),
  ],
});
```

## 3. 로그 포맷 커스터마이징

JSON 형식, 단순 문자열, 혹은 어떤 특정한 형식을 따르도록 로그를 구성할 수 있다.

```javascript
// console.log 출력
// DB 연결 실패!

// logger 출력 (타임스탬프 + JSON 포맷)
// {"timestamp":"2024-01-15T09:30:00.000Z","level":"error","message":"DB 연결 실패!","service":"api-server"}
```

```javascript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
});
```

## 4. 성능 최적화

`winston`과 같은 로깅 라이브러리를 사용하면 비동기적으로 로그를 처리하고, 불필요한 로그 레벨의 메시지를 효율적으로 필터링함으로써 시스템 자원을 절약한다.

```javascript
// console.log - 동기적으로 stdout에 직접 출력 (I/O 블로킹 발생 가능)
console.log(JSON.stringify(largeObject));

// logger - 비동기적으로 버퍼링하여 처리
logger.info('대용량 데이터 처리 완료', { metadata: largeObject });
```

## 5. 로깅 라이브러리 비교

Node.js 생태계에서 주로 사용되는 로깅 라이브러리를 비교한다.

| 항목 | winston | pino | bunyan |
|------|---------|------|--------|
| 성능 | 보통 | 매우 빠름 | 보통 |
| JSON 기본 출력 | 설정 필요 | 기본 지원 | 기본 지원 |
| 커스텀 포맷 | 매우 유연함 | 제한적 | 제한적 |
| transport 생태계 | 풍부함 | 보통 | 보통 |
| 커뮤니티/문서 | 매우 활발 | 활발 | 유지보수 모드 |
| 적합한 상황 | 범용, 유연한 설정 필요 시 | 고성능 필요 시 | CLI 도구 기반 로그 분석 시 |

> winston은 유연한 설정과 풍부한 transport 생태계 덕분에 범용적으로 가장 많이 채택되고 있다.
> 고성능이 최우선인 경우 pino를 고려할 수 있다.

## 6. 구조화된 로깅 (Structured Logging)

단순 문자열 대신 구조화된 데이터로 로그를 남기면 검색, 필터링, 모니터링 시스템 연동이 쉬워진다.

```javascript
// 비구조화 로깅 - 파싱하기 어렵고 검색이 불편함
logger.info('유저 minwoo가 주문 12345를 생성함');

// 구조화 로깅 - 필드별 검색/필터링 가능
logger.info('주문 생성', {
  userId: 'minwoo',
  orderId: '12345',
  action: 'CREATE_ORDER',
});
```

### correlation ID를 활용한 요청 추적

MSA 환경에서는 하나의 요청이 여러 서비스를 거치게 된다. correlation ID(또는 request ID)를 로그에 포함하면 요청 흐름을 추적할 수 있다.

```javascript
// 미들웨어에서 요청마다 고유 ID 부여
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuid();
  next();
});

// 로그에 correlation ID 포함
logger.info('주문 처리 시작', {
  correlationId: req.correlationId,
  orderId: '12345',
});

// 다른 서비스에서도 동일한 correlationId로 로그를 남기면
// 하나의 요청 흐름을 전체적으로 추적할 수 있음
```

## 7. 로그 관리 및 운영

### 로그 로테이션

로그 파일이 무한히 커지는 것을 방지하기 위해 로테이션 정책을 설정한다.

```javascript
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',       // 파일당 최대 20MB
      maxFiles: '14d',      // 14일간 보관 후 자동 삭제
    }),
  ],
});
```

### 로그 보존 정책 가이드

| 로그 종류 | 보존 기간 | 근거 |
|----------|----------|------|
| error 로그 | 90일 이상 | 장애 분석, 감사 추적 |
| info 로그 | 30일 | 일반적인 운영 모니터링 |
| debug 로그 | 7일 | 디버깅 용도, 용량이 크므로 짧게 유지 |

### 모니터링 시스템 연동

로그를 중앙 집중식 시스템으로 수집하면 검색, 시각화, 알림 설정이 가능하다.

| 시스템 | 특징 |
|--------|------|
| ELK (Elasticsearch + Logstash + Kibana) | 오픈소스, 강력한 검색/시각화 |
| Datadog | SaaS 기반, APM/인프라 모니터링 통합 |
| AWS CloudWatch | AWS 환경에 최적화, 서버리스 연동 용이 |
| Grafana Loki | 경량, Grafana와 통합 |

## 8. 보안 주의사항

로그에 민감 정보가 포함되면 보안 사고로 이어질 수 있다.

### 로그에 절대 남기면 안 되는 정보

- 비밀번호, API 키, 시크릿 토큰
- 주민등록번호, 카드번호 등 개인정보
- 세션 ID, JWT 토큰 전문

```javascript
// 잘못된 예시
logger.info('로그인 시도', { username: 'minwoo', password: 'secret123' });

// 올바른 예시
logger.info('로그인 시도', { username: 'minwoo' });
```

### 로그 마스킹 처리

민감 정보가 실수로 포함되는 것을 방지하기 위해 마스킹 포맷을 적용할 수 있다.

```javascript
const maskSensitiveData = winston.format((info) => {
  if (info.password) {
    info.password = '****';
  }
  if (info.token) {
    info.token = info.token.substring(0, 6) + '****';
  }
  return info;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    maskSensitiveData(),
    winston.format.json(),
  ),
});
```