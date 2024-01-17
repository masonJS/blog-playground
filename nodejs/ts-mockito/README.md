# ts-mockito 사용시 발생하는 이슈

ts-mockito를 활용하여 서비스 계층 단위 테스트 수행중 발생된 이슈에 대한 글이다.

## 이슈 발생

QueryRepository 클래스를 mocking 하여 단위 테스트를 수행하게 되면 테스트 Time out이 발생한다.
![스크린샷 2022-03-10 오후 7 29 50](https://user-images.githubusercontent.com/93308798/157643239-92132f85-8d41-4ee2-9219-c4db758dbb86.png)


원인을 찾아보다가 문제를 발생시키는 요인은 QueryRepostiory 메인 코드에서 사용되는 `then`이라는 것을 알게 되었다.

> The **`Promise.resolve()`** method returns a `[Promise]`
 object that is resolved with a given value. If the value is a promise, that promise is returned; **if the value is a thenable (i.e. has a `["then" method]`), the returned promise will "follow" that thenable, adopting its eventual state**
>

MDN에서 정의되어진대로 then은 promise  resolved 상태를 처리하기 위한 메소드인데

ts-mokito 에서 mock 객체가 then() 메소드를 포함하고 있으면 promise로 간주되어 resolve 되기를 기다리지만 그 부분이 처리되지 않아 계속 대기 상태에 빠져 버리는 것이다.

더 재미난 것은 **해당 then 메소드를 주석처리 해도 timeout 에러가 발생하는데** 이유는 클래스 모킹을 처리하는 코드에서 클래스를 toString()메소드로 string 타입으로 변환 시킨후 커스텀한 함수([MockableFunctionsFinder](https://github.com/NagRock/ts-mockito/blob/master/src/utils/MockableFunctionsFinder.ts))를 통해 파싱 및 처리하고 있다.

```tsx
private processClassCode(clazz: any): void {
    const classCode = typeof clazz.toString !== "undefined" ? clazz.toString() : "";
    const functionNames = this.mockableFunctionsFinder.find(classCode);
    functionNames.forEach((functionName: string) => {
        this.createMethodStub(functionName);
        this.createInstanceActionListener(functionName, this.clazz.prototype);
    });
  }
```

## 해결 방안

= **“then 메소드를 제거한다.”**

1. 메인 코드에 then() 메소드를 사용하지 않는다.
2. 테스트 코드에서 then() 메소드를 사용하지 않는다.

1.의 방안은 테스트 코드를 위해 메인 코드를 훼손시키는 건 주객전도 같은 느낌이 든다.

2.의 방안으로 ts-mokito 의 `instance()`가 아닌`instance()`을 proxy 객체로 감싸 then() 메소드을 무시하도록 하는 것으로 해결하기로 했다.

```ts
export const mockInstance = <T extends Record<string, any>>(mock: T) =>
  new Proxy<T>(instance(mock), {
    get(target, prop: PropertyKey, receiver: unknown) {
      if (['then', 'catch'].includes(prop.toString())) {
        return undefined;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
```
