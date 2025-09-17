## RAG Search

- RAG 에 대한 설명은 1_ai_기초지식 에서 정의

### Prerequisites

```
PUT /_cluster/settings
{
  "persistent": {
    "plugins.ml_commons.memory_feature_enabled": true,
    "plugins.ml_commons.rag_pipeline_feature_enabled": true
  }
}

```

- 연결할 ai model 생성


### Development

- amazon SageMaker ai 를 사용
- DeepSeek 모델 사용
- [RAG using DeepSeek-R1 in Amazon SageMaker](https://docs.opensearch.org/latest/tutorials/gen-ai/rag/rag-deepseek-r1-sagemaker) 해당 내용 참고

#### [Step 1: Create an IAM role for Amazon SageMaker access](https://docs.opensearch.org/latest/tutorials/gen-ai/rag/rag-deepseek-r1-sagemaker/#step-1-create-an-iam-role-for-amazon-sagemaker-access)

#### [Step 2: Configure an IAM role in Amazon OpenSearch Service](https://docs.opensearch.org/latest/tutorials/gen-ai/rag/rag-deepseek-r1-sagemaker#step-2-configure-an-iam-role-in-amazon-opensearch-service)

#### Step 3: Create a connector

3-1. Step 2 에서 생성한 iam arn으로 aws credential 생성
```
> aws sts assume-role --role-arn <<ste2 iam role arn>> --role-session-name <<session custom name>>
```

3-2. 생성된 credential 을 기반으로 아래 코드 실행
```ts
// 1. 환경 변수 또는 ~/.aws/credentials에서 AWS 자격증명 자동 로드
const region = 'ap-northeast-2'; // 예: 'ap-northeast-2'
const host = ''; // opensearch domain endpoint
const service = 'es';

const payload = {
  name: 'DeepSeek R1 model connector',
  description: 'Connector for my Sagemaker DeepSeek model',
  version: '1.0',
  protocol: 'aws_sigv4',
  credential: {
    roleArn:
      '', // step 1 iam role arn
  },
  parameters: {
    service_name: 'sagemaker',
    region: region,
    do_sample: false,
    top_p: 0.01,
    temperature: 0.01,
    max_new_tokens: 512,
  },
  actions: [
    {
      action_type: 'PREDICT',
      method: 'POST',
      url: '', // 생성한 sagemaker endpoint url
      headers: {
        'content-type': 'application/json',
      },
      request_body:
        '{ "inputs": "${parameters.inputs}", "parameters": {"do_sample": ${parameters.do_sample}, "top_p": ${parameters.top_p}, "temperature": ${parameters.temperature}, "max_new_tokens": ${parameters.max_new_tokens}} }',
      post_process_function: `if (params.result == null || params.result.length == 0) {
    throw new Exception('No response available');
  }
  
  def completion = params.result[0].generated_text;
  return '{' +
           '"name": "response",'+
           '"dataAsMap": {' +
              '"completion":"' + escape(completion) + '"}' +
         '}';`,
    },
  ],
};

// 2. AWS 자격증명 로드
const credentialsProvider = defaultProvider();
const credentials = await credentialsProvider();

// 3. HTTP 요청 객체 생성
const path = '/_plugins/_ml/connectors/_create';
const endpoint = new URL(host);
const request = new HttpRequest({
  protocol: endpoint.protocol,
  hostname: endpoint.hostname,
  port: endpoint.port ? Number(endpoint.port) : undefined,
  method: 'POST',
  path: path,
  headers: {
    'Content-Type': 'application/json',
    Host: endpoint.hostname,
  },
  body: JSON.stringify(payload),
});

// 4. SigV4 서명
const signer = new SignatureV4({
  credentials,
  service,
  region,
  sha256: Sha256,
});

const signedRequest = await signer.sign(request);

// 5. axios로 요청 전송
try {
  const response = await axios({
    method: 'POST',
    url: host + path,
    headers: signedRequest.headers,
    data: JSON.stringify(payload),
  });
  console.log(response.data);
} catch (err) {
  if (err.response) {
    console.error('Error:', err.response.status, err.response.data);
  } else {
    console.error('Error:', err.message);
  }
}
```
3.3 `console.log(response.data)` 의 결과물로 `{"connector_id":"<connector id>"}` 반환

####  [Step 4: Create and test the model](https://docs.opensearch.org/latest/tutorials/gen-ai/rag/rag-deepseek-r1-sagemaker#step-4-create-and-test-the-model)


####  [Step 5: Configure RAG](https://docs.opensearch.org/latest/tutorials/gen-ai/rag/rag-deepseek-r1-sagemaker#step-4-create-and-test-the-model)

