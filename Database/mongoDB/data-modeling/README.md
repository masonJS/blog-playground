# Data Modeling

## BSON
- MongoDB는 데이터를 BSON(Binary JSON) 형태로 저장한다.
- BSON은 JSON의 확장된 형태로, JSON의 모든 데이터 타입을 지원하며 추가로 날짜, 바이너리 데이터, 정규표현식, JavaScript 코드 등을 지원한다.
- BSON은 JSON과 유사하게 Key-Value 형태로 데이터를 저장한다.
- MongoDB는 단일 BSON 객체의 최대 크기가 16MB이다.
 
### Arrays vs Documents
- Arrays
  - 배열은 동일한 데이터 타입의 데이터를 저장한다.
  - 배열의 요소는 0부터 시작하는 인덱스를 가진다.
  - 배열의 요소는 순서가 있으며, 중복된 값을 가질 수 있다.
- Documents
  - 문서는 Key-Value 형태로 데이터를 저장한다.
  - 문서는 중첩될 수 있으며, 중첩된 문서는 배열로 표현할 수 있다.
  - 문서는 순서가 없으며, 중복된 값을 가질 수 없다.

## Document Model
### Array
- 배열의 인덱싱을 통해 배열안 요소를 검색할 수 있다. (multikey index)
- 배열을 처리하는 연산자 존재
    - $elemMatch / $all / $size / $push / $pop / $pull / $pullAll / $each
    - 전체 배열을 업데이트 하는 것이 아닌, 배열의 특정 요소를 업데이트을 강력히 권고
- 배열은 원시 타입 뿐만 아니라 객체도 포함
  - 객체 배열은 두 컬렉션을 하나로 결합하는 경우 사용
  - 모델을 단순화 하는 방법

###  RelationShip
- Document 디자인은 관계를 표현하는 두 가지 기본 방법을 제공 
- Embedding은 한 문서를 다른 문서 안에 중첩하는 것을 포함. 
- Linking은 참조를 통해 문서를 연결하는 것을 포함.
- 임베딩과 링크 중 어떤 것을 선택할지는 데이터의 특성과 애플리케이션의 요구 사항에 따라 결정

#### Embedding
- 장점
  - 단일 쿼리/문서에서 모든 관련 정보를 검색
  - 애플리케이션 코드($lookup)에서 조인 구현을 피할수 있음.
  - 단일 원자 연산으로 관련 정보 업데이트 트랜잭션이 필요 없음.
- 단점
  - 중복된 데이터가 발생할 수 있음
  - 중복된 데이터를 업데이트하는 경우 모든 중첩된 문서를 업데이트해야 함
  - 중첩된 문서가 커지면 문서의 크기가 커질 수 있음
  - 중첩된 문서가 커지면 쿼리 성능이 저하될 수 있음
  - 16MB 제한이 있음

#### Linking
- 장점
  - 더 작은 documents
  - 16 mb 제한을 피할 수 있음
  - 중복된 데이터를 피할 수 있음
- 단점
  - 정보 검색을 위해 두번 쿼리(또는 $lookup)가 필요
  - 관련 정보를 원자적으로 트랜잭션 없이 업데이트하기 어려움

#### Atomicity
```
- Document operations are atomic ( Embed )

db.patients.updateOne(
 {_id: 12345},
 {
      $inc : {numProcedures : 1},
      $push : {procedures : “proc123”},
      $set : {“addr.state” : “TX”}
  } 
)

- Multi-document transactions ( Link )

s1.startTransaction();
db.patients.updateOne({_id: 12345}, ...);
db.procedure.insertOne({_id: “proc123”, ...});
db.records.insertOne({_id: “rec123”, ...});
s1.commitTransaction();
```
    
### Relation Type and Best Practices
- One-to-One
- One-to-Many
- Many-to-One
- Many-to-Many 

- [참고 정리 문서](https://masondev.notion.site/MongoDB-Schema-Design-Best-Practices-24975cc2b79b475fbe62a792a8e4b9ab?pvs=4)

## Schema Design Patterns
 
- Attributes
- Extended Reference Subset
- Bucket
- Computed
- Schema Versioning
