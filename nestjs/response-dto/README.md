부제: 이제 @Exclude() 와 @Expose() 반복 코드는 그만!

## Table of Contents
1. [들어가기 앞서](#들어가기-앞서)
2. [데코레이터에 대해서](#데코레이터에-대해서)
    1. [프로퍼티 데코레이터](#프로퍼티-데코레이터)
    2. [클래스 데코레이터](#클래스-데코레이터)
3. [ResponseDto 데코레이터 만들기](#ResponseDto-데코레이터-만들기)
4. [class-transformer 살펴보기](#class-transformer-살펴보기)


## 들어가기 앞서,
현재 회사에서 NestJS 프레임워크로 개발된 모든 프로젝트에서는 HTTP 응답값에 대해선 모두 DTO 클래스로 관리하고 있습니다.  
그래서 응답 DTO의 형태는 대부분 아래와 같이 private 프로퍼티를 선언하고, getter 프로퍼티를 통해 값을 반환하는 형태로 구성되게 됩니다.

```typescript
export class UserResponse {
  private _id: number;
  private _name: string;

  constructor(user: User) {
    this._id = user.id;
    this._name = user.name;
  }

  id(): number {
    return this._id;
  }

  name(): string {
    return this._name;
  }
}
```

추가로 @Expose(), @Exclude() 데코레이터를 통해 JSON 응답값으로 역직렬화하여 내보내는 프로퍼티를 제어하고 있습니다.
(@Expose(), @Exclude() 데코레이터에 대한 자세한 내용은 [이곳](https://docs.nestjs.com/techniques/serialization#class-transformer)을 참고해주세요.)  
그래서 위의 코드는 아래와 같이 변경되어지게 됩니다.

```typescript
import { Expose, Exclude } from 'class-transformer';

export class UserResponse {
  @Exclude() private _id: number;
  @Exclude() private _name: string;

  constructor(user: User) {
    this._id = user.id;
    this._name = user.name;
  }

  @Expose()
  id(): number {
    return this._id;
  }

  @Expose()
  name(): string {
    return this._name;
  }
}
```
하지만 결과적으로 우리는 여기서 아래와 같은 반복적인 패턴이 보여지게 됩니다.
- private 프로퍼티에는 @Exclude() 데코레이터를 사용하여 역직렬화에서 제외시킨다.
- getter 프로퍼티에는 @Expose() 데코레이터를 사용하여 역직렬화한다.

이러한 반복적인 코드 패턴은 사실 우리를 너무 지루하게 만들고 생산성을 떨어뜨립니다.  
그래서 조금 더 간결하게 코드를 작성할 수 있는 클래스 데코레이터를 만들어보는 방법을 알아보도록 하겠습니다.  

## 데코레이터에 대해서
앞서 보여줬던 예제 코드에서 @Expose(), @Exclude()는 모두 데코레이터로 선언되어 있습니다.  
우선 데코레이터란 **TypeScript에서 클래스, 메소드, 프로퍼티, 매개변수등에 적용되어지며 해당 메타데이터의 접근, 수정, 확장을 할 수 있는 함수**입니다.  
데코레이터는 선언앞에 `@`을 붙여 사용되어질 수 있으며 런타임에서 실행되어집니다.  

각각의 데코레이터들에 대한 자세한 내용은 [TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/decorators.html)에서 확인할 수 있으며 이 중에서 프로퍼티, 클래스 데코레이터만 알아보도록 하겠습니다.  

### 프로퍼티 데코레이터
프로퍼티 데코레이터 함수는 아래와 같은 2개의 인자를 가지고 있습니다.
- target: 클래스의 prototype 객체
- propertyKey: 프로퍼티의 이름


첫번째 인자인 `target`은 클래스의 prototype 객체를 뜻하는데 여러분은 prototype 객체가 무엇인지 잘알고 계신가요?  
만약 생소하시다면, 우리는 여기서 한번 짚고 넘어가야 할 JavaScript의 prototype 객체에 대한 이해가 필요합니다.  
자바스크립트의 모든 객체는 자신의 부모 역할을 담당하는 객체와 연결되어 있습니다.   
그리고 이것은 마치 객체 지향의 상속 개념과 같이 부모 객체의 프로퍼티 또는 메소드를 상속받아 사용할 수 있으며 이러한 부모 객체를 Prototype(프로토타입) 객체 또는 줄여서 Prototype(프로토타입)이라 합니다.  
그래서 우리는 자바스크립트는 프로토타입 기반의 객체지향 언어라고 표현하며 실제로 클래스와 getter 프로퍼티 사이에서도 이 프로토타입을 통해 연결되어 있는데요.  
실제 코드상으로도 쉽게 확인할수 있습니다.

```typescript
class A {
  get b(): string {
     return 'Hello!' 
  }
}
```
위 코드를 js로 컴파일하면 아래와 같이 Object.defineProperty() 메소드에서 속성을 추가할때 첫번째 인자로 프로토타입 객체를 받고 있습니다. 
그리고 두번째 인자로 선언된 getter 프로퍼티의 이름인 `b`를 받아 해당 프로퍼티를 추가하고 있습니다.


```javascript
var A = /** @class */ (function () {
  function A() {
  }
  Object.defineProperty(A.prototype, "b", {
    get: function () {
      return 'aa';
    },
    enumerable: false,
    configurable: true
  });
  return A;
}());
```
정리를 하자면 클래스 내부의 프로퍼티를 클래스 `prototype`프로퍼티가 가리키는 프로토타입 객체에 추가되며, (프로토타입의 확장)   
아래와 같이 클래스에 의해 생성된 모든 인스턴스는 프로토타입 체인을 통해 참조할 수 있게됩니다. 
```ts
const a = new A();
a.b; // 'Hello!'
```
(자바스크립트 프로토타입에 대한 좀더 자세한 내용은 다른 글에 정리해보도록 하겠습니다.)

두번째 인자인 `propertyKey`는 프로퍼티의 이름을 나타내는데요.  
위 얘제 코드에서는 `b`이므로 `propertyKey`는 `b`가 되게 됩니다.

### 클래스 데코레이터
다음 우리가 만들려는 클래스 데코레이터에 대해서도 간단히 알아보겠습니다.
클래스 데코레이터는 유일하게 하나의 인자만을 가지고 있습니다.
- target: 클래스의 생성자 함수

유일한 인자인 `target`은 클래스의 생성자 함수를 나타내며, 클래스의 `prototype`객체를 가리키는 것은 아닙니다.  
클래스의 `prototype`객체를 가리키고 싶다면 `target.prototype`로 접근할수 있으며 이는 프로퍼티 데코레이터에서의 첫번째 인자와 같습니다.
```ts
@decorator
class A {
  get b(): string {
     return 'Hello!' 
  }
}

function decorator(target: Function) {
  console.log(target.prototype.b); // 'Hello!'
}
```

간단하게 데코레이터의 정의와 사용법에 대해서 알아보았는데요.  
이제 우리가 만들어야할 class 데코레이터인 ResponseDto 데코레이터를 만들어 보겠습니다.

## ResponseDto 데코레이터 만들기
ResponseDto 데코레이터 역할은 다음과 같습니다.
```
1. 해당 클래스의 getter 프로퍼티에 @Expose() 데코레이터 적용 
2. 해당 클래스의 프로퍼티에 @Exclude() 데코레이터 적용 
3. 해당 클래스의 getter 프로퍼티에 @Expose() 데코레이터가 이미 적용되어진 경우 무시 
```

먼저 1,2 번을 구현하기위해선 다음과 같은 의사 코드를 작성할수 있습니다.

```
1) @Exclude() 데코레이터 클래스에 적용
2) 클래스에 선언된 프로퍼티들 조회
3) 2)에서의 프로퍼티들을 순회하며 getter 프로퍼티 조회
4) 3)에서의 getter 프로퍼티들을 순회하며 @Expose() 데코레이터 적용
```
참고) @Exclude() 데코레이터를 클래스 데코레이터로 적용하고 프로퍼티에 @Expose() 데코레이터를 적용하면 해당 프로퍼티는 제외되지 않고 응답에 포함됩니다.
```ts
import { Exclude, Expose, instanceToPlain } from 'class-transformer';

@Exclude()
class Sample {
  _field: string;

  constructor(field: string) {
    this._field = field;
  }

  @Expose()
  get getField() {
    return this._field;
  }
}

const result = instanceToPlain(new Sample('test'));

console.log(result); //  { getField: 'test' }
```

이제 위 의사 코드를 참고하여 ResponseDto 데코레이터를 구현해보겠습니다.
```ts

import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export function ResponseDto() {
  return function (target: any) {
    Exclude()(target.prototype); // 1. @Exclude() 데코레이터 클래스 prototype에 선 적용

    const properties = Object.getOwnPropertyNames(target.prototype); // 2. 클래스에 선언된 프로퍼티들 조회

    // 3. 해당 클래스의 getter 메소드에 @Expose() 데코레이터가 이미 적용되어진 경우 무시 
    properties
      .filter((key) => isGetter(target.prototype, key))
      .forEach((key) => Expose()(target.prototype, key));
  };

  function isGetter(prototype: any, key: string): boolean {
    return !!Object.getOwnPropertyDescriptor(prototype, key)?.get;
  }
}
```

## class-transformer 살펴보기
앞서 `@ResponseDto` 데코레이터를 구현을 해보았는데요. 아직 마지막으로 남은 미션이 존재합니다.  
```
3. 해당 클래스의 getter 메소드에 @Expose() 데코레이터가 이미 적용되어진 경우 무시 
```
이 미션을 해결하기 위해서는 `class-transformer`의 내부 동작을 이해해야 합니다.  
그래서 각각의 라이브러리들을 하나씩 파헤쳐보겠습니다. ㄲㄲ

@Expose() 데코레이터를 선언할때 해당 내부 로직은 아래와 같습니다.   

[expose.decorator.ts](https://github.com/typestack/class-transformer/blob/develop/src/decorators/expose.decorator.ts)
```ts
import { defaultMetadataStorage } from '../storage';

export function Expose(options: ExposeOptions = {}): PropertyDecorator & ClassDecorator {
  return function (object: any, propertyName?: string | Symbol): void {
    defaultMetadataStorage.addExposeMetadata({
      target: object instanceof Function ? object : object.constructor,
      propertyName: propertyName as string,
      options,
    });
  };
}
```
위 코드에서도 확인할수 있다시피 `defaultMetadataStorage`라는 객체를 통해 메타데이터를 관리하고 있고 `MetadataStorage` 객체 자체가 하나의 `storage` 역할을 담당하고 있습니다.   
`MetadataStorage` 파일을 확인해보면 좀더 자세한 코드들을 확인할 수 있습니다.  

[MetadataStorage.ts](https://github.com/typestack/class-transformer/blob/c8ea951b92921e728442a61c63e5fbcc9dd258bf/src/MetadataStorage.ts#L7)
```ts
export class MetadataStorage {
  private _exposeMetadatas = new Map<Function, Map<string, ExposeMetadata>>();
  // ...

  addExposeMetadata(metadata: ExposeMetadata): void {
    if (!this._exposeMetadatas.has(metadata.target)) {
      this._exposeMetadatas.set(metadata.target, new Map<string, ExposeMetadata>());
    }
    this._exposeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
  }
  
  // ...

  findExposeMetadata(target: Function, propertyName: string): ExposeMetadata {
    return this.findMetadata(this._exposeMetadatas, target, propertyName);
  }
  
  // ...
}
```
코드를 살펴 보니 MetadataStorage 객체에서 `findExposeMetadata`메소드를 활용해서 프로퍼티가 현재 @Expose 데코레이터를 가지고있는지 확인할수 있겠군요.🙂  
근데 조금 아쉬운 점은 **아직 `class-transformer`에서 `defaultMetadataStorage`를 public api로 구현되지않아서 직접적으로 접근이 불가능한 이슈가 존재합니다.**  
=> [관련 이슈](https://github.com/typestack/class-transformer/issues/563)

그래서 라이브러리의 ts 코드가 아닌 js 코드로 직접 import및 접근해서 사용해야 합니다.  
```ts
import { Exclude, Expose } from 'class-transformer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

export function ResponseDto() {
  return function (target: any) {
    // ...
    const properties = Object.getOwnPropertyNames(target.prototype);

    properties
      .filter(
        (key) =>
          isGetter(target.prototype, key) &&
          !defaultMetadataStorage.findExposeMetadata(target, key), // 해당 클래스의 getter 메소드에 @Expose() 데코레이터가 이미 적용되어진 경우 무시 
      )
      .forEach((key) => Expose()(target.prototype, key));
    // ...
  };
  
}
```
