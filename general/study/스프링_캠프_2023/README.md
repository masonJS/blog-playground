## 스프링 캠프 2023 후기

### 어느 #월급쟁이개발자 의 스프링 부트 따라잡기 Ver. 3	- 김지헌

**build tool**

- Gradle Groovy DSL 이 XML보다 가족성 및 멀티 모듈 측면에서 이점

**설정 파일**

- application.yml 계층형 방식이 application.properties 열거형 방식보다는 가독성의 이점

**Java의 버전별 주요 기능**

- Java 10
  - Local variable Type interface
    ```java
    var outputStream = new Byte...
    ```
- Java 14
  - Switch Expression
    - intellij 에서 type에 대한 case를 전부 선언했는지 체크
- Java 15
  - Text Block
- Java 16
  - Record
    - 순수한 데이터 클래스 역할
    - final 필드로 구성
  - Jackson 직렬화
  - Instanceof pattern matching
    - [참고 설명](https://velog.io/@gkskaks1004/Java-16%EC%97%90%EC%84%9C-instanceof-%EC%97%B0%EC%82%B0%EC%9E%90%EC%97%90-%EB%8C%80%ED%95%9C-pattern-matching)
- Java 17
  - Sealed Class

**Jakarta EE**

Intellij - Java EE -> Jakarta EE 로 쉽게 namespace 변경 가능하도록 migration 설정 기능 지원
[참고 설명](https://www.youtube.com/watch?v=mukr2Q_zBm4)

**스프링 부트 업데이트 전략**

- 스프링 버전별로 시멘틱 버전을 하나씩 업그레이드하면서 프로젝트 호환성및 안정성을 보장하는 방법을 설명
- 나중에 youtube 로 다시 보기 영상나올때 확인해보면 좋을듯

**Spring RestTemplate is Deprecated?**
- [토비님 유튜브 영상] (https://www.youtube.com/watch?v=S4W3cJOuLrU)


### 글로벌 서비스를 위한 Timezone/DST	- 김대겸

**java.util.Date, Calendar**

- mutable 객체로 인해 스레드 안정성이 없다.

**Joda-Time**

- 불변 객체로 스레드 안정성을 보장
- 직관적 사용 
- 시간대와 로케일을 쉽게 처리

**java.time** (java 8부터)

- 불변 객체로 스레드 안정성을 보장
- 직관적 사용
- LocalDateTime + ZoneId = ZonedDateTime
- LocalDateTime + ZoneOffset = OffsetDateTime

**ZonedDateTime은 @CreatedDate 에서 지원해주지 못함**

- @PrePersist, @PreUpdate 으로 사용
- @CreationTimestamp 으로 사용


### 대규모 엔터프라이즈 시스템 개선 경험기 - 1부 - 달리는 기차의 바퀴 갈아 끼우기. - 임형태

**1. 레거시 시스템에서의 두번 쓰기**

**2. 데이터 마이그레이션**

- 마이그레이션은 멱등성을 유지해야 한다.

**3. 레거시 시스템의 읽기 전환**

- Read api를 레거시 시스템에서 신규 시스템으로 이동

**4. 발행 구독 패턴으로 레거시 DB 쓰기**





