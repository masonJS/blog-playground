# GitHub SSH 인증 설정 가이드 (macOS)

GitHub 저장소를 SSH 방식으로 clone/push/pull 하기 위한 설정 가이드입니다.

## 목차

1. [SSH 키 생성](#1-ssh-키-생성)
2. [SSH agent에 키 등록](#2-ssh-agent에-키-등록)
3. [SSH config 설정](#3-ssh-config-설정)
4. [GitHub에 공개키 등록](#4-github에-공개키-등록)
5. [연결 테스트](#5-연결-테스트)

---

## 1. SSH 키 생성

```bash
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519
```

- `-t ed25519`: 키 타입 (ed25519 권장, RSA보다 빠르고 안전)
- `-C`: 키에 붙일 코멘트 (보통 이메일 사용)
- `-f`: 키 파일 경로
- 비밀번호(passphrase) 입력을 요청받으면, 설정하거나 빈 값으로 Enter를 눌러 넘어갈 수 있음

생성 결과:

| 파일 | 설명 |
|------|------|
| `~/.ssh/id_ed25519` | 비밀키 (절대 공유하지 말 것) |
| `~/.ssh/id_ed25519.pub` | 공개키 (GitHub에 등록할 키) |

## 2. SSH agent에 키 등록

```bash
# SSH agent 실행
eval "$(ssh-agent -s)"

# 비밀키 등록
ssh-add ~/.ssh/id_ed25519
```

이 과정을 거쳐야 SSH 키를 사용해 인증할 수 있습니다.
단, 이 등록은 **현재 터미널 세션에서만 유효**합니다. 다음 단계의 SSH config 설정을 통해 자동화할 수 있습니다.

## 3. SSH config 설정

`~/.ssh/config` 파일을 생성하거나 편집합니다.

```bash
vi ~/.ssh/config
```

아래 내용을 추가합니다:

```
Host github.com
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519
```

| 옵션 | 설명 |
|------|------|
| `AddKeysToAgent yes` | SSH 사용 시 자동으로 agent에 키 등록 |
| `UseKeychain yes` | macOS 키체인에 passphrase 저장 (재부팅 후에도 유지) |
| `IdentityFile` | 사용할 비밀키 경로 지정 |

이 설정이 있으면 터미널을 재시작해도 매번 `ssh-add`를 실행할 필요가 없습니다.

## 4. GitHub에 공개키 등록

### 4-1. 공개키 복사

```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

`pbcopy`는 macOS 클립보드에 복사하는 명령어입니다. 위 명령어 실행 후 바로 붙여넣기가 가능합니다.

### 4-2. GitHub에 등록

1. https://github.com/settings/keys 페이지로 이동
2. **New SSH key** 클릭
3. **Title**: 식별할 수 있는 이름 입력 (예: `MacBook Pro`)
4. **Key type**: `Authentication Key` 선택
5. **Key**: 복사한 공개키 붙여넣기
6. **Add SSH key** 클릭

## 5. 연결 테스트

```bash
ssh -T git@github.com
```

성공 시 아래와 같은 메시지가 출력됩니다:

```
Hi {username}! You've successfully authenticated, but GitHub does not provide shell access.
```

이제 SSH 방식으로 clone/push/pull이 가능합니다:

```bash
git clone git@github.com:{username}/{repository}.git
```

---

## 참고: 계정별 SSH 키 분리

회사와 개인 GitHub 계정을 분리해서 사용하려면 `~/.ssh/config`에 Host를 나눠서 설정할 수 있습니다:

```
# 개인 계정
Host github.com
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519_personal

# 회사 계정
Host github-work
    HostName github.com
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519_work
```

회사 계정으로 clone할 때는 호스트명을 바꿔서 사용합니다:

```bash
git clone git@github-work:company/repository.git
```
