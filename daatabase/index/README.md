## 인덱스

### 인덱스 기본 개념
- 인덱스는 디스크에서 읽는 데이터량을 줄여 쿼리 속도를 높이는 데이터베이스 객체
- PostgreSQL의 데이터는 8KB 크기의 **페이지**로 구성된 **힙(heap)**에 저장되며, 각 행은 **ctid**(현재 튜플 ID)로 식별
- 인덱스는 컬럼 값을 힙의 행 위치(ctid)와 연결하는 트리 구조
- 일반적으로 전체 테이블의 **15~20% 미만**을 반환하는 쿼리에서 효과적

### 인덱스의 비용
- **디스크 공간**: 인덱스는 추가 저장소를 차지하며, B-Tree 인덱스가 테이블보다 클 수도 있음
- **쓰기 오버헤드**: INSERT, UPDATE, DELETE 시 인덱스도 함께 업데이트
- **쿼리 플래너**: 인덱스가 많을수록 실행 계획 수립에 더 많은 시간 소요
- **메모리 사용**: 인덱스가 공유 버퍼에 로드되어 테이블 데이터 캐싱 효율을 떨어뜨릴 수 있음


### B-Tree 인덱스

- Balanced Tree (균형 트리)구조를 이용한 인덱스 (PostgreSQL 기본 인덱스 타입)
- 디스크와 메모리(버퍼풀)에 데이터를 읽고 쓰는 최소 작업 단위인 페이지 단위로 저장
- 인덱스 키를 바탕으로 항상 정렬된 상태를 유지한다.
- 정렬된 인덱스 키를 따라서 리프 노드에 도달하면 (인덱스 키, PK) 쌍으로 저장
- O(log n) 시간 복잡도로 검색 가능 (100만 건 기준 약 20번의 비교로 탐색)
- 유일키, 기본키 제약조건 지원
- 정렬(ORDER BY)과 조인 작업에 효율적

#### 1. 복합 인덱스
- `(a, b)` 형태로 왼쪽 컬럼부터 순서대로 사용 가능
- **Skip Scan**: 복합 인덱스에서 선행 컬럼이 WHERE 조건에 없어도 인덱스를 활용하는 기법
  - 선행 컬럼의 고유 값(distinct values)을 순회하며 각각에 대해 후행 컬럼을 탐색
  - 선행 컬럼의 **카디널리티가 낮을수록** 효과적 (예: gender, status, type 등)
  - 고유 값이 많으면 skip 횟수가 많아져 오히려 비효율적
  - Oracle: 오래전부터 지원 / MySQL: 8.0.13+ / PostgreSQL: 18부터 지원 예정
```
-- 인덱스 (gender, age) 에서 WHERE age = 25 검색 시
일반 스캔:  인덱스 사용 불가 → Full Table Scan
Skip Scan: gender='F', age=25 탐색 → gender='M', age=25 탐색 → 완료
```

#### 2. 커버링 인덱스 
- `INCLUDE` 절로 리프 노드에만 추가 컬럼을 저장하여 힙 접근 없이 인덱스 전용 스캔(Index Only Scan) 가능

```sql
CREATE INDEX idx_covering ON users (email) INCLUDE (name, created_at);
```

#### 3. 표현식 인덱스 
- 컬럼 값이 아닌 함수/연산 결과를 인덱싱
- WHERE 절에서 컬럼에 함수를 적용하면 일반 인덱스가 무시되므로, 해당 표현식 자체를 인덱싱하여 해결
- 쿼리의 WHERE 절이 인덱스 생성 시 사용한 표현식과 **정확히 일치**해야 적용됨
- PostgreSQL Expression index:
  ```sql
  CREATE INDEX idx_lower_name ON users (LOWER(name));
  CREATE INDEX idx_json_email ON users ((data->>'email'));
  ```
- MySQL Functional Index (8.0.13+):
  ```sql
  CREATE INDEX idx_lower_name ON users ((LOWER(name)));
  CREATE INDEX idx_year ON orders ((YEAR(created_at)));
  CREATE INDEX idx_json_email ON users ((CAST(data->>'$.email' AS CHAR(100))));
  ```

#### 4. 부분 인덱스
PostgreSQL 부분 인덱스는 전체 테이블이 아닌 테이블 행의 하위 집합에 대해 구축되는 인덱스 유형
- `WHERE`이 하위 집합은 인덱스 생성 문의 절 에 지정된 조건에 따라 결정
- Partial Index을 사용하는 이점
  - 성능 최적화
  - 저장 공간 절약
- ex) 삭제된 데이터에 대한 인덱스를 생성하지 않는 경우
```sql
CREATE INDEX access_log_client_ip_ix ON access_log (deleted_at)
WHERE deleted_at IS NOT NULL;
```
[참고글](https://www.postgresql.org/docs/current/indexes-partial.html)


### Hash 인덱스
- 해시맵처럼 작동하여 **등호(=) 연산만 지원** (범위 검색, 정렬 불가)
- UUID나 URL 같은 긴 데이터에서 B-Tree보다 인덱스 크기가 작음
- 복합 인덱스와 유일성 검사 미지원
```sql
CREATE INDEX idx_hash_email ON users USING hash (email);
```


### BRIN 인덱스 (Block Range Index) - PostgreSQL 에서 사용
- 페이지 범위의 최소/최대값만 저장하여 매우 컴팩트한 인덱스
- **추가 전용(append-only) 테이블**, 시계열 데이터에 최적
- 데이터가 물리적으로 정렬된 상태일 때 효과적 (행이 자주 UPDATE되면 비효율적)
- 대규모 테이블에서 순차 스캔을 최적화
```sql
CREATE INDEX idx_brin_created ON events USING brin (created_at);
```


### GIN 인덱스 (Generalized Inverted Index) - PostgreSQL 에서 사용
- 역 인덱스 구조로 텍스트의 단어, 배열의 항목, JSONB 객체 검색에 적합
- `tsvector`(전체 텍스트 검색), `jsonb`, `array` 타입에서 효과적
- 조회 성능이 우수하지만 인덱스 크기가 크고 쓰기 비용이 높음
```sql
CREATE INDEX idx_gin_tags ON articles USING gin (tags);
CREATE INDEX idx_gin_body ON articles USING gin (to_tsvector('english', body));
```


### GiST / SP-GiST 인덱스
- **GiST** (Generalized Search Tree): 균형 트리 구조. 기하학 타입, inet, 범위(range), 전체 텍스트 검색 지원
- **SP-GiST** (Space-Partitioned GiST): 비균형 트리 구조. 쿼드트리, k-d 트리 등 공간 분할에 적합
- 전체 텍스트 검색 시 GIN이 조회는 빠르지만 크기가 크고 유지비용이 높음, GiST는 상대적으로 가볍지만 조회가 느림
```sql
CREATE INDEX idx_gist_location ON places USING gist (location);
```

[참고글](https://dlt.github.io/blog/posts/introduction-to-postgresql-indexes/)



### ESR(동등성, 정렬, 범위) 복합 인덱스

```sql
DROP PROCEDURE IF EXISTS CreateTTTables;
DROP PROCEDURE IF EXISTS CreateJJTables;

DELIMITER $$

CREATE PROCEDURE CreateTTTables()
BEGIN
    DECLARE i INT DEFAULT 1;

    -- 1. 숫자용 임시 테이블 생성 (10,000개)
    DROP TEMPORARY TABLE IF EXISTS temp_numbers;
    CREATE TEMPORARY TABLE temp_numbers
    (
        n INT PRIMARY KEY
    );

    SET @j = 1;
    WHILE @j <= 1000000
        DO
            INSERT INTO temp_numbers VALUES (@j);
            SET @j = @j + 1;
        END WHILE;

    -- 2. 테이블 생성 및 데이터 삽입 루프
    WHILE i <= 2
        DO
            SET @table_name = CONCAT('TT_', i);

            -- 테이블 생성
            SET @create_query = CONCAT(
                    'CREATE TABLE ', @table_name, ' (
                ID INT PRIMARY KEY,
                UserName VARCHAR(50),
                DeptCode INT,
                JoinDate DATE,
                SalesAmount DECIMAL(18,2)
            )'
                                );
            PREPARE stmt FROM @create_query;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;

            -- 데이터 삽입
            SET @insert_query = CONCAT(
                    'INSERT INTO ', @table_name, ' (ID, UserName, DeptCode, JoinDate, SalesAmount)
             SELECT
                n,
                CONCAT("User", FLOOR(RAND()*1000)),
                FLOOR(RAND()*50)+1,
                DATE_ADD("2024-01-01", INTERVAL FLOOR(RAND()*365) DAY),
                ROUND(RAND()*10000, 2)
             FROM temp_numbers'
                                );
            PREPARE stmt FROM @insert_query;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;

            SET i = i + 1;
        END WHILE;
END$$

DELIMITER ;


DELIMITER $$

CREATE PROCEDURE CreateJJTables()
BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= 2
        DO
            SET @table_name = CONCAT('JJ_', i);

            -- 조인 테이블 생성 (동일 스키마)
            SET @create_query = CONCAT(
                    'CREATE TABLE ', @table_name, ' LIKE TT_', i
                                );
            PREPARE stmt FROM @create_query;
            EXECUTE stmt;

            -- 데이터 복제 (TT → JJ)
            SET @copy_query = CONCAT(
                    'INSERT INTO ', @table_name, ' SELECT * FROM TT_', i
                              );
            PREPARE stmt FROM @copy_query;
            EXECUTE stmt;

            SET i = i + 1;
        END WHILE;
END$$

DELIMITER ;

-- 1. 기본 테이블 생성
CALL CreateTTTables();
-- 2. 조인 테이블 생성
CALL CreateJJTables();


-- 위 처럼 TT테이블 JJ테이블에 데이터 100만건씩 넣어서 만들어야하구요

EXPLAIN SELECT a.UserName,
       b.SalesAmount
FROM TT_1 a
         JOIN JJ_1 b
              ON a.DeptCode = b.DeptCode
WHERE a.JoinDate BETWEEN '2024-01-01' AND '2024-12-31'
  AND a.DeptCode = 42
ORDER BY a.id;

-- 위 쿼리가 비즈니스적으로 굉장히 많이 호출되어야한다는 가정입니다.
-- 위 쿼리가 최고의 성능을 낼 수 있도록 TT테이블 JJ테이블에 index 한개씩 추가해야합니다.

```

위 문제를 풀기위해 esr index 라는 개념을 배우게됨.   
아래와 같이 복합 인덱스 생성시 최적화 
- TT_1 - (DeptCode, id, JoinDate, UserName)
- JJ_1 - (DeptCode, SalesAmount)


참고글
- https://www.mongodb.com/ko-kr/docs/manual/tutorial/equality-sort-range-guideline/#the-esr--equality--sort--range--guideline
- https://dev.to/mongodb/mongodb-equality-sort-range-esr-without-equality-sr-add-an-unbounded-range-predicate-on-the-2j9n
