## mongodb 2022 컨퍼런스

### 시리즈 A 스타트업이 MongoDB Atlas Search를 사용한 이유
도입 발단
비정형 데이터를 다루기위한 DynamoDB / 검색엔진을 위한 ElasticSearch

두 DB 엔진을 각각 도입하는게 현재 적정 수준의 아키텍처일까?

(DynamoDB + ElasticSearch) => MongoDB Atlas 로

도입 후
단점

부족한 국내 컨퍼런스 + 커뮤니티

ES Term Vectors API 처럼 역인덱스로 분석된 결과값을 볼수있는 api가 없음

MongoDB Atlas 용도의 도커환경이 지원되지 않아 로컬환경에서의 격리화된 테스트가 어려움

장점

MongoDB Korea 컨퍼런스의 적극적인 지원

스타트업 측면에서의 상대적인 익숙함

(스타트업에서 MongoDB의 기술 도입이 흔하다. RDB가 아닌 MongoDB를 메인 DB로 쓰는 회사도 종종 있음.)

높은 SLA (지연 및 장애 발생율)

AWS OpenSearch 1년 기준 = 8h 45m

MongoDB Atlas 1년 기준 = 26m

형태소 분석기에 대한 다양성

(CJK + Nori)등과 같은 두 개이상의 Analyzer를 하나의 필드기준으로 Multi Analyzer로 지원

도입에 대한 고민을 하는 개발자들에게
스타트업의 적정 아키텍처 소개

“최소한의 도구로 다양한 문제들을 일정 수준 이상으로 해결해야한다.”

### MongoDB 6.0의 새로운 기능
Time Series Collection
[기존]

시계열 테이블인 경우에는 대용량 데이터를 적재한다.

부족한 확장성 (테이블 및 칼럼, 인덱스 변경에 비효율적)

[6.0이전]

동일 id에 대한 데이터 compression(배열 형태로) => io 성능 최적화

Accumulator 제공

[6.0이후]

정렬 성능 최적화

Measurement 필드에 대한 성능 최적화

Cluster To Cluster Sync
클러스터(리전과 관계없이)간의 데이터 복지 & 동기화 지원

신규 환경 배포를 위한 별도 환경 구성을 위한 비용 감소

동시 양방향 Sync 지원을 제외하고 단방향 동기화 지원

Relational Migrator
RDBMS => NoSQL 간의 마이그레이션 지원

관계형에서 Mongodb에 대한 스키마 모델 정의 및 ERD 생성

데이터 복제 및 마이그레이션 제공

Atlas Search
Search 엔진과 DB 엔진의 이분화된 기존 방식을 유연하게 단순화하는 통합 플랫폼

많은 기능 지원 예정

### MongoDB Atlas Search Engine Deep-drive

사용자가 검색했을시

mongodb aggregation pipeline > $search stage 에서 검색 query 처리

검색 쿼리를 mongod(mongo demon)이 mongot(apache lucene)에게 전달

mongot에서 검색어 term 과 anaylzer되어 indexing된 term들을 비교하여 조회

mongot 에서 결과로 조회된 필드들의 objectid 와 metadata를 반환

만약 mongot에서 stored source 필드들을 정의했다면 해당 필드들도 같이 반환

반환된 필드를 기준으로 mongod에서 다음 operation(select, limit, count 등등)을 수행



** 중간에 검색엔진의 데이터 색인 과정 과 텍스트 분석방식에 대해 설명하셨는데 요 내용은 ES 개발자이신 김종민님의 가이드북에 잘나와있다.

https://esbook.kimjmin.net/06-text-analysis

Hangul Analyzer
lucene.korean

lucene.cjk 의 별칭

text를 bigram(연속된 두 개의 단어를 하나의 단어로 인식)으로 분리한다.

stopword(불용어)를 가지고 있다.(은,는,이가 와 같은 불용어)

영문/숫자 글자가 띄어쓰기 없이 붙어있을 경우 원하는 bigram으로 분리되지 않을 수 있다.

search index의 크기가 상대적으로 커진다.


한글은 아름다운 언어입니다.
[한글][글은][아름][다운][언어][어입][입니][니다]

한글은 very 아름다운 언어입니다
[한글][글은][very][아름][름다][다운][언어][어입][입니][니다]

This라는 말은 여기라는 뜻입니다.
[라는][말은][여기][기라][라는][뜻입][입니][니다]

49번문제에 대한 답은 어떻게 되나요?
[49번문제에][대한][답은][어떻][떻게][되나][나요]
lucenc.nori

세종 코퍼스 기반

문자열을 형태소로 나눈다.

품사를 통해 필터링한다.

신조어에 대해서는 정확한 형태소 분석이 제대로 되지 않는다.


한글은 아름다운 언어입니다.
[한글][아름답][언어][이]

한글은 very 아름다운 언어입니다
[한글][very][아름답][언어][이]

This라는 말은 여기라는 뜻입니다.
[this][이][말][여기][이][뜻][이]

49번문제에 대한 답은 어떻게 되나요?
[49][번][문제][대하][답][되]

이더리움을 채굴합니다
[더리][움][채굴]
Index 구성
검색에 필요한 인덱스만 선언(인덱스 크기 차지를 최소화)

Multi Analyzer 또는 각각의 선언한 Analyzer 갯수만큼 인덱스를 유지한다.

ngram 방식으로 분할 방식은 많은 양의 term을 생성 (대안책으로 edgeGram을 선택하는 것도)

[ngram 과 edgeGram의 차이]

storedSource 옵션을 잘 사용하면 mongod의 접근없이 mongot에서만 결과를 리턴할 수 있다. (약간 커버링 인덱스 느낌)

$search stage
$search 와 $match / $sort와 같이 사용하는것은 성능 저하를 발생시킨다.

$match => $search의 filter operator으로  사용

$sort => custom scoring을 사용

불필요한 highlighting 옵션 적용은 성능 저하를 발생시킨다.

