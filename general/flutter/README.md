# Flutter 프로젝트 환경 

> Flutter 프로젝트를 처음 실행해보면서 알게 된 내용을 정리한 문서
---

## 1. Flutter 기본 개념

### Flutter란?

- Google에서 개발한 **크로스 플랫폼 UI 프레임워크**
- 하나의 코드베이스로 iOS, Android, Web, Desktop 앱 개발 가능
- **Dart** 언어 사용

### 주요 명령어

```bash
# Flutter 버전 확인
flutter --version

# 개발 환경 상태 확인
flutter doctor

# 연결된 디바이스 목록
flutter devices

# 앱 실행
flutter run

# 의존성 설치
flutter pub get

# 코드 분석
dart analyze
```

---

## 2. Flutter 버전 관리 (mise)

### mise란?

- 여러 개발 도구의 버전을 프로젝트별로 관리하는 도구
- Node.js의 nvm, Python의 pyenv와 유사한 역할
- Flutter, Ruby, Java 등 다양한 런타임 지원

### 사용법

```bash
# mise 활성화 (매 터미널 세션마다 필요)
eval "$(mise activate zsh)"

# 현재 사용 중인 도구 버전 확인
mise which flutter

# 설치된 Flutter 버전 확인
ls ~/.local/share/mise/installs/flutter/
```

### 프로젝트 버전 설정 파일

프로젝트 루트의 `.mise.toml` 파일에서 버전 지정:

```toml
[tools]
flutter = "3.38.6-stable"
ruby = "3.3.8"
java = "zulu-17.60.17.0"
```

### 주의사항

- **매번 새 터미널을 열 때마다** `eval "$(mise activate zsh)"` 실행 필요
- 또는 `~/.zshrc`에 추가하여 자동 활성화

---

## 3. Flutter 의존성 관리

### pubspec.yaml

- Flutter 프로젝트의 의존성 정의 파일 (Node.js의 package.json과 유사)
- 패키지 버전, 프로젝트 메타데이터 등 정의

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  provider: ^6.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
```

### 의존성 설치 명령어

```bash
# 단일 프로젝트
flutter pub get

# 또는
dart pub get
```

### 모노레포 (Monorepo) 구조

- 여러 패키지/앱을 하나의 저장소에서 관리하는 구조
- **melos**: Flutter/Dart 모노레포 관리 도구

```bash
# melos로 전체 패키지 의존성 설치
dart run melos bootstrap
```

### Git 기반 의존성

Private repository의 패키지를 사용하는 경우:

```yaml
dependencies:
  my_private_package:
    git:
      url: git@github.com:organization/repo.git
      path: packages/my_package
      ref: "commit-hash"
```

---

## 4. SSH 키 설정 (Private Repository용)

### SSH 키가 필요한 경우

- `pubspec.yaml`에서 `git@github.com:...` 형태의 private repository 참조 시
- `flutter pub get` 또는 `melos bootstrap` 실행 시 SSH 인증 필요

### SSH 키 등록

```bash
# SSH 키 목록 확인
ls -la ~/.ssh/

# SSH 키 등록 및 추가 
- https://docs.github.com/ko/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key
- https://docs.github.com/ko/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#adding-your-ssh-key-to-the-ssh-agent

# SSH agent 시작 및 키 추가
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/your_key_name

# macOS Keychain에 저장 (패스프레이즈 한 번만 입력)
ssh-add --apple-use-keychain ~/.ssh/your_key_name

# Keychain에서 키 로드 (새 터미널에서)
ssh-add --apple-load-keychain
```

### SSH Config 설정

`~/.ssh/config` 파일:

```
Host github.com
     HostName github.com
     User git
     IdentityFile ~/.ssh/your_key_name
     IdentitiesOnly yes
```

### 연결 테스트

```bash
ssh -T git@github.com
# 성공 시: "Hi username! You've successfully authenticated..."
```

---

## 5. iOS 개발 환경 설정

### 필수 요구사항

1. **Xcode**: App Store에서 설치
2. **CocoaPods**: iOS 의존성 관리 도구
3. **iOS Simulator Runtime**: 시뮬레이터 실행에 필요

### Xcode Command Line Tools

```bash
# 설치 경로 확인
xcode-select -p
# 출력: /Applications/Xcode.app/Contents/Developer
```

### CocoaPods 설치

```bash
# Homebrew로 설치 (권장)
brew install cocoapods

# 또는 gem으로 설치
sudo gem install cocoapods
```

### iOS 시뮬레이터 런타임 설치

```bash
# iOS 시뮬레이터 다운로드 (약 8GB, 시간 소요)
xcodebuild -downloadPlatform iOS

# 설치된 시뮬레이터 확인
xcrun simctl list devices available
```

### 시뮬레이터 실행

```bash
# 특정 시뮬레이터 부팅
xcrun simctl boot "iPhone 16 Pro"

# Simulator 앱 열기
open -a Simulator

# 사용 가능한 에뮬레이터 목록
flutter emulators
```

### flutter doctor 정상 상태

```
[✓] Flutter (Channel stable, 3.38.6)
[✓] Xcode - develop for iOS and macOS (Xcode 16.2)
[✓] Chrome - develop for the web
[✓] Connected device (3 available)
[✓] Network resources
```

---

## 6. Flutter 앱 실행

### 기본 실행

```bash
flutter run
```

### Flavor (빌드 변형) 지정

- 개발(dev), 스테이징(stag), 프로덕션(prod) 등 환경별 빌드 구분

```bash
flutter run --flavor dev
```

### Dart Define (컴파일 타임 상수)

- 빌드 시 환경 변수 전달

```bash
# 직접 전달
flutter run --dart-define=FLAVOR=dev --dart-define=API_URL=https://dev-api.example.com

# 파일에서 읽기
flutter run --dart-define-from-file=.env.dev
```

### 디바이스 지정

```bash
# 연결된 디바이스 확인
flutter devices

# 특정 디바이스로 실행
flutter run -d "iPhone 16 Pro"
flutter run -d chrome
flutter run -d macos
```

### Hot Reload / Hot Restart

앱 실행 중 터미널에서:
| 키 | 기능 |
|---|------|
| `r` | Hot Reload - 상태 유지하며 UI 변경 반영 |
| `R` | Hot Restart - 앱 전체 재시작 |
| `q` | 앱 종료 |
| `h` | 도움말 |

---

## 7. 코드 생성 (Code Generation)

### build_runner란?

- Dart 코드를 자동 생성하는 도구
- JSON 직렬화, 의존성 주입, 라우팅 등에 사용

### 사용법

```bash
# 코드 생성 실행
dart run build_runner build

# 기존 생성 파일 삭제 후 재생성
dart run build_runner build --delete-conflicting-outputs

# 파일 변경 감지하며 자동 생성
dart run build_runner watch
```

### 생성되는 파일

- `*.g.dart`: JSON 직렬화, 기타 생성 코드
- `*.config.dart`: 설정 파일
- `*.mapper.dart`: 매퍼 코드

---

## 8. 자주 발생하는 오류와 해결

### "Target of URI doesn't exist"

**원인**: 패키지 의존성이 설치되지 않음

```bash
# 해결
flutter pub get
# 또는 모노레포의 경우
dart run melos bootstrap
```

### "Permission denied (publickey)"

**원인**: SSH 키가 로드되지 않음

```bash
# 해결
ssh-add --apple-load-keychain
# 또는
ssh-add ~/.ssh/your_key
```

### "CocoaPods not installed"

**원인**: iOS 빌드에 필요한 CocoaPods 미설치

```bash
# 해결
brew install cocoapods
```

### "Unable to get list of installed Simulator runtimes"

**원인**: iOS 시뮬레이터 런타임 미설치

```bash
# 해결
xcodebuild -downloadPlatform iOS
```

### "pod install" 실패

**원인**: iOS 빌드 캐시 문제

```bash
# 해결
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### "command not found: flutter"

**원인**: Flutter가 PATH에 없거나 mise가 활성화되지 않음

```bash
# 해결
eval "$(mise activate zsh)"
```

---

## 9. 유용한 도구들

### Flutter DevTools

- Flutter 앱 디버깅 및 프로파일링 도구
- 앱 실행 시 터미널에 표시되는 URL로 접근

### Dart Analyze

```bash
# 코드 분석 (린트 에러 확인)
dart analyze

# 특정 파일만 분석
dart analyze lib/main.dart
```

### Flutter Clean

```bash
# 빌드 캐시 삭제
flutter clean

# 이후 다시 의존성 설치
flutter pub get
```

---

## 10. 참고 자료

### 공식 문서

- [Flutter 공식 문서](https://flutter.dev/docs)
- [Dart 공식 문서](https://dart.dev/guides)
- [pub.dev](https://pub.dev/) - Dart/Flutter 패키지 저장소

### 도구 문서

- [mise](https://mise.jdx.dev/) - 버전 관리 도구
- [melos](https://melos.invertase.dev/) - 모노레포 관리 도구
- [CocoaPods](https://cocoapods.org/) - iOS 의존성 관리

### 학습 리소스

- [Flutter Codelabs](https://docs.flutter.dev/codelabs)
- [Dart Language Tour](https://dart.dev/language)

---

## 요약: 새 프로젝트 시작 시 체크리스트

1. [ ] mise 활성화: `eval "$(mise activate zsh)"`
2. [ ] Flutter 환경 확인: `flutter doctor`
3. [ ] SSH 키 로드 (필요 시): `ssh-add --apple-load-keychain`
4. [ ] 의존성 설치: `flutter pub get` 또는 `dart run melos bootstrap`
5. [ ] 디바이스 확인: `flutter devices`
6. [ ] 앱 실행: `flutter run`
