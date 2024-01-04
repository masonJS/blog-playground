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
- pg - groupBy절에 테이블의 pk가 포함되어야 조회 쿼리 가능 (`b.id` 조회시 에러)
- mysql - join, unique not null 까지 functional dependency을 가능 하도록 판단

[참고 블로그](https://myeongil.tistory.com/entry/Mysql-%EA%B3%BC-PostgreSQL-GroupBy-%EC%B0%A8%EC%9D%B4)

