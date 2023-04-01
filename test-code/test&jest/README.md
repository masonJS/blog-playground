## 테스트 코드를 작성하는 방법 with Jest

이전 시간에 *테스트 코드를 왜 작성해야되는가?*에 대해 얘기를 해보았다.  
테스트 코드의 중요성을 알았다면 무작정 테스트를 위한 테스트 코드를 작성을 해보면 되는 것인가?에 대한 물음에는

"아니다"

라고 말할수 있다.  
테스트 코드도 **코드**이다. 우리가 좋은 코드를 작성하기 위함 처럼 테스트 코드도 좋은 테스트 코드를 작성하기 위한 방법이 있다.    
그래서 이번 시간에는 테스트 코드를 잘 작성하기 위한 방법을 알아보도록 하자.

현재 회사에서 typescrpt와 jest 프레임워크로 테스트 코드를 작성하고 있기 때문에 예제 코드는 해당 언어와 프레임워크로 사용하였다.


## 첫번째. 테스트 코드는 DRY 보다는 DAMP 하게 작성하라.

개발 원칙중 우리는 DRY 원칙을 많이 들어봤을 것이다.  
DRY 원칙은 **Don't Repeat Yourself**의 약자로 중복을 피하라는 원칙이다.  
개발자인 우리는 중복 코드를 싫어한다. 그래서 우리는 중복 코드가 보이면 그것을 어떻게든 없애려고 하는 경향이 있다.  
근데 테스트 코드는 중복을 줄이기 전에 DAMP 하게 작성하는 것이 고려해봐야 한다.

DAMP 원칙은 **Descriptive and Meaningful Phrases**의 약자로 의미있고 설명적인 구문을 사용하라는 원칙이다.

이 원칙을 이해하기 위해 예제 코드를 보자.  
아래와 같이 지원자에 대한 최종합격과 불합격에 대한 테스트코드가 작성되어있다.

```typescript
describe('지원자', () => {
  it('지원자를 최종합격시킨다.', () => {
    const name = 'haru';
    const status = JobApplicantStatus.IN_PROGRESS;
    const jobApplicant = JobApplicant.create(name, status);

    jobApplicant.pass();

    expect(jobApplicant.status).toBe(JobApplicantStatus.PASS);
  });

  it('지원서를 불합격시킨다.', () => {
    const name = 'haru';
    const status = JobApplicantStatus.IN_PROGRESS;
    const jobApplicant = JobApplicant.create(name, status);

    jobApplicant.fail();

    expect(jobApplicant.status).toBe(JobApplicantStatus.FAIL);
  });
});
```

우리는 작성된 테스트 코드를 보고 약간 불편함을 느낄수 있다.  
왜냐하면 위 테스트 코드에서 중복으로 보여지는 코드가 있기 때문이다.  
아시다시피 지원서를 생성하는 코드에서 아래의 3줄의 코드가 두 테스트 코드에서 중복으로 사용되고 있다.

```typescript
  const name = 'haru';
  const status = JobApplicantStatus.IN_PROGRESS;
  const jobApplicant = JobApplicant.create(name, status);
```

그래서 우리는 이 불편함을 없애기 위해 중복을 없애는 방법으로 아마 두가지 방법이 떠오를 것이다.  
- 전역 변수로 빼기
- 테스트 각각의 실행 전 수행되는 beforeEach(setup 메소드)로 빼기

두 가지 방법중 필자는 beforeEach 메소드에 해당 중복 코드를 빼서 리팩터링을 해보았다.
```typescript

describe('지원자', () => {
  let jobApplicant: JobApplicant;
  
  beforeEach(() => {
    const name = 'haru';
    const status = JobApplicantStatus.IN_PROGRESS;
    jobApplicant = JobApplicant.create(name, status);
  });
  
  
  it('지원자를 최종합격시킨다.', () => {
    jobApplicant.pass();

    expect(jobApplicant.status).toBe(JobApplicantStatus.PASS);
  });

  it('지원서를 불합격시킨다.', () => {
    jobApplicant.fail();

    expect(jobApplicant.status).toBe(JobApplicantStatus.FAIL);
  });
});
```
위와 같이 중복을 제거해 DRY 원칙을 지켜 리팩터링을 하였다.    
그런데 이렇게 작성된 테스트 코드는 과연 잘 작성된 테스트 코드라고 할수 있을까?

만약 추가적인 "지원서를 불합격 상태일때 보관할수 있다."라는 기능이 들어가 테스트 코드를 아래와 같이 추가해보았다.
```typescript
// ...

it('지원서를 불합격 상태일때 보관할수 있다.', () => {
  jobApplicant.putStorage();

  expect(jobApplicant.isStorage).toBe(true);
});
```
테스트 코드를 추가하고 실행했더니 테스트가 실패하였다.   
왜냐하면 우리는 불합격 상태인 지원서를 보관하기위해 putStorage 메소드를 호출하였지만,      
beforeEach 메소드에서 지원자 상태를 불합격(FAIL) 상태가 아닌 진행중(IN_PROGRESS)으로 초기화를 하였기 때문에 테스트가 실패한 것이다.    
이 과정에서 실패의 원인을 파악하기 위해 그리고 테스트를 다시 성공시키위해 우리는 beforeEach 메소드를 파악하면서 수정해야 할것이다.    

즉 테스트 코드를 작성하는 사람도 이 테스트 코드를 파악하는 사람도 어려운 테스트가 되어졌다.

*이유가 무엇일까?* 

바로 **테스트 코드의 중복을 줄이면서 테스트 간의 결헙도를 높였기 때문이다.**  
테스트를 위해 `status`를 전역 변수인 공유 상태로 둠으로서 테스트의 수정이 어려워지고 다른 테스트간의 영향을 주는 코드가 만들어진 것이다.  

여기서 끝이 아니다. **이 테스트는 이전보다 가독성이 떨어졌다.**    
우리는 테스트를 추가하거나 수정할때 마다 항상 beforeEach 메소드를 파악해야 한다.    
그래서 개별 테스트 안을 보고는 이제 코드 전체를 파악할수 없게되었다.  

이러한 문제를 해결하기 위해 테스트 코드의 리팩토링은 중복을 줄이는 것이 아니라 더 서술적이고 의미있게 작성하는 방향으로 이루어져야 한다.    
오히려 무작정 코드의 중복을 줄이면 테스트간의 격리성이 떨어지고 테스트 본래의 의도가 점점 모호해지면서 의도파악을 제대로 할수 없게되어진다.

### Better:
>- 테스트의 중복을 줄이는 것이 아니라 더 서술적이고 의미있게 작성하는 방향으로 리팩터링을 해야한다.
>- 테스트는 서로 독립적이고 격리되어야 하기때문에 테스트 수정에 다른 테스트가 영향을 받지 않도록 해야한다.
```typescript
describe('지원자', () => {
  it('지원자를 최종합격시킨다.', () => {
    const name = 'haru';
    const status = JobApplicantStatus.IN_PROGRESS;
    const jobApplicant = JobApplicant.create(name, status);

    jobApplicant.pass();

    expect(jobApplicant.status).toBe(JobApplicantStatus.PASS);
  });

  it('지원서를 불합격시킨다.', () => {
    const name = 'haru';
    const status = JobApplicantStatus.IN_PROGRESS;
    const jobApplicant = JobApplicant.create(name, status);

    jobApplicant.fail();

    expect(jobApplicant.status).toBe(JobApplicantStatus.FAIL);
  });

  it('지원서를 불합격 상태일때 보관할수 있다.', () => {
    const name = 'haru';
    const status = JobApplicantStatus.FAIL;
    const jobApplicant = JobApplicant.create(name, status);
    jobApplicant.putStorage();

    expect(jobApplicant.isStorage).toBe(true);
  });
});
```


## 두번째. 테스트는 구현이 아닌 결과를 검증하도록 한다.

우리는 테스트를 할때 빠른 테스트를 위해 모의 객체를 사용할때가 있다.  
모의 객체로 mock, spy, stub 등을 사용하는 경우 테스트 코드를 작성할때 테스트 대상의 구현을 알아야만 테스트를 작성할수 있다.  
그런데 이 부분을 남용하거나 잘못 사용하여 테스트를 작성하는 경우가 종종 있다.

예를 들어 아래와 같이 지원자를 합격 상태로 변경하기 전에 지원자의 현재 불합격이거나 취소상태가 아닌 경우에만 합격 시킬수 있는 조건이 있다고 가정하자.

```typescript

export class JobApplicant {
  updatePass() {
    this.validateIsNotCancel();
    this.validateIsNotFail();
    
    // 유효성 검증 통과후 상태 변경 
  }

  validateIsNotFail(): void {
    // 검증
  }

  validateIsNotCancel(): void {
    // 검증 
  }
}
```

우리는 지원서의 상태를 합격으로 변경하는 테스트를 작성을 jest의 spyOn 메소드를 이용해 아래와 같이 작성할 수 있다.
```typescript

it('지원서를 합격시킨다.', () => {
  const jobApplicant = new JobApplicant();

  jest
    .spyOn(jobApplicant, 'validateIsNotCancel')
    .mockReturnValue(undefined);
  jest
    .spyOn(jobApplicant, 'validateIsNotFail')
    .mockReturnValue(undefined);

  jobApplicant.updatePass();

  expect(jobApplicant.validateIsNotCancel).toBeCalledTimes(1); // 호출되었는지 검증
  expect(jobApplicant.validateIsNotFail).toBeCalledTimes(1);
  expect(jobApplicant.status).toBe(JobApplicantStatus.PASS);
});
```
이렇게 작성한 후에 우리는 합격 상태 변경에 대한 검증 뿐만 아니라 `validateIsNotCancel`와 `validateIsNotFail` 메소드가 호출되었는지 검증을 해서 더 완벽한 테스트라고 생각할 수도 있다.

하지만 이 테스트는 깨지기 쉬운 테스트이면서 좋은 테스트가 아니다.  
만약 validateIsNotCancel 메소드의 네이밍이 변경되거나 validateIsNotFail 메소드가 삭제가 되면 이 테스트는 실패하게 된다.  

즉 구현에 의존적이며 테스트의 목적이 구현에 맞춰져 있다.  
내부 구현이나 비공개(private) 메소드들은 언제든지 바뀔 여지가 있는 코드이기 때문에 정보의 은닉을 위해 숨기는데 테스트하기위함을 목적으로 다시 정보를 꺼내여 사용하는 것은 좋지 않은 방법이다.  
테스트 코드는 항상 내부 구현이 아닌 실행 결과에 집중해야 한다.

이 코드에 아쉬운 점이 또 하나 더 있다. 바로 **호출되었는지에 대한 검증**이다.
```typescript
  expect(jobApplicant.validateIsNotCancel).toBeCalledTimes(1); // 호출되었는지 검증
  expect(jobApplicant.validateIsNotFail).toBeCalledTimes(1);
```
이 검증 자체는 의미가 없는 검증과도 마찬가지이다.  
이 테스트의 검즘 목적은 `expect(jobApplicant.status).toBe(JobApplicantStatus.PASS)`로 충분하다.  
오히려 이 테스트가 검증하고 싶은 목적을 흐리게 만들뿐이며 테스트 코드를 이해하는데 방해가 된다.

지나친 모의 객체 남용과 내부 구현 검증은 오히려 리팩터링의 내성을 떨어뜨리고 유지보수를 더 어렵게 만든다.  
그래서 **어떻게 라는 내부 구현 검증보다는 무엇을 이라는 결과 검증에 집중하여 테스트 코드를 작성해야 한다.**

### :Better
>- 테스트 코드는 내부 구현이 아닌 실행 결과에 집중해야 한다. 
>- 의미있는 테스트, 검증을 하자.
```typescript
it('지원서를 합격시킨다.', () => {
  const jobApplicant = new JobApplicant();

  jobApplicant.updatePass();

  expect(jobApplicant.status).toBe(JobApplicantStatus.PASS);
});

it.each([
  ['취소', JobApplicantStatus.CANCEL],
  ['불합격', JobApplicantStatus.FAIL],
])(
  '%s 상태의 지원서는 합격시킬수 없습니다',
  (_, status) => {
    const jobApplicant = new JobApplicant();
    jobApplicant.status = status;

    expect(() => jobApplicant.updatePass()).toThrowError();
  },
);
```

## 세번째, 불명확한 테스트를 작성하지 말자.


## 네번째, 테스트 명세에 비즈니스 행위를 담도록 한다.

