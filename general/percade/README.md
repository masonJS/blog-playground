## Facade 계층
- controller - service 사이에 두는 계층
- WebClientService, EventPublisherService 등을 facade 계층에 두어 service 레이어에서는 주 관심사 객체만 의존할수 있게
- 도메인 서비스가 또다른 도메인 서비스를 의존하여 암묵적인 상하 관계를 갖게 하는것을 지양하고자 facade 계층으로 의존 방향을 바꿈
- 의존 방향을 단방향으로 
- 테스트 용이 
  - facade 계층은 모킹테스트 
  - 도메인 서비스는 따로 sub이나 모킹처리를 하지 않아도 됨.

