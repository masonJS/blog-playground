## Join


### 조인 쿼리 최적화
- on 또는 using 절의 열에 인덱스가 있는지 확인
  - 인덱스를 추가할때 조인 순서 고려
  - 쿼리 옵티마이저가 A,B 두 테이블을 B,A순으로 조인하기로 결정하면 A 테이블만 인덱싱
  - 사용하지 않은 인덱스는 추가 오버헤드 발생
  - 일반적을로 다른 이유로 필요하지 않은 이상 조인 순서의 두번째 테이블에만 인덱스 추가


- 지연된 조인으로 limit offset 최적화
  - 인덱스에서 가능한 한 적은 데이터를 조회한후 조건에 맞은 행을 발견하면 조인하여 다른 열을 조회한다.

```sql
[AS-IS]
select * from job_seeker OFFSET 150000 LIMIT 10000;

[TO-BE]
SELECT * FROM job_seeker
  INNER JOIN (
    select job_seeker.id from job_seeker OFFSET 150000 LIMIT 10000
) AS lim USING (id);
```
