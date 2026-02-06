## OpenSearch 란?

#### OpenSearch란?        

OpenSearch는 AWS가 중심이 되어 개발한 오픈소스 분산 검색 및 데이터 분석 엔진입니다. 실시간 로그 분석, 애플리케이션 모니터링, 웹사이트 검색 등 다양한 데이터 활용에 쓰입니다. Apache 2.0 라이선스로 제공되어 누구나 자유롭게 사용, 수정, 배포, 상업화가 가능합니다.

OpenSearch의 탄생 배경       
• Elasticsearch와 AWS의 갈등:   
원래 AWS는 Elasticsearch(Elastic이 개발한 오픈소스 검색엔진)를 기반으로 한 클라우드 서비스를 제공했습니다.
Elastic은 AWS가 자신들의 오픈소스 코드를 활용해 수익을 내면서도, 기여나 비용을 지불하지 않는다고 판단해 2021년 라이선스를 Apache 2.0에서 Elastic License 2.0 및 SSPL로 변경했습니다.

• 라이선스 변경의 영향:  
Elastic License 2.0과 SSPL은 오픈소스가 아니며, 상업적 클라우드 서비스에서의 사용을 제한합니다.
이에 AWS는 기존 오픈소스 버전(7.10)을 포크하여 OpenSearch라는 새로운 프로젝트를 시작했습니다.

• 오픈소스 정신의 계승:  
OpenSearch는 완전한 오픈소스(OSI 승인 Apache 2.0)로, 누구나 자유롭게 사용할 수 있습니다.
Elastic은 2024년 AGPLv3를 도입하며 다시 오픈소스 라이선스를 추가했지만, OpenSearch는 처음부터 오픈소스 원칙을 고수해왔습니다.

#### Amazon OpenSearch Service

AWS는 OpenSearch를 기반으로 한 관리형 클라우드 서비스(Amazon OpenSearch Service)를 제공합니다.     
이 서비스는 클러스터 관리, 모니터링, 확장 등 인프라 운영 부담을 줄여줍니다.        
기존 Elasticsearch 7.10까지는 지원하지만, 그 이후 버전은 오픈소스가 아니므로 OpenSearch만 지원합니다.
