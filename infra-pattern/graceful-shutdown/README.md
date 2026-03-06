# Graceful Shutdown

## Graceful Shutdown이란?

Graceful Shutdown은 애플리케이션이 종료 신호를 받았을 때 즉시 프로세스를 중단하지 않고, **진행 중인 작업을 안전하게 마무리한 뒤 자원을 정리하고 종료하는 방식**이다.

프로덕션 환경에서는 배포, 스케일 인, 장애 복구 등 다양한 이유로 애플리케이션이 종료되는 상황이 빈번하게 발생한다. 이때 Graceful Shutdown이 구현되어 있지 않으면 사용자 요청 손실, 데이터 불일치, 자원 누수 같은 문제가 발생할 수 있다. 따라서 안정적인 서비스 운영을 위해 Graceful Shutdown은 필수 요구 사항이다.

---

## 비정상 종료로 인한 문제점

- 데이터 손실 및 손상
:   진행 중인 데이터가 저장되지 않아 데이터 손상이나 불일치가 발생할 수 있다. 이는 엔드포인트 손상 , 파일 시스템 손상 , 데이터베이스의 신뢰할 수 없는 파티션  등으로 나타날 수 있다.

- 자원 누수
: 열린 파일 핸들, 데이터베이스 연결 및 기타 자원이 제대로 해제되지 않아 자원 고갈 또는 고아 연결(orphaned connections)로 이어질 수 있다

- 서비스 가용성 저하
: 분산 시스템에서 갑작스러운 종료는 요청 실패, 서비스 비가용성 및 사용자 경험 방해로 이어질 수 있다. 클라이언트는 "503 Service Unavailable" 또는 연결 오류를 경험할 수 있다.

---

## 종료 신호 (Termination Signals)

운영 체제는 프로세스에 종료를 알리기 위해 시그널을 전송한다. Graceful Shutdown을 구현하려면 각 시그널의 의미와 차이를 정확히 이해해야 한다.

| 시그널 | 번호 | 의미 | 발생 상황 | 처리 가능 여부 |
|--------|------|------|-----------|---------------|
| `SIGTERM` | 15 | 정상 종료 요청 | `kill` 명령 기본값, Kubernetes Pod 종료, Docker `stop`, ECS 작업 중지 | **가능** - 핸들러를 등록하여 정리 작업 수행 |
| `SIGINT` | 2 | 인터럽트 (키보드 중단) | 사용자가 `Ctrl+C` 입력, 개발 환경에서의 수동 종료 | **가능** - SIGTERM과 동일하게 처리 권장 |
| `SIGKILL` | 9 | 강제 즉시 종료 | `kill -9`, SIGTERM 유예 기간 초과 시 시스템이 전송 | **불가능** - 프로세스가 가로챌 수 없음 |

- `SIGTERM`은 프로세스에 "곧 종료하겠다"는 사전 통보이다. 애플리케이션은 이 신호를 받으면 정리 작업을 시작해야 한다.
- `SIGKILL`은 최후의 수단이다. 프로세스가 SIGTERM에 응답하지 않으면 시스템이 강제로 종료한다. 이 시그널은 애플리케이션이 처리할 수 없으므로, 반드시 SIGTERM 단계에서 종료를 완료해야 한다.

---

## Graceful Shutdown 전체 흐름

```
  시스템/오케스트레이터                애플리케이션                  로드밸런서
        │                              │                           │
        │  1. SIGTERM 전송              │                           │
        │─────────────────────────────▶│                           │
        │                              │  2. 헬스체크 실패 응답      │
        │                              │  (/health → 503)          │
        │                              │──────────────────────────▶│
        │                              │                           │  3. 대상 제외
        │                              │                           │  (신규 요청 차단)
        │                              │                           │
        │                              │  4. 진행 중인 요청 완료 대기 │
        │                              │  (...처리 중...)            │
        │                              │                           │
        │                              │  5. 자원 해제              │
        │                              │  - DB 연결 종료            │
        │                              │  - 파일 핸들 닫기          │
        │                              │  - 로그/메트릭 플러시      │
        │                              │                           │
        │                              │  6. 프로세스 종료 (exit 0) │
        │                              │◀─────────────────────────│
        │                              │                           │
        │  유예 기간 초과 시             │                           │
        │  SIGKILL 전송 (강제 종료)      │                           │
        │─────────────────────────────▶│                           │
```

---

## Graceful Shutdown 구현 단계

### 1. 종료 신호 감지 (SIGTERM, SIGINT)
- 애플리케이션은 시스템 수준의 종료 신호(termination signals)를 감지하고 올바르게 처리하도록 설계되어야 한다.
- `SIGTERM`에 응답하여 정상 종료 시퀀스를 시작할 것을 기대한다. 만약 애플리케이션이 주어진 시간 내에 그렇게 하지 못하면, 계약이 파기되고 시스템은 시스템 안정성을 유지하기 위해 `SIGKILL`을 사용하여 종료를 강제한다. 이는 애플리케이션이 단순히 신호를 감지하는 것을 넘어, 적시에 예측 가능한 방식으로 신호에 대응해야 함을 의미한다. 따라서 개발자는 프로덕션 시스템에서 SIGTERM 처리를 필수 요구 사항으로 간주해야 하며, 애플리케이션이 유예 기간 내에 응답하지 않으면 운영 체제가 종료를 강제할 것임을 이해해야 한다.

### 2. 신규 요청 중단
- 종료 신호를 수신하면 서비스는 즉시 새로운 인바운드 트래픽 또는 요청 수신을 중단해야 한다. 이는 종종 로드 밸런서에서 등록을 해제하거나 네트워크 리스너를 닫는 것을 포함한다.

### 3. 진행 중인 작업 완료
- 애플리케이션은 진행 중인 모든 요청, 트랜잭션 및 백그라운드 작업이 정상적으로 완료되도록 허용해야 한다. 여기에는 데이터베이스 트랜잭션, 큐에서 메시지 처리, 장기 실행 백그라운드 작업이 포함된다.

### 4. 자원 해제 및 정리
- 애플리케이션이 종료되기 전에 모든 중요한 자원이 제대로 해제되어야 한다. 여기에는 다음이 포함된다:
  - 데이터베이스 연결 및 연결 풀 닫기.
  - 열린 파일 핸들 및 네트워크 소켓 닫기.
  - 로그 및 메트릭 플러시.
  - 임시 파일 또는 상태 정리

---

## 구현 코드 예시 (Node.js / Express)

```js
const express = require('express');
const app = express();

// 데이터베이스 연결 (예시)
const db = require('./db');

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

// 헬스체크 상태 플래그
let isShuttingDown = false;

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  res.json({ status: 'ok' });
});

// Graceful Shutdown 핸들러
function gracefulShutdown(signal) {
  console.log(`${signal} received. Starting graceful shutdown...`);

  // 1. 헬스체크 실패 → 로드밸런서가 신규 트래픽 차단
  isShuttingDown = true;

  // 2. 강제 종료 타이머 설정 (유예 기간 초과 대비)
  const forceShutdownTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 25_000); // SIGKILL 전 여유를 두고 설정

  // 타이머가 프로세스 종료를 막지 않도록 설정
  forceShutdownTimer.unref();

  // 3. 새로운 연결 수신 중단 + 기존 요청 완료 대기
  server.close(async () => {
    console.log('All pending requests completed.');

    try {
      // 4. 자원 해제
      await db.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error during cleanup:', err);
    }

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });
}

// 종료 신호 등록
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 인프라 환경별 설정

각 인프라 환경은 SIGTERM 전송 후 SIGKILL까지의 유예 기간을 설정하는 고유한 방법을 제공한다. 애플리케이션의 종료 로직이 이 유예 기간 내에 완료되도록 설정해야 한다.

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
spec:
  terminationGracePeriodSeconds: 60  # SIGTERM → SIGKILL 유예 기간 (기본값: 30초)
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 5"]
            # preStop hook: 로드밸런서가 Pod를 제외할 시간을 확보
            # SIGTERM은 preStop 완료 후 전송됨
```

- `terminationGracePeriodSeconds`: SIGTERM 전송 후 SIGKILL까지 대기하는 시간. preStop hook 실행 시간도 포함된다.
- `preStop` hook: SIGTERM 전송 **전에** 실행된다. 로드밸런서에서 Pod가 제외되는 시간을 벌기 위해 `sleep`을 넣는 것이 일반적인 패턴이다.

### Docker

```yaml
# docker-compose.yml
services:
  app:
    image: my-app
    stop_grace_period: 30s  # SIGTERM → SIGKILL 유예 기간 (기본값: 10초)
```

- `docker stop` 명령 시 SIGTERM을 보내고, `stop_grace_period` 이후 SIGKILL을 전송한다.
- CLI에서는 `docker stop --time 30 <container>` 으로 지정할 수 있다.

### AWS ECS

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "stopTimeout": 30
    }
  ]
}
```

- ECS는 컨테이너 작업이 중지되면 `SIGTERM`을 전송하고, `stopTimeout` 이후 `SIGKILL`을 전송한다.
- **기본값: 30초**, 최대 120초까지 설정 가능하다.
- Fargate 플랫폼 버전 1.4.0 이상에서 `stopTimeout` 설정을 지원한다.

### 로드밸런서 - Connection Draining / Deregistration Delay

로드밸런서에서 대상이 제외된 후에도 기존 연결이 즉시 끊기지 않도록 유예 기간을 설정해야 한다.

| 환경 | 설정 | 기본값 |
|------|------|--------|
| AWS ALB/NLB | Deregistration Delay | 300초 |
| Kubernetes Ingress | 구현체별 상이 (annotation 설정) | - |
| Nginx | `proxy_read_timeout`, `worker_shutdown_timeout` | 60초 |

- Deregistration Delay는 로드밸런서가 대상을 제외한 뒤, 기존 연결이 완료될 때까지 기다리는 시간이다.
- 이 값은 애플리케이션의 최대 응답 시간보다 길게 설정해야 한다.

---

## 타임아웃 전략

Graceful Shutdown의 각 단계에서 타임아웃을 적절히 설정하지 않으면, 종료가 무기한 지연되거나 SIGKILL로 강제 종료될 수 있다.

### 유예 기간 설계 가이드라인

```
|◀──────────── 인프라 유예 기간 (예: K8s 60초) ──────────────▶|
|                                                             |
|  preStop   |  앱 종료 로직       |  여유 버퍼  |  SIGKILL    |
|  (5초)     |  (최대 45초)        |  (10초)    |             |
```

1. **인프라 유예 기간**을 먼저 결정한다 (예: `terminationGracePeriodSeconds: 60`).
2. **preStop hook** 등 사전 작업 시간을 뺀다.
3. **애플리케이션 강제 종료 타이머**는 인프라 유예 기간보다 짧게 설정한다. SIGKILL 전에 애플리케이션이 스스로 정리하고 종료할 수 있도록 여유 버퍼를 확보한다.
4. **로드밸런서 Deregistration Delay**는 인프라 유예 기간보다 길거나 같게 설정하여, 종료 중인 인스턴스에 신규 요청이 전달되지 않도록 한다.

### 핵심 원칙

- `앱 강제 종료 타이머 < 인프라 유예 기간 < 로드밸런서 Deregistration Delay`
- 애플리케이션은 SIGKILL을 받기 전에 스스로 종료를 완료해야 한다. SIGKILL은 정리 작업 없이 프로세스를 즉시 중단하므로, 반드시 그 전에 모든 자원을 해제하고 종료해야 한다.
- 각 단계의 타임아웃은 실제 워크로드의 최대 처리 시간을 기준으로 설정한다. 예를 들어, 최대 요청 처리 시간이 10초라면 앱 종료 타이머는 최소 10초 이상이어야 한다.
