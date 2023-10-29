# Encryption SDK

## 개념 잡기

### Envelope Encryption - 봉투 암호화

암호화된 데이터의 보안은 데이터를 암호화시킨 데이터 키를 보호하는데 달려있다.     
데이터 키를 보호하는 방법중 하나는 데이터 키를 암호화하는 것이다.       
데이터 키를 암호화려면 암호화 키 또는 래핑 키라고 하는 또 다른 암호화 키가 필요하다.       
래핑 키를 이용해 데이터 키를 암호화하는 방법을 **봉투 암호화**라고 한다.

**데이터 키 보호**        
AWS Encryption SDK는 봉투 암호화를 사용하여 데이터 키를 보호한다.       
먼저 메시지를 고유 데이터 키로 암호화한후 사용자가 설정한 (이때 설정은 keyring or master key provider를 통해 할수 있다.) 래핑 키로 데이터 키를 암호화 한다.        
그리고 암호화된 데이터 키를 반환하는 암호화된 메세지에 암호화된 메시지를 함께 저장한다.

데이터를 암호화하기 위한 알고리즘과 데이터 키를 암호화하기 위한 알고리즘을 각각 지정할수 있다.       
일반적으로 대칭 키 암호화 알고리즘은 비대칭 또는 공개 키 암호화보다 더 빠르고 더작은 암호 텍스트를 생성한다. (대표적으로 대칭 키 알고리즘은 AES 알고리즘을 사용한다.)       
하지만 공개 키 알고리즘은 내재적으로 역할이 분리되어 있고 키 관리가 더 쉽다.         
각각의 장점을 취하기 위해 대칭 키 암호화로 데이터를 암호화 한 다음 공개 키 암호화로 데이터 키를 암호화할수 있다.
<center><img src="envelope-encryption-70.png"></center>

### Keyrings and master key providers - 키링 및 마스터 키 제공자

암호화 및 복호화에 사용하는 래핑 키를 지정하려면 키링 또는 마스터 키 공급자를 사용한다.

키링은 데이터 키를 생성, 암호화 및 암호 해독을 한다.     
키링을 정의할 때 데이터키를 암호화하는 래핑 키를 지정할 수 있다.       
마스터 키도 키링의 대안점으로 사용할 수 있다.
두 방법을 지원하기 위한 프로그래밍 언어가 다르다.

- keyring - C, C# / .NET, JavaScript
- master key provider - Java, Python

### AWS KMS를 사용해 키링 구성

KMS 키에 유효한 키 식별자(키 ID, 키 ARN, 키 별칭, 별칭 ARN)을 사용하여 키링을 구성할 수 있다.      
별칭을 사용했을때 해당 별칭에 연결된 키 ARN을 저장하며 별칭을 저장하지는 않는다.      
그래서 별칭을 변경하더라도 데이터 키를 해독하는데 사용되는 KMS 키에는 영향을 미치지 않는다.   

AWS KMS 키링에는 두가지 유형의 래핑 키가 포함될 수 있다.
- Generator Key (생성키) - plainText 데이터 키를 생성하고 암호화한다. 생성키는 하나만 가질수 있다.
- Additional Key (추가키) - 생성키로 암호화된 데이터 키를 암호화한다. 추가키는 여러개 가질수 있다.

암호화할 때 사용하는 AWS KMS 키링에 생성자 키가 있어야 하고 복호화할 때 생성자 키는 선택 사항이며 생성자 키와 추가 키의 구분은 무시된다.      

AWS KMS 키링안에 키를 식별하기위한 식별자가 있어야 하며,  
암호화 단계에서 키 ID, 키 ARN, 별칭 이름 또는 별칭 ARN을 사용하여 데이터를 암호화할 수 있다.
반면 복호화 단계에서는 키 ARN만 사용할 수 있다.

### Encrypting data with an AWS KMS keyring

```ts

const generatorKeyId = '' // 생성키 식별자 -> required
const keyIds = [''] // 추가키 식별자 -> optional

const keyring = new KmsKeyringNode({ generatorKeyId, keyIds })

const plaintext = 'Hello World'
const { result } = await encrypt(keyring, plaintext) // 암호화
```

### Decrypting data with an AWS KMS keyring

```ts
const keyIds = [''] // 생성키 or 추가키 식별자 -> required

const keyring = new KmsKeyringNode({ keyIds })

const { plaintext } = await decrypt(keyring, result) // 복호화
```
