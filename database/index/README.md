## 인덱스


### B-Tree 인덱스

- Balanced Tree (균형 트리)구조를 이용한 인덱스
- 디스크와 메모리(버퍼풀)에 데이터를 읽고 쓰는 최소 작업 단위인 페이지 단위로 저장 
- 인덱스 키를 바탕으로 항상 정렬된 상태를 유지한다.
- 정렬된 인덱스 키를 따라서 리프 노드에 도달하면 (인덱스 키, PK) 쌍으로 저장

[참고글](https://mangkyu.tistory.com/286)


### PostgreSQL Partial Index
PostgreSQL 부분 인덱스는 전체 테이블이 아닌 테이블 행의 하위 집합에 대해 구축되는 인덱스 유형 
- `WHERE`이 하위 집합은 인덱스 생성 문의 절 에 지정된 조건에 따라 결정
- Partial Index 을 사용하는 이점
  - 성능 최적화
  - 저장 공간 절약
  
- ex) 삭제된 데이터에 대한 인덱스를 생성하지 않는 경우
```sql
CREATE INDEX access_log_client_ip_ix ON access_log (deleted_at)
WHERE deleted_at IS NOT NULL;
```
[참고글](https://www.postgresql.org/docs/current/indexes-partial.html)
