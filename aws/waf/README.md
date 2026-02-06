## WAF

### WAF 란 무엇인가?
- Web Application Firewall(웹 애플리케이션 방화벽)
- 웹의 비정상 트래픽을 탐지하고 차단하기 위한 방화벽
- 네트워크 및 전송 계층(L3 및 L4)뿐만 아니라 애플리케이션 계층(L7)에 대한 웹 프로토콜(HTTP)정보를 바탕으로 차단 룰 설정
- 정의된 규칙에 대한 탐지율을 높이고 오탐율을 낮추는것이 목표

### 웹 ACL
- 웹 ACL을 사용하면 CloudFront, Amazon API Gateway, ALB 등과 같은 AWS 리소스를 보호할수 있다.

### 규칙
- 규칙 타입
  - Regular Rule 
    - 일반 규칙
  - Rate-based Rule
    - IP 주소로부터 5분 내에 도달하는 요청하는 개수 측정기준
  - Managed Rule
    - AWS 팀에서 정의한 주요 보호 규칙

- 규칙 action
  - Allow
    - 정의된 규칙에 탐지된 요청을 허용 
  - Block
    - 정의된 규칙에 탐지된 요청을 차단
  - Count
    - 웹 요청을 허용하거나 차단 하기전에 개수를 측정후 다음 순위의 rule로 보내버림.
    - 생성된 rule에 대한 요청 탐지율 측정을 위해
    - 개발 환경에서 생성된 rule 이 어떤 요청에 매칭되는지 테스트
  - CAPTCHA

### 로깅 
  - CloudWatch
  - S3
    - 5분간격 로그 전송
  - Kinesis Data Firehose

참고 글
- [AWS WAF - AWS WAF, AWS Firewall Manager, 및 AWS Shield Advanced](https://docs.aws.amazon.com/ko_kr/waf/latest/developerguide/waf-chapter.html) 
- [AWS WAF의 가장 중요한 세가지 속도 기반 규칙 | Amazon Web Services](https://aws.amazon.com/ko/blogs/tech/three-most-important-aws-waf-rate-based-rules/)
- [AWS Managed Rules for AWS WAF 기능 출시 | Amazon Web Services](https://aws.amazon.com/ko/blogs/korea/announcing-aws-managed-rules-for-aws-waf/) 
- [AWS WAF 운영에 대한 이야기 | 우아한형제들 기술블로그](https://techblog.woowahan.com/2699/) 



