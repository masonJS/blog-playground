## group by 쿼리 로직의 수행 차이

아래 쿼리를 수행햇을때 pg는 에러, mysql는 에러가 나지 않음
```sql
select
    a.id,
    b.id
from
    a
left join b on a.id = b.a_id
group by a.id
```

### 원인
db 엔진에서 functional dependency(함수적 종속성)을 판별하는 기준이 달라 발생하는 이슈     
- **pg** - groupBy절에 테이블의 pk가 포함되어야 조회 쿼리 가능 (`b.id` 조회시 에러)
- **mysql** - join, unique not null 까지 functional dependency을 가능 하도록 판단

[참고 블로그](https://myeongil.tistory.com/entry/Mysql-%EA%B3%BC-PostgreSQL-GroupBy-%EC%B0%A8%EC%9D%B4)


## transaction isolation level - lost update 동작 방식 차이

트랜잭션 격리 수준 REPEATABLE_READ 로 설정후 lost update 발생시 동작 방식 차이

- **mysql** - lost update 발생
- **pg** - lost update 발생하지 않고 에러 발생
  - **First-Updater-Win**
    - 행을 기준으로 먼저 커밋된 트랜잭션으로 인해 행의 데이터가 변경되었을시 커밋되지 못하고 롤백이 된다.


참고 문서 
- `./database/transaction_isolation_level/README.md`

