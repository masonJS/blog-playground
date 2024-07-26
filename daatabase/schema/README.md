## Schema


### 공통

- `boolean`타입 보다는 `varchar`타입을 최우선 고려
  - 값을 yes / no 라는 값으로만 제한하면 확장성에 떨어진다.
  - 또다른 상태값이 추가되면 부차적인 추가 칼럼이 필요하다.
  - 애플리케이션에서 `enum` 그리고 DB에선 `varchar`타입으로 관리하는 것이 좋다.
  - [참고글](https://jojoldu.tistory.com/577)
- `number` 와 `boolean` 타입은 최대한 `not null` 선언
  - `null` 이라는 값으로 인해 논리적인 복잡성 초래 - `null` 과 `0` 의 차이는 무엇인지?
  - 통계 함수 사용시 `null` 값은 제외되는 이슈
  - 쿼리 조건 복잡도 증가 - `is null` / `is not null` 조건문 추가
  - 애플리케이션 코드 복잡성 증가
  - [참고글](https://jojoldu.tistory.com/718)
- `enum`타입보다는 `varchar`타입을 사용
  - `enum`타입의 값 목록을 변경하려면 `ALTER TABLE`문을 사용해야 된다. 
    - 이렇게 하면 대규모 테이블의 경우 시간이 많이 걸릴 수 있음.
  - `enum`값은 내부적으로 정수로 저장되기 때문에 알파벳 순서대로 정렬되지 않을 수 있음.
    - 이로 인해 예상치 못한 정렬 결과를 얻을 수 있음.
  - 데이터베이스는 저장소 역할 그 이상을 하면 안됨.
    - `enum`을 사용하는 것은 데이터베이스에 비즈니스 로직이 포함되는 것이나 마찬가지인데 이로 인해 데이터와 애플리케이션 로직 간의 경계가 모호해짐.
    - 서비스가 커짐에 따라 데이터는 MongoDB / Redis / S3와 같은 파일 저장 시스템 / 다른 Cell의 분리된 프로젝트 등 데이터베이스가 아닌 곳으로 관리될 확률이 높음.
    - 데이터베이스에 의존한 기능 구현을 할때마다 서비스 확장, 더 나은 솔루션의 도입할때마다 마이그레이션 대상이 넓어짐.
- `varchar`타입의 길이는 최대한 짧게


### Mysql

#### DateTime vs TimeStamp

**범위**    
- DateTime: 1000-01-01 00:00:00 ~ 9999-12-31 23:59:59
- TimeStamp:
  - ~ ver 8.0.27 : 1970-01-01 00:00:00 ~ 2038-01-19 03:14:07
  - ver 8.8.28 ~ : 1970-01-01 00:00:00 ~ 3001-01-19 03:14:07

**저장 공간**   
- DateTime: 8byte
- TimeStamp: 4byte

**시간대 기준**    
- DateTime: 시스템 시간대
- TimeStamp: UTC

[참고글-1](https://dev.mysql.com/doc/refman/8.2/en/date-and-time-functions.html#function_from-unixtime)
[참고글-2](https://medium.com/finda-tech/mysql-timestamp-%EC%99%80-y2k38-problem-d43b8f119ce5)



### PostgreSQL

#### TimeStamp with Time Zone vs TimeStamp [without Time Zone]

**저장 공간**
- TimeStamp with Time Zone: 8byte
- TimeStamp without Time Zone: 8byte

**시간대 기준**
- TimeStamp with Time Zone: UTC
- TimeStamp without Time Zone: 시스템 시간대
