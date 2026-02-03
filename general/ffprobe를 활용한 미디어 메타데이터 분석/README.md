# ffprobe를 활용한 미디어 메타데이터 분석

## 개요

원격 스토리지(S3)에 저장된 미디어 파일의 재생 시간(duration)을 추출하는 과정에서 학습한 내용을 정리한 문서이다.
ffprobe의 동작 원리와, 파일 전체를 다운로드하지 않고 메타데이터만 읽어오는 메커니즘을 다룬다.

---

## 1. 구현 코드

```typescript
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfprobePath(ffprobeInstaller.path);

function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(url, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration; // 초 단위 (소수점 포함)
      if (duration === undefined)
        return reject(new Error('duration not found'));
      resolve(duration);
    });
  });
}
```

### 코드 설명

| 구성 요소 | 역할 |
|-----------|------|
| `@ffprobe-installer/ffprobe` | OS에 맞는 ffprobe 바이너리를 npm 설치 시 함께 다운로드하는 패키지 |
| `ffmpeg.setFfprobePath()` | fluent-ffmpeg가 사용할 ffprobe 바이너리 경로를 지정 |
| `ffmpeg.ffprobe(url, callback)` | 콜백 기반 API로, URL의 미디어 메타데이터를 분석 |
| `new Promise()` | 콜백 기반 API를 async/await으로 사용할 수 있도록 래핑 |
| `metadata.format.duration` | 컨테이너 레벨의 재생 시간 (초 단위, 소수점 포함) |

---

## 2. FFmpeg 프로젝트와 ffprobe

FFmpeg은 멀티미디어 처리를 위한 오픈소스 프로젝트로, 세 가지 CLI 도구를 제공한다.

| 도구 | 역할 |
|------|------|
| **ffmpeg** | 미디어 인코딩/디코딩/변환 |
| **ffplay** | 미디어 재생 |
| **ffprobe** | 미디어 메타데이터 분석 (읽기 전용) |

ffprobe는 미디어 파일을 **수정하지 않고 분석만** 하는 도구로, 다음 정보를 추출할 수 있다.

- **format** — 컨테이너 포맷(mp4, mpeg, webm 등), 전체 duration, bitrate, 파일 크기
- **streams** — 비디오/오디오/자막 각 스트림의 코덱, 해상도, 샘플레이트, 채널 수 등
- **chapters** — 챕터 정보
- **metadata** — 태그 (제목, 아티스트, 앨범 등)

---

## 3. ffprobe 프로세스 실행 과정

### 3-1. child process spawn

`fluent-ffmpeg`가 `ffmpeg.ffprobe(url, callback)`을 호출하면, 내부적으로 Node.js의 `child_process.spawn()`을 사용하여 별도 프로세스를 생성한다. 실제로 실행되는 명령은 대략 아래와 같다.

```bash
/path/to/ffprobe -show_format -show_streams -print_format json "https://...s3.../file.mpeg"
```

| 플래그 | 의미 |
|--------|------|
| `-show_format` | 컨테이너 레벨 정보 (duration, bitrate 등) 출력 |
| `-show_streams` | 각 스트림 정보 (코덱, 해상도 등) 출력 |
| `-print_format json` | 결과를 JSON 형태로 출력 |

### 3-2. stdout 파싱

```
[Node.js 메인 프로세스]          [ffprobe 자식 프로세스]
        |                                |
        |  spawn() ------------------>   | 프로세스 시작
        |                                | S3에서 메타데이터 읽기
        |                                | JSON 결과를 stdout에 출력
        |  <-- stdout pipe (JSON) ----   |
        |  <-- exit code 0 -----------   | 프로세스 종료
        |
   JSON.parse(stdout)
   callback(null, metadata) 호출
```

1. ffprobe 자식 프로세스가 분석 결과를 **stdout**에 JSON으로 출력한다.
2. Node.js 메인 프로세스는 **pipe**를 통해 이 stdout 데이터를 수집한다.
3. ffprobe 프로세스가 종료되면, fluent-ffmpeg가 수집한 JSON을 `JSON.parse()`하여 `FfprobeData` 객체로 변환한다.
4. 이 객체가 콜백의 `metadata` 파라미터로 전달된다.

Node.js의 이벤트 루프를 블로킹하지 않고, 프로세스 간 통신(stdout pipe)을 통해 결과를 비동기로 받는 구조이다.

### 3-3. 결과 구조

최종적으로 콜백에 전달되는 `metadata` 객체는 아래와 같은 구조이다.

```json
{
  "format": {
    "filename": "https://...s3.../file.mpeg",
    "format_name": "mpeg",
    "duration": 125.432,
    "size": 1048576,
    "bit_rate": 128000
  },
  "streams": [
    {
      "codec_type": "audio",
      "codec_name": "mp3",
      "sample_rate": "44100",
      "channels": 2
    }
  ]
}
```

코드에서 `metadata.format.duration`으로 접근하는 것이 바로 이 JSON의 `format.duration` 필드이다.

---

## 4. 파일 다운로드 없이 메타데이터를 읽는 원리

### 4-1. HTTP Range Request

핵심 메커니즘은 **HTTP Range Request**이다. HTTP/1.1 스펙에 정의된 기능으로, 파일의 특정 바이트 범위만 요청할 수 있다.

```http
# 일반 요청 — 파일 전체 다운로드
GET /file.mpeg HTTP/1.1
Host: s3.amazonaws.com

# Range 요청 — 파일의 0~8191 바이트만 요청
GET /file.mpeg HTTP/1.1
Host: s3.amazonaws.com
Range: bytes=0-8191
```

서버가 Range Request를 지원하면 `206 Partial Content` 응답과 함께 요청한 범위의 데이터만 반환한다.

```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-8191/104857600
Content-Length: 8192
```

S3는 [Range Request를 지원](https://docs.aws.amazon.com/ko_kr/whitepapers/latest/s3-optimizing-performance-best-practices/use-byte-range-fetches.html)하므로, ffprobe가 이 기능을 활용할 수 있다.

### 4-2. AVIOContext — ffprobe의 I/O 추상화

ffprobe의 [libavformat](https://ffmpeg.org/doxygen/trunk/group__libavf.html)은 파일 I/O를 **AVIOContext**라는 추상화 레이어로 처리한다.

```
┌─────────────────────────────────┐
│         ffprobe 분석 로직         │
│   "offset 0에서 8KB 읽어줘"       │
│   "offset 104857000으로 seek해줘" │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│         AVIOContext              │
│   read()  → HTTP Range GET      │
│   seek()  → 다음 Range 오프셋 조정 │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│     HTTP/HTTPS 프로토콜 핸들러     │
│   실제 네트워크 요청 수행           │
└─────────────────────────────────┘
```

- 로컬 파일이면 `fseek()`/`fread()`를 사용
- HTTP URL이면 **Range Request로 변환**

ffprobe 분석 로직 입장에서는 로컬 파일이든 원격 URL이든 동일하게 `read()`와 `seek()`만 호출하면 된다.

### 4-3. ffprobe의 실제 읽기 흐름

ffprobe는 내부적으로 필요한 만큼만 순차적으로 Range Request를 보낸다.

```
ffprobe                              S3 서버
  |                                     |
  |  GET Range: bytes=0-8191 -------->  |  ① 파일 앞부분 읽기
  |  <-------- 206 (8KB) -----------    |
  |                                     |
  |  컨테이너 헤더 파싱                    |
  |  "메타데이터가 여기 있는가?"            |
  |                                     |
  |  (필요시)                            |
  |  GET Range: bytes=N-M ---------->   |  ② 추가 영역 읽기
  |  <-------- 206 ----------------     |
  |                                     |
  |  메타데이터 파싱 완료                   |
  |  연결 종료 (파일 나머지는 읽지 않음)     |
```

### 4-4. 컨테이너 포맷별 메타데이터 위치

메타데이터가 파일 어디에 위치하느냐에 따라 네트워크 요청 횟수가 달라진다.

#### MPEG (이 코드의 경우)

```
┌──────────┬─────────────────────────────┐
│  Header  │        Audio Data ...        │
│ metadata │                              │
└──────────┴─────────────────────────────┘
↑
Range Request 1회로 충분
```

MPEG 포맷은 메타데이터가 파일 앞부분에 있어서, 첫 번째 Range Request만으로 duration을 알 수 있다.

#### MP4 — moov atom이 앞에 있는 경우 (faststart 적용)

```
┌──────┬──────┬──────────────────────────┐
│ ftyp │ moov │        mdat (실제 데이터)   │
│      │ meta │                           │
└──────┴──────┴──────────────────────────┘
↑
앞부분만 읽으면 됨
```

#### MP4 — moov atom이 뒤에 있는 경우

```
┌──────┬──────────────────────────┬──────┐
│ ftyp │        mdat (실제 데이터)  │ moov │
│      │                          │ meta │
└──────┴──────────────────────────┴──────┘
↑                                    ↑
① 앞부분 읽기                    ② 끝부분 seek해서 읽기
  → moov 없음 확인                 → moov 발견, 파싱
```

이 경우 ffprobe는:

1. 파일 앞부분을 읽고 `ftyp`는 있지만 `moov`가 없음을 확인
2. 파일 끝으로 **seek** (내부적으로 `Range: bytes=-65536` 같은 요청)
3. `moov` atom을 찾아 메타데이터 파싱

요청이 2~3회로 늘어나지만, 여전히 파일 전체를 다운로드하지는 않는다.

### 4-5. 실제 네트워크 전송량 비교

```
파일 크기:     100MB 오디오 파일
전체 다운로드:  100MB (100%)
ffprobe:       8KB ~ 수백KB (0.001% ~ 0.5%)
```

### 4-6. Range Request 미지원 시

서버가 Range Request를 지원하지 않으면 (`Accept-Ranges: none`), ffprobe는 파일 전체를 순차적으로 읽어야 하므로 성능이 크게 떨어진다.

---

## 5. 전체 실행 흐름 요약

```
run() 호출
  → getVideoDuration(S3 URL)
    → ffprobe 자식 프로세스 spawn
      → AVIOContext가 S3에 HTTP Range Request
      → 컨테이너 헤더의 메타데이터만 선택적으로 읽기
      → JSON 결과를 stdout으로 출력
    → Node.js가 stdout pipe로 JSON 수집
    → JSON.parse() → FfprobeData 객체
    → duration 값 resolve
  → console.log(result)
```
