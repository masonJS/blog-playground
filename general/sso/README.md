## 통합 인증을 구현해본다면,

서비스를 두개 이상을 운영하다보면, 사용자의 인증을 통합해야할 때가 있다. 이때, 사용자의 인증을 통합하는 방법에 대해 알아보자.

### 1. SSO (Single Sign On)
- SSO는 여러 서비스에서 사용자의 인증을 통합하는 방법 중 하나이다.
- 계정 통합 관리 와 크로스 도메인 서비스 간의 세션 유지를 위한 방법.

실생활에 예시를 들을 수 있는 사례는 우리가 많이 사용하고 있는 google, youtube 서비스이다.
- [참고글](https://www.quora.com/How-does-Google-achieve-single-sign-on-between-different-domains-such-as-YouTube-and-Gmail)
- 이글에서 정리된 sso 인증 플로우를 살펴보면,
1. 사용자가 google.com 으로 로그인 버튼을 클릭.
2. account.google.com 페이지로 이동 (하위 도메인으로)
3. 사용자가 로그인을 한다.
4. 로그인 요청을 통해 서버에서 session 저장후 session id를 응답한다.
5. 응답을 받은 브라우저의 cookie에 Domain 은 `.google.com`로 세션을 쿠키에 저장한다. 
6. 응답한 session id를 통해 https://accounts.youtube.com/accounts/SetSID 의 경로에 query 로 session id를 태운후 요청한다.
7. youtube는 6.의 요청을 통해 받은 session id를 youtube 브라우저의 cookie에 Domain 은 '.youtube.com'으로 세션을 쿠키에 저장한다.
8. 7.의 작업 끝나고 다시 google.com 으로 리다이렉트 되에 두 서비스 모두 로그인 되어진 상태를 유지한다.


위의 플로우를 생각해보고 SSO 인증을 구현해본다고 한다면,

가정) A, B, C 서비스의 통합인증

1. A 도메인의 account.A 하위 도메인에서 회원 인증 관리
2. 사용자가 로그인을 했다면 accountA 서버에서 인증 후 세션 정보를 반환
3. 반환된 세션정보를 A 서비스의 쿠키에 저장
4. `[account.B , accountC 도메인]/set_session?session_id={{세션값}}&redirect_url={{리다이렉트 url}}` 해당 url 요청
5. B, C 서비스의 쿠키에 저장후 반환
