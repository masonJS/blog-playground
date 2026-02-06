## AWS Media Convert



## 전체 구조 이해하기

이 설정은 비디오를 HLS 스트리밍용으로 변환하는 출력 설정입니다. 하나의 출력 설정이 하나의 비트레이트 버전을 만듭니다.

---

## 1. ContainerSettings (컨테이너 포맷)

```typescript
ContainerSettings: {
  Container: ContainerType.M3U8,
  M3u8Settings: {},
}
```

### 개념
- 컨테이너: 비디오/오디오를 담는 포맷(예: MP4, MKV, M3U8)
- M3U8: HLS(HTTP Live Streaming)용 재생 목록 파일 포맷

### 왜 M3U8인가?
- 스트리밍에 적합: 비디오를 작은 조각(세그먼트)으로 나눠 전송
- 적응형 스트리밍: 네트워크에 따라 품질 자동 조절
- 예: YouTube, Netflix가 사용하는 방식

---

## 2. VideoDescription (비디오 설정)

```typescript
VideoDescription: {
  Width: 720,
  Height: 480,
  CodecSettings: { ... }
}
```

### 해상도 (Width × Height)
- 720 × 480: SD급 해상도
- 용도: 낮은 대역폭 환경이나 모바일에서 사용

### CodecSettings
- 코덱: 비디오를 압축/압축해제하는 방식
- 여기서는 H.264 사용

---

## 3. H264Settings (비디오 인코딩 세부 설정)

```typescript
H264Settings: {
  MaxBitrate: 1500000,  // 1.5 Mbps
  RateControlMode: H264RateControlMode.QVBR,
  SceneChangeDetect: H264SceneChangeDetect.TRANSITION_DETECTION,
}
```

### MaxBitrate (최대 비트레이트)
- 1,500,000 bps = 1.5 Mbps
- 의미: 초당 전송되는 최대 데이터량
- 영향: 높을수록 화질 좋음, 파일 크기/대역폭 증가

### RateControlMode: QVBR
- QVBR: Quality Variable Bitrate
- 동작: 화질을 일정하게 유지하며 비트레이트를 가변 조절
- 장점: 복잡한 장면은 높게, 단순한 장면은 낮게 할당해 효율적

### SceneChangeDetect (장면 전환 감지)
- TRANSITION_DETECTION: 장면 전환을 감지해 인코딩 최적화
- 효과: 전환 시 품질 유지, 파일 크기 절감

---

## 4. AudioDescriptions (오디오 설정)

### AudioNormalizationSettings (오디오 정규화)

```typescript
AudioNormalizationSettings: {
  Algorithm: AudioNormalizationAlgorithm.ITU_BS_1770_4,
  AlgorithmControl: AudioNormalizationAlgorithmControl.CORRECT_AUDIO,
  CorrectionGateLevel: -60,
  TargetLkfs: -14,
  TruePeakLimiterThreshold: -1,
}
```

#### 개념
- 정규화: 여러 영상의 오디오 볼륨을 일정 수준으로 맞추는 작업

#### 각 설정의 의미
- Algorithm: ITU_BS_1770_4 표준 사용
- TargetLkfs: -14 LUFS 목표(일반적인 방송/스트리밍 표준)
- CorrectionGateLevel: -60 dB 이하는 무시(노이즈 제거)
- TruePeakLimiterThreshold: -1 dB로 제한(클리핑 방지)

#### 왜 필요한가?
- 예: 여러 영상의 볼륨 차이로 인한 불편함을 줄임

### CodecSettings: AAC

```typescript
CodecSettings: {
  Codec: AudioCodec.AAC,
  AacSettings: {
    Bitrate: 96000,  // 96 kbps
    CodingMode: AacCodingMode.CODING_MODE_2_0,
    SampleRate: 48000,  // 48 kHz
  },
}
```

#### AAC (Advanced Audio Coding)
- 널리 사용되는 오디오 코덱
- 효율적 압축과 품질의 균형

#### Bitrate: 96 kbps
- 오디오 데이터 전송률
- 일반적으로 96–128 kbps가 충분

#### CodingMode: CODING_MODE_2_0
- 스테레오(2채널) 모드
- 좌우 채널로 구성

#### SampleRate: 48 kHz
- 초당 샘플 수
- 48 kHz는 일반적인 표준(CD는 44.1 kHz)

---

## 전체 흐름 요약

```
원본 비디오 파일
    ↓
MediaConvert가 이 설정으로 변환
    ↓
출력: M3U8 파일 (HLS 스트리밍용)
    - 해상도: 720×480
    - 비디오: H.264, 최대 1.5 Mbps
    - 오디오: AAC, 96 kbps, 스테레오
    - 오디오 정규화 적용
    ↓
사용자가 스트리밍으로 시청
```

## 실제 사용 예시

이 설정으로 변환된 비디오는:
- 모바일 데이터 절약 모드에 적합
- 느린 인터넷 환경에서도 재생 가능
- YouTube의 "480p" 품질과 유사




---

## MediaConvert가 생성하는 파일 구조

코드에서 3가지 해상도를 생성하면, MediaConvert는 다음과 같은 파일들을 만듭니다:

```
output/
  ├── outputFile.m3u8          ← outputFile 플레이리스트 (품질 옵션 목록)
  ├── 720*480_1.5mbps_qvbr/
  │   ├── playlist.m3u8    ← 480p 품질의 세그먼트 목록
  │   ├── segment000.ts
  │   ├── segment001.ts
  │   └── ...
  ├── 1280*720_4mbps_qvbr/
  │   ├── playlist.m3u8    ← 720p 품질의 세그먼트 목록
  │   ├── segment000.ts
  │   └── ...
  └── 1920*1080_8mbps_qvbr/
      ├── playlist.m3u8    ← 1080p 품질의 세그먼트 목록
      ├── segment000.ts
      └── ...
```

### outputFile 플레이리스트 (outputFile.m3u8) 예시

```m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=720x480
720*480_1.5mbps_qvbr/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1280x720
1280*720_4mbps_qvbr/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080
1920*1080_8mbps_qvbr/playlist.m3u8
```

이 파일은 "이 비디오는 3가지 품질로 제공됩니다"라고 알려줍니다.

---

## 플레이어의 자동 선택 과정

### Step 1: 초기 품질 선택

```
사용자가 비디오 재생 버튼 클릭
    ↓
플레이어가 master.m3u8 다운로드
    ↓
플레이어가 현재 네트워크 속도 측정
    ↓
적절한 품질 선택
```

선택 기준:
- 네트워크 다운로드 속도
- 디바이스 성능
- 화면 크기

### Step 2: 실시간 품질 조정

재생 중에도 계속 조정합니다:

```
플레이어가 세그먼트 다운로드 속도 측정
    ↓
느리면 → 낮은 품질로 전환
빠르면 → 높은 품질로 전환
```

---

## 실제 동작 시나리오

### 시나리오 A: 빠른 Wi-Fi 환경

```
1. 사용자가 비디오 재생
2. 플레이어: "다운로드 속도 10 Mbps 측정됨"
3. 플레이어: "1080p (8 Mbps) 선택 가능!"
4. → 1920*1080_8mbps_qvbr/playlist.m3u8 재생
5. 사용자는 고화질로 시청
```

### 시나리오 B: 느린 모바일 데이터

```
1. 사용자가 비디오 재생
2. 플레이어: "다운로드 속도 2 Mbps 측정됨"
3. 플레이어: "1080p는 버퍼링 발생할 것 같음"
4. → 720*480_1.5mbps_qvbr/playlist.m3u8 재생
5. 사용자는 낮은 품질이지만 끊김 없이 시청
```

### 시나리오 C: 네트워크 상태 변화

```
1. 사용자가 Wi-Fi로 1080p 시청 중
2. Wi-Fi 연결 끊김 → 모바일 데이터로 전환
3. 플레이어: "다운로드 속도 급격히 감소!"
4. 플레이어: "버퍼링 방지를 위해 480p로 전환"
5. → 자동으로 720*480_1.5mbps_qvbr로 전환
6. 사용자는 끊김 없이 계속 시청
```

---

## 선택 기준 (플레이어 내부 로직)

플레이어는 다음을 고려합니다:

### 1) BANDWIDTH (대역폭)
```m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000  ← 1.5 Mbps
#EXT-X-STREAM-INF:BANDWIDTH=4000000  ← 4 Mbps
#EXT-X-STREAM-INF:BANDWIDTH=8000000  ← 8 Mbps
```
- 측정 속도가 8 Mbps 이상이면 1080p 선택 가능
- 2 Mbps면 720p 선택
- 1 Mbps면 480p 선택

### 2) RESOLUTION (해상도)
- 작은 화면(모바일)에서는 낮은 해상도도 충분
- 큰 화면(TV)에서는 높은 해상도 선호

### 3) 버퍼 상태
- 버퍼가 부족하면 낮은 품질로 전환
- 버퍼가 충분하면 높은 품질로 전환

---

## 세그먼트 단위 전환

HLS는 비디오를 작은 조각(세그먼트)으로 나눕니다:

```
비디오 전체 (10분)
    ↓
세그먼트로 분할 (각 10초)
    ↓
segment000.ts (0~10초)
segment001.ts (10~20초)
segment002.ts (20~30초)
...
```

플레이어는 세그먼트 단위로 품질을 전환할 수 있습니다:

```
segment000.ts → 1080p로 다운로드
segment001.ts → 1080p로 다운로드
segment002.ts → 네트워크 느려짐! → 480p로 전환
segment003.ts → 480p로 다운로드
segment004.ts → 네트워크 회복! → 1080p로 전환
segment005.ts → 1080p로 다운로드
```

이렇게 하면 재생 중에도 끊김 없이 품질이 조정됩니다.

---

## 코드에서의 설정 의미

```typescript
OutputGroupSettings: {
  Type: OutputGroupType.HLS_GROUP_SETTINGS,
  HlsGroupSettings: {
    SegmentLength: 10,  // 각 세그먼트는 10초
    ...
  }
}
```

- `SegmentLength: 10`: 각 세그먼트가 10초
- 플레이어는 10초마다 품질을 재평가하고 필요 시 전환

---

## 7. 사용자 관점에서 보기

사용자는:
- 품질을 직접 선택하지 않음
- 버튼을 누르지 않음
- 네트워크가 좋으면 자동으로 고화질
- 네트워크가 나쁘면 자동으로 저화질
- 끊김 없이 재생됨

YouTube, Netflix도 같은 방식으로 동작합니다.

---

## 요약

1. MediaConvert가 3가지 품질 버전을 생성
2. 마스터 플레이리스트에 모든 옵션이 나열됨
3. 플레이어가 네트워크 상태를 실시간 측정
4. 플레이어가 자동으로 적절한 품질 선택
5. 재생 중에도 네트워크 변화에 따라 자동 전환

결론: 사용자는 선택하지 않습니다. 플레이어가 자동으로 처리합니다.

추가 질문이 있으면 알려주세요.
