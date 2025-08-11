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
