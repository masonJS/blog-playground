# 이벤트가 왜 필요할까?

이 장에선, 이벤트 기반 프로그래밍을 알기 전에 이벤트가 과연 왜 필요한지에 대해서 알아보겠습니다.     
랠릿에서 채용 지원서를 관리하는 담당자가 지원자를 최종합격으로 변경시 해당 지원자에게 최종합격에 대한 알림을 메일과 카톡알림으로 전송하는 기능이 있습니다.

<img src="img.png" width="600">

위 로직은 현재 하나의 DB트랜잭션에 지원서 상태 변경 과 알림 전송 기능으로 묶여져 있는것을 확인할 수 있습니다.    
가시적으로 봤을때 크게 문제가 되지 않을 구현이라고 생각이 드는데요.

하지만 여기서는 자그만치 4가지 정도의 문제점을 찾아볼 수 있습니다.
<br><br>
### 첫번째는, 외부서비스가 정상이 아닐때 트랜잭션 처리를 어떻게 해야할지 애매해집니다.

예를 들어, 지원서가 최종합격 처리가 된 후에 알림 전송 로직이 실패했을때 트랜잭션을 롤백해야되는 것인가에 대한 가정입니다.       
당연히 알림 전송이 실패했으니 지원서 상태 변경도 실패 및 롤백되어야 한다라고 생각하는 사람도 있습니다.      
하지만 반대로 알림 전송은 나중에 다시 시도해도 되는 부분이니 메인 대상 도메인인 지원서 상태 변경을 실패시키지 않도록 해야 한다라고 생각하는 사람도 있습니다.       
결국, 외부시스템과의 연동을 통해 트랙잰션의 범위가 모호해지는 문제가 발생하게 됩니다.
<br><br>
### 두번째는, 성능에 대한 부분입니다.

알림 전송하는 로직을 확인해보면 메일과 카카오톡 알림 전송 로직인 것을 확인할 수 있습니다.     
만약 구글 메일 또는 카카오톡 알림 서비스의 지연 현상이 발생한다면 지원서 최종합격 변경에 대한 처리 시간이 길어지는 경우가 생기게 됩니다.      
즉, 제어할수 없는 외부 시스템으로 인해 메인 행위인 지원서 최종합격 처리가 영향을 받게 됩니다.
<br><br>
### 세번째는, 스파게티 의존성을 초래합니다.

계층형 아키텍처는 단방향 의존성을 위해 다음과 같은 규칙을 가집니다.      
- 반드시 상위 계층에서 하위 계층을 순방향으로 의존해야 합니다.

그 이외에 상위 계층 또는 동일 계층에 의존되게 되면 객체간의 참조 방향이 복잡해지게 됩니다.        
위 예시에서는 `mailService`와 `kakaoService`가 동일 서비스 레이어인 `JobApplicantService`에 의존하고 있는것을 확인할수 있습니다.       
이러한 스파게티 의존성을 가지면 변경에 대한 사이드이펙트 여파를 측정하기가 어려워져 설계의 복잡성을 초래하게됩니다.        

<img src="img_1.png" width="600">

<br><br>
### 네번째는, 주 도메인의 행위를 방해하고 있습니다.

우리가 도메인 행위가 수행될때 함께 수행되어져야 하는 정책들이 있습니다.    
위 예시에서는 `지원서 최종합격 상태 변경`이 주 도메인의 행위이자 주 관심사이며 부가적으로 `지원서 최종합격 알림 전송`은 부가적인 정책이며 비 관심사에 해당합니다.   
하나의 로직에 이렇게 주관심사와 비관심사가 혼용이되어진다면 부가 정책들이 도메인의 주 행위인 것으로 착각될 수 있으며, 의존성 관계를 확장시키고 도메인의 주 행위에 대한 응집을 방해하게 됩니다.    

이렇게 문제점들을 알아봤을때 근본적인 발생하는 원인은 **지원서라는 주 도메인 문맥과 다른 부가 도메인(알림) 문맥간의 강결합(high coupling)때문이다.**

이러한 강결합을 없애는 방법으로 우리는 이벤트를 사용할수 있습니다.

- [(레거시 시스템) 개편의 기술 - 배달 플랫폼에서 겪은 N번의 개편 경험기 | 인프콘 2022](https://www.youtube.com/watch?v=HNt3H_7muHs)
