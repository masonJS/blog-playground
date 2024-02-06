## express-session

### `trust proxy` 옵션
- Express 애플리케이션이 프록시 서버 뒤에 배포될 때 중요한 역할을 함. (브라우저 - 프록시 서버 - 대상 express 서버)
- 이 설정은 애플리케이션이 클라이언트와의 직접적인 연결 대신 프록시를 통해 요청을 받는 환경에서, Express가 클라이언트의 IP 주소와 같은 요청 헤더를 신뢰할지 여부를 결정 
- 기본적으로 **Express는 프록시를 통한 요청을 신뢰하지 않지만 `trust proxy`를 활성화하면, Express는 `X-Forwarded-For` 헤더를 통해 전달된 클라이언트의 원래 IP 주소를 신뢰하고
`X-Forwarded-Proto` 헤더를 사용하여 요청이 `https`를 통해 이루어졌는지 판단.**
  
이 설정은 다음과 같이 사용할 수 있음
```javascript
app.set('trust proxy') // trust first proxy
```

- [참고글](https://myeongil.tistory.com/entry/express-session-%EC%BF%A0%ED%82%A4-%EC%84%A4%EC%A0%95%EC%9D%B4-%EC%95%88%EB%90%98%EB%8A%94-%EC%9D%B4%EC%8A%88)

