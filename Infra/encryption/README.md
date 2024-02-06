# Encryption SDK

암호화된 데이터의 보안은 데이터를 암호화시킨 데이터 키를 보호하는데 달려있다.     
데이터 키를 보호하는 방법중 하나는 데이터 키를 암호화하는 것이다.       
데이터 키를 암호화려면 암호화 키 또는 래핑 키라고 하는 또 다른 암호화 키가 필요하다.       
래핑 키를 이용해 데이터 키를 암호화하는 방법을 **봉투 암호화**라고 한다.

### Envelope Encryption - 봉투 암호화

**데이터 키 보호**        
AWS Encryption SDK는 봉투 암호화를 사용하여 데이터 키를 보호한다.       
먼저 메시지를 고유 데이터 키로 암호화한후 사용자가 설정한 래핑 키로 데이터 키를 암호화 한다. (keyring or master key provider를 통해)        
그리고 암호화된 데이터와 암호화된 데이터 키를 조합해 만들어진 암호화된 메시지를 반환한다.
1. 데이터 키(대칭키 암호화) + plainText -> 암호화된 데이터
2. 래핑키(대칭키 or 비대칭키 암호화) + 데이터 키 -> 암호화된 데이터 키
3. 암호화된 데이터 + 암호화된 데이터 키 -> 암호화된 메시지
<center><img src="envelope-encryption-70.png"></center>

### Keyrings - 키링 

AWS Encryption SDK JavaScript을 사용하면 Keyrings(키링)을 통해 봉투 암호화를 수행할수 있다.   
**키링은 데이터 키를 생성후 암복호화 하는 작업을 수행하게 된다.**    
AWS KMS 서비스를 통해 래핑키를 만든후 키링을 사용할수 있는데 KMS 키에 유효한 키 식별자(키 ID, 키 ARN, 키 별칭, 별칭 ARN)을 사용하여 키링을 구성하게 된다.    
별칭을 사용했을때 해당 별칭에 연결된 키 ARN을 저장하며 별칭을 저장하지는 않는다.      
그래서 별칭을 변경하더라도 데이터 키를 해독하는데 사용되는 KMS 키에는 영향을 미치지 않는다.

KMS 키링에는 두가지 유형의 래핑 키가 포함될 수 있다.
- Generator Key (생성키) - plainText 데이터 키를 생성하고 암호화한다. 생성키는 하나만 가질수 있다.
- Additional Key (추가키) - 생성키로 암호화된 데이터 키를 암호화한다. 추가키는 여러개 가질수 있다.

**암호화할 때 사용하는 KMS 키링에 생성자 키가 있어야 하고 복호화할 때 생성자 키는 선택 사항이며 생성자 키와 추가 키의 구분은 무시된다.**  
**또한, KMS 키링안에 키를 식별하기위한 식별자가 있어야 하며, 암호화 단계에서 키 ID, 키 ARN, 별칭 이름 또는 별칭 ARN을 사용하여 데이터를 암호화할 수 있다.
반면 복호화 단계에서는 키 ARN만 사용할 수 있다.**

#### 키링으로 암호화 과정
1. KMS 키링을 구성한다.
2. KMS 키링을 사용하여 데이터 키를 암호화한다.
3. 데이터 키로 데이터를 암호화한다.
4. 데이터 키를 없앤다.
5. 암호화된 데이터 키와 암호화된 데이터를 조합하여 암호화된 메시지를 만든후 반환한다.

```ts

const generatorKeyId = '' // 생성키 식별자 -> required
const keyIds = [''] // 추가키 식별자 -> optional

const keyring = new KmsKeyringNode({ generatorKeyId, keyIds })

const plaintext = 'Hello World'
const { result } = await encrypt(keyring, plaintext) // 암호화
```

#### 키링으로 복호화 과정
1. 암호화된 데이터 키를 복호화할 수 있는 AWS KMS 키 조회
2. 조회된 KMS 키를 사용해 복호화
3. 복호화된 데이터 키를 사용해 암호화된 데이터를 복호화

```ts
const keyIds = [''] // 생성키 or 추가키 식별자 -> required

const keyring = new KmsKeyringNode({ keyIds })

const { plaintext } = await decrypt(keyring, result) // 복호화
```

### Data Key Caching - 데이터 키 캐싱
매번 암호화를 할때마다 데이터 키를 생성하는 것은 비용이 많이 든다.
또한 초당 AWS KMS 키링 요청수 제한이 있기 때문에 애플리케이션의 확장을 위해 데이터 키 캐싱이 필요하다.

AWS Encryption SDK는 로컬 캐시와 캐시와 상호 작용하고 사용자가 설정한 보안 임계값을 적용하는 [caching CMM](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-caching-details.html#caching-cmm)을 제공하여 데이터 키 캐싱을 지원한다. (보안 임계값 - 캐시 만료 시간, 캐시 크기)     
데이터 암호화, 복호화에 데이터 키 캐싱을 사용하는 경우, AWS Encryption SDK는 먼저 캐시에서 요청과 일치하는 데이터 키를 검색한다.      
그리고 유효한 일치 항목을 찾으면 캐시된 데이터 키를 사용하여 데이터를 암호화하고 그렇지 않으면 캐시가 없을 때와 마찬가지로 새 데이터 키를 생성한다.    

**데이터 키 캐싱 예제**

```ts
import {
  KmsKeyringNode,
  buildClient,
  CommitmentPolicy,
  NodeCachingMaterialsManager,
  getLocalCryptographicMaterialsCache,
} from '@aws-crypto/client-node'

const { encrypt, decrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
);


function getKmsKeyring() {
  const generatorKeyId = '';
  const keyIds = [''];
  return new KmsKeyringNode({ generatorKeyId, keyIds })
}

function getCachingCMM(keyring: KmsKeyringNode) {
  const capacity = 100 // 최대 캐시할 데이터 키 수
  const cache = getLocalCryptographicMaterialsCache(capacity) // 로컬 캐시

  const maxAge = 1000 * 60 // 캐시 유효 시간 ms 단위

  const cachingCMM = new NodeCachingMaterialsManager({
    backingMaterials: keyring,
    cache,
    maxAge,
  })
}

async function encrypt(plaintext: string): Promise<{ result: any }> {
  const cachingCMM = getCachingCMM(getKmsKeyring())
  
  return await encrypt(cachingCMM, plaintext, { plaintextLength: plaintext.length }) // 암호화
}

async function decrypt(encryptedText: string): promise<{ plaintext: string }> {
  const cachingCMM = getCachingCMM(getKmsKeyring())
    
  return await decrypt(cachingCMM, encryptedText) // 복호화
  
}
```


