부제: Date 객체에 대하여

### Intro. JavaScript의 Date 객체는 왜 말썽일까

Date() 객체 타입에 입력으로 주는 값에 따라 출력이 달라집니다.
```javascript
new Date('2023-03-20')
// Mon Mar 20 2023 09:00:00 GMT+0900 (한국 표준시) => UTC로 파싱

new Date('March 20, 2023')
// Mon Mar 20 2023 00:00:00 GMT+0900 (한국 표준시) => KST(로컬)로 파싱

new Date('2023-03-20T00:00:00Z')
// Mon Mar 20 2023 09:00:00 GMT+0900 (한국 표준시) => UTC로 파싱

new Date('2023-03-20T00:00:00')
// Mon Mar 20 2023 00:00:00 GMT+0900 (한국 표준시) => KST(로컬)로 파싱
```

**왜 이런 차이가 발생할까요?**

핵심은 문자열 형식에 따라 JavaScript 엔진이 **UTC로 해석할지, 로컬 타임존으로 해석할지**가 달라지기 때문입니다.

| 입력 형식 | 파싱 기준 | 이유 |
|---|---|---|
| `'2023-03-20'` (날짜만) | UTC | ISO 8601 형식으로 인식, 시간 없으면 UTC 기본값 |
| `'March 20, 2023'` | 로컬(KST) | 비표준 형식이므로 로컬 타임존으로 해석 |
| `'2023-03-20T00:00:00Z'` | UTC | 끝의 `Z`가 UTC(Zero offset)를 명시 |
| `'2023-03-20T00:00:00'` | 로컬(KST) | `Z`나 오프셋(`+09:00`)이 없으면 로컬 타임존 |

> **T**는 날짜와 시간의 구분자이고, **Z**는 "Zulu time" 즉 UTC+0을 의미합니다.

---

## UTC의 탄생
> UTC(협정세계시)는 국제적인 표준 시간의 기준으로 쓰이는 시각이다.

우리는 개발하면서 날짜 관련된 데이터를 다루면 한 번씩은 `UTC`라는 단어를 들어봤을 겁니다.
이 `UTC`라는 시간이 어떻게 탄생했는지 알아보기 전에 우선 `GMT`에 대해 먼저 알아봐야 하는데요.

### GMT(Greenwich Mean Time)
JavaScript에서 날짜 시간을 다루는 `Date` 객체를 출력하게 되면 항상 마지막에 `GMT+0900`이라는 단어가 붙어있는 것을 볼 수 있습니다.

```javascript
new Date('2023-01-01')
// Sun Jan 01 2023 09:00:00 GMT+0900 (한국 표준시)
```

*이 단어가 무슨 의미를 뜻하는 것일까요?*

GMT의 정의는 영국에 위치한 그리니치 천문대를 기준으로 평균태양시를 산출해 만든 그리니치 표준시를 말합니다.
즉 GMT는 영국의 시간을 의미하며 이 시간을 기준으로 각각의 나라별로 시간 차이를 계산하여 시간을 표시하게 되는데요.

한국은 영국을 기점으로 9시간이 더 빠르기 때문에 `GMT+0900`이라는 단어가 붙게 됩니다.

### GMT에서 UTC로

그런데 GMT에는 문제가 있었습니다. 지구의 자전 속도가 일정하지 않기 때문에 **천문 관측에 기반한 GMT는 미세한 오차**가 발생합니다.

이 문제를 해결하기 위해 1972년, **세슘 원자시계를 기반으로 한 UTC(Coordinated Universal Time)**가 국제 표준으로 채택되었습니다.

| | GMT | UTC |
|---|---|---|
| 기준 | 천문 관측 (지구 자전) | 원자시계 (세슘-133) |
| 정확도 | 미세한 오차 존재 | 극도로 정밀 |
| 현재 위상 | 관례적으로 사용 | 국제 표준 |

실질적으로 GMT와 UTC의 시간 차이는 1초 미만이므로 일상적으로는 동일하게 취급하지만, 기술적으로는 **UTC가 공식 표준**입니다.

---

## Date 객체의 내부 동작

JavaScript의 `Date` 객체는 내부적으로 **1970년 1월 1일 00:00:00 UTC(Unix Epoch)**로부터 경과한 **밀리초(ms)** 값을 하나의 숫자로 저장합니다.

```javascript
const date = new Date('2023-03-20T00:00:00Z');
console.log(date.getTime()); // 1679270400000 (밀리초 타임스탬프)
```

즉, `Date` 객체 자체에는 타임존 정보가 없습니다. 단지 하나의 절대적인 시점(밀리초)을 저장하고 있을 뿐이고, 이 값을 **출력할 때** 실행 환경의 로컬 타임존을 적용하여 표시합니다.

```javascript
const date = new Date(1679270400000);

date.toUTCString();     // "Mon, 20 Mar 2023 00:00:00 GMT"
date.toLocaleString();  // "2023. 3. 20. 오전 9:00:00" (한국 기준)
date.toISOString();     // "2023-03-20T00:00:00.000Z" (항상 UTC)
```

---

## 주요 메서드 정리

### 생성
```javascript
new Date()                    // 현재 시각
new Date(1679270400000)       // 밀리초 타임스탬프
new Date('2023-03-20')        // 문자열 파싱 (UTC)
new Date(2023, 2, 20)         // 년, 월(0부터 시작!), 일 (로컬)
Date.now()                    // 현재 시각의 밀리초 타임스탬프 반환
```

> **주의:** `new Date(2023, 2, 20)`에서 월은 **0부터 시작**합니다. 2가 3월을 의미합니다.

### 값 추출 (로컬 기준)
```javascript
const d = new Date('2023-03-20T15:30:00+09:00');
d.getFullYear()   // 2023
d.getMonth()      // 2 (3월, 0부터 시작)
d.getDate()       // 20
d.getDay()        // 1 (월요일, 0=일요일)
d.getHours()      // 15
d.getMinutes()    // 30
```

### 값 추출 (UTC 기준)
```javascript
d.getUTCFullYear()  // 2023
d.getUTCMonth()     // 2
d.getUTCDate()      // 20
d.getUTCHours()     // 6 (KST 15시 - 9시간 = UTC 6시)
```

### 포맷팅
```javascript
d.toISOString()       // "2023-03-20T06:30:00.000Z" (UTC, ISO 8601)
d.toLocaleDateString() // "2023. 3. 20."
d.toLocaleTimeString() // "오후 3:30:00"
d.toLocaleString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit'
}) // "2023년 3월 20일 오후 03:30"
```

---

## 흔한 실수와 해결법

### 1. 날짜만 입력했는데 하루가 밀리는 문제
```javascript
// 한국 기준으로 3월 19일이 아닌 3월 20일을 기대했지만...
const date = new Date('2023-03-20');
console.log(date.toLocaleDateString()); // "2023. 3. 20." (한국에서는 정상)

// 하지만 UTC-X 타임존(미국 등)에서는 3월 19일로 표시될 수 있음
```
**원인:** `'2023-03-20'`은 UTC 자정으로 파싱되므로, UTC보다 느린 타임존에서는 전날로 표시됩니다.

**해결:** 로컬 날짜를 의도한다면 시간을 명시하세요.
```javascript
new Date('2023-03-20T00:00:00') // 로컬 자정
```

### 2. 월이 0부터 시작하는 문제
```javascript
// 3월을 만들려고 했지만 4월이 됨
new Date(2023, 3, 20) // 2023-04-20 (4월!)

// 올바른 방법
new Date(2023, 2, 20) // 2023-03-20 (3월)
```

### 3. 서버와 클라이언트의 시간 차이
서버(UTC)와 클라이언트(로컬)의 시간이 다르면 날짜가 어긋날 수 있습니다.

**해결:** 데이터 전송 시 항상 **ISO 8601 형식(UTC)**을 사용하고, 표시할 때만 로컬 타임존으로 변환하세요.
```javascript
// 서버에서 보낼 때
const isoString = new Date().toISOString(); // "2023-03-20T06:30:00.000Z"

// 클라이언트에서 표시할 때
const localDisplay = new Date(isoString).toLocaleString(); // 로컬 시간으로 변환
```

---

## 더 나은 대안: Temporal API

기존 `Date` 객체의 한계(불변성 없음, 타임존 지원 미흡, 월이 0부터 시작 등)를 해결하기 위해 **Temporal API**가 제안되었습니다.

```javascript
// Temporal API (Stage 3 제안)
Temporal.PlainDate.from('2023-03-20')          // 타임존 없는 순수 날짜
Temporal.ZonedDateTime.from('2023-03-20T00:00:00+09:00[Asia/Seoul]') // 타임존 포함
```

Temporal API의 주요 개선점:
- **불변(Immutable)** 객체 - 기존 Date는 `setMonth()` 등으로 원본이 변경됨
- **명확한 타임존 처리** - IANA 타임존(`Asia/Seoul`) 직접 지원
- **월이 1부터 시작** - 직관적인 숫자 체계
- **날짜/시간/타임존 분리** - `PlainDate`, `PlainTime`, `ZonedDateTime` 등 용도별 타입 제공

> 아직 모든 브라우저에서 지원되지 않으므로, 현재는 `@js-temporal/polyfill`을 통해 사용할 수 있습니다.
