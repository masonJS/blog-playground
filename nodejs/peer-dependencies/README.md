# peerDependencies 개념 정리 및 이점 분석

## 1. peerDependencies란?

`peerDependencies`는 npm 패키지의 `package.json`에서 사용하는 의존성 선언 방식 중 하나로, **해당 패키지를 사용하려면 호스트 프로젝트에 특정 라이브러리가 직접 설치되어 있어야 한다**는 요구사항을 명시합니다.

일반적인 `dependencies`는 패키지가 자체적으로 의존성을 설치하지만, `peerDependencies`는 패키지를 사용하는 측(호스트 프로젝트)이 직접 설치해야 하는 의존성입니다. 주로 플러그인 구조에서 사용됩니다.

### 1.1 의존성 유형 비교

| 유형 | 설명 | 설치 주체 |
|------|------|-----------|
| `dependencies` | 패키지 실행에 필수적인 의존성 | 패키지가 자동 설치 |
| `devDependencies` | 개발/빌드 시에만 필요한 의존성 | 개발자가 직접 설치 |
| `peerDependencies` | 호스트 프로젝트에 존재해야 하는 의존성 | 호스트 프로젝트가 직접 설치 |

### 1.2 선언 예시

다음은 NestJS 생태계에서 흔히 볼 수 있는 `peerDependencies` 선언 예시입니다.

```json
// @nestjs/typeorm의 package.json
{
  "peerDependencies": {
    "@nestjs/common": "^8.0.0 || ^9.0.0 || ^10.0.0",
    "@nestjs/core": "^8.0.0 || ^9.0.0 || ^10.0.0",
    "typeorm": "^0.3.0",
    "rxjs": "^7.0.0"
  }
}
```

위 선언은 `@nestjs/typeorm`을 사용하려면 호스트 프로젝트에 `@nestjs/common` 8.x~10.x, `@nestjs/core` 8.x~10.x, `typeorm` 0.3.x 이상, `rxjs` 7.x 이상이 설치되어 있어야 한다는 의미입니다.

---

## 2. npm 버전별 동작 차이

`peerDependencies`의 처리 방식은 npm 버전에 따라 크게 달라집니다.

| npm 버전 | 동작 | 비고 |
|----------|------|------|
| npm 3 ~ 6 | 경고만 출력, 자동 설치하지 않음 | 개발자가 직접 해결해야 함 |
| npm 7+ | 자동 설치 시도, 충돌 시 에러 발생 | `--legacy-peer-deps` 플래그로 우회 가능 |

### 2.1 npm 7+ 자동 설치 동작 흐름

npm 7부터 `peerDependencies`는 기본적으로 자동 설치됩니다. 설치 시 다음과 같은 흐름으로 동작합니다:

1. 패키지의 `peerDependencies`를 확인
2. 호스트 프로젝트에 해당 패키지가 이미 설치되어 있는지 검사
3. 설치되어 있지 않으면 **자동으로 설치**
4. 이미 설치되어 있으면 **버전 호환성 검사**
5. 호환되면 기존 버전을 그대로 사용, **충돌하면 에러 발생**

### 2.2 실제 에러 메시지 예시

npm 7+에서 peer dependency 충돌이 발생하면 다음과 같은 에러가 출력됩니다:

```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: my-project@1.0.0
npm ERR! Found: react@17.0.2
npm ERR! node_modules/react
npm ERR!   react@"^17.0.2" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from some-library@2.0.0
npm ERR! node_modules/some-library
npm ERR!   some-library@"^2.0.0" from the root project
npm ERR!
npm ERR! Fix the upstream dependency conflict, or retry
npm ERR! this command with --force or --legacy-peer-deps
npm ERR! to accept an incorrect (and potentially broken) dependency resolution.
```

이 에러는 호스트 프로젝트에 `react@17.0.2`가 설치되어 있는데, `some-library`가 `react@^18.0.0`을 peer dependency로 요구하기 때문에 발생합니다.

### 2.3 yarn / pnpm 동작 차이

npm 외의 패키지 매니저에서는 `peerDependencies`를 다르게 처리합니다.

| 패키지 매니저 | 동작 | 특징 |
|--------------|------|------|
| **npm 7+** | 자동 설치, 충돌 시 에러 | `--legacy-peer-deps`로 우회 가능 |
| **yarn (Classic)** | 경고만 출력, 자동 설치하지 않음 | npm 3~6과 유사한 동작 |
| **yarn (Berry/2+)** | 경고 출력, 패키지가 peer dependency에 접근 불가 | strict 모드가 기본, `.yarnrc.yml`에서 `peerDependencyRules`로 제어 |
| **pnpm** | 경고 출력, 자동 설치하지 않음 | 가장 strict한 처리. symlink 구조 특성상 명시적 설치 필수 |

**pnpm의 strict 처리:**

pnpm은 `node_modules`를 flat하게 관리하지 않고 심볼릭 링크 기반의 격리된 구조를 사용합니다. 따라서 peer dependency가 명시적으로 설치되지 않으면 런타임에 모듈을 찾지 못하는 문제가 발생할 수 있습니다. `.npmrc`에서 다음과 같이 설정할 수 있습니다:

```ini
# .npmrc (pnpm)
auto-install-peers=true       # peer dependency 자동 설치
strict-peer-dependencies=false # peer dependency 충돌 시 에러 대신 경고
```

---

## 3. peerDependenciesMeta

npm 7+에서는 `peerDependenciesMeta`를 통해 peer dependency를 **선택적(optional)** 으로 선언할 수 있습니다. 특정 peer dependency가 없어도 패키지가 동작할 수 있는 경우에 사용합니다.

### 3.1 선언 예시

```json
{
  "peerDependencies": {
    "@nestjs/common": "^9.0.0 || ^10.0.0",
    "@nestjs/swagger": "^6.0.0 || ^7.0.0",
    "class-validator": "^0.14.0"
  },
  "peerDependenciesMeta": {
    "@nestjs/swagger": {
      "optional": true
    },
    "class-validator": {
      "optional": true
    }
  }
}
```

위 예시에서 `@nestjs/common`은 필수이지만, `@nestjs/swagger`와 `class-validator`는 선택적입니다. 호스트 프로젝트에 설치되어 있으면 해당 기능을 활성화하고, 없으면 해당 기능 없이 동작합니다.

### 3.2 사용 시기

- 패키지가 **특정 라이브러리와의 통합 기능**을 제공하지만, 핵심 기능은 그 없이도 동작하는 경우
- 예: ORM 라이브러리가 Swagger 데코레이터 지원은 optional로, validation 지원도 optional로 제공하는 경우
- optional로 선언하면 npm 7+에서 해당 패키지가 없어도 **설치 에러가 발생하지 않음**

### 3.3 런타임에서의 처리 패턴

optional peer dependency는 런타임에서 동적으로 존재 여부를 확인하는 패턴과 함께 사용됩니다:

```typescript
// optional peer dependency 존재 여부를 확인하는 패턴
let swagger: typeof import('@nestjs/swagger') | undefined;
try {
  swagger = require('@nestjs/swagger');
} catch {
  // @nestjs/swagger가 설치되어 있지 않으면 무시
}

export function ApiProperty() {
  if (swagger) {
    return swagger.ApiProperty();
  }
  // swagger가 없으면 아무것도 하지 않는 데코레이터 반환
  return () => {};
}
```

---

## 4. 충돌 해결 방법

peer dependency 충돌은 실무에서 가장 자주 마주치는 의존성 문제입니다. 상황에 맞는 적절한 해결 방법을 선택해야 합니다.

### 4.1 npm 플래그를 이용한 우회

```bash
# 방법 1: --legacy-peer-deps (권장)
# npm 3~6처럼 peer dependency를 무시하고 경고만 출력
npm install --legacy-peer-deps

# 방법 2: --force
# 충돌을 무시하고 강제로 설치 (더 공격적인 옵션)
npm install --force
```

| 플래그 | 동작 | 권장 상황 |
|--------|------|-----------|
| `--legacy-peer-deps` | peer dependency 자동 설치를 건너뜀 | 대부분의 충돌 상황에서 1차 시도 |
| `--force` | 모든 충돌을 무시하고 강제 설치 | `--legacy-peer-deps`로도 해결되지 않는 경우 |

**주의:** 두 플래그 모두 근본적인 해결이 아닌 우회 방법입니다. 호환되지 않는 버전이 설치될 수 있으므로 런타임 에러가 발생할 수 있습니다.

### 4.2 버전 오버라이드를 통한 해결

근본적인 해결이 필요한 경우, 패키지 매니저의 오버라이드 기능을 사용합니다.

**npm (`overrides`):**

```json
// package.json
{
  "overrides": {
    "some-library": {
      "react": "$react"  // 호스트 프로젝트의 react 버전을 강제 사용
    }
  }
}
```

**yarn (`resolutions`):**

```json
// package.json
{
  "resolutions": {
    "react": "^18.2.0"  // 모든 패키지에서 이 버전을 사용하도록 강제
  }
}
```

**pnpm (`pnpm.overrides`):**

```json
// package.json
{
  "pnpm": {
    "overrides": {
      "react": "^18.2.0"
    }
  }
}
```

### 4.3 해결 전략 선택 가이드

```
peer dependency 충돌 발생
│
├─ 일시적 문제 (라이브러리 업데이트 대기 등)
│  └─ --legacy-peer-deps 사용
│
├─ 버전 범위가 실제로는 호환됨 (메이저 버전은 같지만 범위가 엄격)
│  └─ overrides / resolutions로 버전 통일
│
├─ 진짜 호환되지 않는 버전
│  └─ 라이브러리 업그레이드 또는 다운그레이드 검토
│
└─ 복수의 메이저 버전이 공존해야 하는 상황
   └─ 패키지 구조 재설계 검토 (모노레포 등)
```

---

## 5. 라이브러리 개발자를 위한 가이드

### 5.1 devDependencies + peerDependencies 동시 선언

라이브러리를 개발할 때, `peerDependencies`에 선언한 패키지를 **`devDependencies`에도 함께 선언**해야 합니다. `peerDependencies`는 호스트 프로젝트가 설치하는 것이므로, 라이브러리 개발 환경에서는 자동으로 설치되지 않기 때문입니다.

```json
// my-nestjs-library/package.json
{
  "peerDependencies": {
    "@nestjs/common": "^9.0.0 || ^10.0.0",
    "@nestjs/core": "^9.0.0 || ^10.0.0",
    "rxjs": "^7.0.0"
  },
  "devDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "rxjs": "^7.8.0"
  }
}
```

| 필드 | 역할 |
|------|------|
| `peerDependencies` | 호스트 프로젝트에 "이 버전 범위가 필요하다"고 알림 |
| `devDependencies` | 라이브러리 개발/테스트 시 실제로 설치되는 버전 |

이 패턴이 없으면:
- `npm install` 후 개발 환경에서 `@nestjs/common`을 찾을 수 없어 빌드/테스트 실패
- 타입 정의를 참조할 수 없어 IDE 자동 완성이 동작하지 않음

### 5.2 peerDependencies를 사용해야 할 때 vs 하지 말아야 할 때

모든 의존성을 `peerDependencies`로 선언하면 호스트 프로젝트의 부담이 커지고, 설치 과정이 복잡해집니다. **공유되어야 하는 의존성**과 **내부 구현 의존성**을 구분하는 것이 중요합니다.

**peerDependencies를 사용해야 하는 경우:**

| 기준 | 예시 |
|------|------|
| 호스트와 **동일한 인스턴스**를 공유해야 할 때 | React, NestJS Core, rxjs |
| 호스트의 **API나 타입**에 의존할 때 | 프레임워크 플러그인, 확장 모듈 |
| **버전 선택권**을 호스트에 줘야 할 때 | 여러 메이저 버전을 지원하는 어댑터 |

**peerDependencies를 사용하지 말아야 하는 경우:**

| 기준 | 예시 |
|------|------|
| 패키지 **내부에서만** 사용하는 유틸리티 | lodash, dayjs, uuid |
| 호스트가 **알 필요 없는** 구현 세부사항 | 내부 파서, 포매터, 헬퍼 |
| **인스턴스 공유가 불필요**한 순수 함수 라이브러리 | 암호화, 해싱, 문자열 처리 |

**판단 기준 요약:** 호스트 프로젝트가 해당 패키지를 **직접 사용하거나, 동일 인스턴스를 공유해야 하면** `peerDependencies`. 패키지 내부의 **구현 세부사항이면** `dependencies`.

---

## 6. peerDependencies 선언의 이점

### 6.1 싱글 인스턴스 보장

`peerDependencies`의 가장 핵심적인 이점입니다. `dependencies`로 선언하면 각 패키지가 자체적으로 의존성을 설치하므로 동일한 라이브러리가 `node_modules` 안에 여러 카피로 존재할 수 있습니다.

NestJS의 DI 컨테이너, React의 Hooks, rxjs의 Observable 등은 `instanceof` 체크나 내부 전역 상태에 의존하기 때문에 인스턴스가 다르면 런타임에 원인 파악이 어려운 버그가 발생합니다. `peerDependencies`로 선언하면 호스트의 단일 인스턴스를 공유하므로 이 문제가 원천적으로 방지됩니다.

**문제 상황** (`dependencies`로 선언한 경우):

```
node_modules/
├── @nestjs/core@10.0.0          ← 호스트 프로젝트
├── @nestjs/typeorm/
│   └── node_modules/
│       └── @nestjs/core@10.1.0  ← 중복! 다른 인스턴스
```

**정상 상황** (`peerDependencies`로 선언한 경우):

```
node_modules/
├── @nestjs/core@10.0.0          ← 단일 인스턴스 공유
├── @nestjs/typeorm/             ← 호스트의 @nestjs/core 사용
```

좀더 구체적인 예로, JavaScript에서 `instanceof`는 객체가 특정 생성자의 프로토타입 체인에 속하는지 확인합니다. 
그런데 동일한 패키지가 두 번 설치되면 각각 별도의 클래스 정의를 가지게 됩니다. 같은 이름, 같은 코드라도 메모리상 다른 참조이기 때문에 instanceof가 false를 반환합니다.
```ts
// node_modules/@nestjs/core/index.js (버전 A)
class ModuleRef { ... }

// node_modules/@nestjs/typeorm/node_modules/@nestjs/core/index.js (버전 B)
class ModuleRef { ... }  // 코드는 같지만 다른 클래스 객체

const instance = new ModuleRefA();
instance instanceof ModuleRefB  // false!
```
**NestJS DI 컨테이너의 경우**  
NestJS의 IoC 컨테이너는 `@Injectable()`, `@Controller()` 같은 데코레이터가 `reflect-metadata`를 통해 메타데이터를 클래스에 저장하고, 런타임에 이를 읽어서 의존성을 주입합니다.
```ts
// @nestjs/common 인스턴스 A에서 데코레이터 실행
@Injectable()  // Reflect.defineMetadata(INJECTABLE_WATERMARK, true, MyService)
export class MyService {}

// @nestjs/core 인스턴스 B에서 DI 해석 시
Reflect.getMetadata(INJECTABLE_WATERMARK, MyService)  // undefined!
```
`@Injectable()`은 `@nestjs/common` 인스턴스 A의 메타데이터 키로 저장하는데, DI 컨테이너는 `@nestjs/core` 인스턴스 B의 메타데이터 키로 조회합니다.      
키가 Symbol이나 별도의 상수 참조인 경우 인스턴스가 다르면 서로 다른 값이 되어 메타데이터를 찾지 못합니다. 이것이 바로 흔히 보는 `Nest can't resolve dependencies` 에러의 숨은 원인 중 하나입니다.


### 6.2 번들 사이즈 및 node_modules 절감

중복 설치가 방지되므로 디스크 사용량과 번들 사이즈가 줄어듭니다. 예를 들어 NestJS 프로젝트에서 10개의 `@nestjs/*` 패키지가 각각 `@nestjs/core`를 `dependencies`로 가지고 있다면 최악의 경우 11개의 `@nestjs/core`가 존재할 수 있습니다. `peerDependencies`를 통해 이를 단일 카피로 유지할 수 있습니다.

### 6.3 버전 결정권을 호스트 프로젝트에 위임

라이브러리가 버전을 강제하지 않고, 호스트 프로젝트가 자신의 환경에 맞는 버전을 선택할 수 있습니다.

```json
// 라이브러리: "이 범위면 다 돼"
"peerDependencies": {
  "@nestjs/common": "^9.0.0 || ^10.0.0"
}

// 호스트 프로젝트: "난 10.x 쓸래"
"dependencies": {
  "@nestjs/common": "^10.3.0"
}
```

여러 서드파티 패키지를 동시에 사용할 때, 각각이 `dependencies`로 다른 버전을 고정해버리면 호스트 입장에서 버전 통일이 불가능해집니다. `peerDependencies`를 쓰면 호스트가 하나의 버전으로 통일할 수 있습니다.

### 6.4 호환성 범위의 명시적 문서화

`peerDependencies`는 라이브러리의 호환성 계약서 역할을 합니다. 사용자가 `package.json`만 보고도 호환성 범위를 파악할 수 있으며, npm이 호환되지 않는 조합을 설치 시점에 잡아줍니다. `dependencies`로 선언하면 이러한 호환성 정보가 드러나지 않습니다.

---

## 7. 대표적인 사용 사례

| 사용 사례 | 예시 | 이유 |
|-----------|------|------|
| 프레임워크 플러그인 | ESLint 플러그인, Babel 플러그인 | 호스트 프레임워크의 API에 의존 |
| UI 컴포넌트 라이브러리 | React/Vue 기반 컴포넌트 | 런타임 인스턴스 공유 필수 |
| NestJS 모듈 | @nestjs/typeorm, @nestjs/swagger | DI 컨테이너 싱글턴 보장 |
| 공유 유틸리티 | rxjs, reflect-metadata | instanceof 체크 및 전역 상태 공유 |

---

## 8. 핵심 요약

`peerDependencies`의 본질적인 목적은 **해당 라이브러리가 독립적으로 동작하는 것이 아니라 호스트 환경의 일부로서 동작한다는 것을 선언하는 것**입니다. 플러그인, 확장 모듈, UI 컴포넌트 라이브러리처럼 호스트와 긴밀하게 결합되는 패키지에서 필수적인 메커니즘입니다.

| 이점 | 설명 |
|------|------|
| **싱글 인스턴스 보장** | 중복 설치를 방지하여 instanceof 체크 및 DI 컨테이너 정상 동작 보장 |
| **번들 사이즈 절감** | 동일 라이브러리의 중복 설치를 방지하여 디스크 사용량 절감 |
| **버전 결정권 위임** | 호스트 프로젝트가 환경에 맞는 버전을 선택할 수 있도록 유연성 제공 |
| **호환성 문서화** | package.json만으로 지원 범위를 명확히 파악 가능 |
