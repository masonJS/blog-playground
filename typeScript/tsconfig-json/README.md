# tsconfig.json

nestjs에서 프로젝트 생성시 만들어주는 tsconfig.json에서 변경하여 사용하는 설정들에 대해 정리해보았다.

```json
{
  // ...
  
  "strict": true,
  "strictNullChecks": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": false,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitOverride": true,
  "forceConsistentCasingInFileNames": true,
  "noFallthroughCasesInSwitch": true,
  "useUnknownInCatchVariables": false
}

```

### strict - true
- 광범위한 유형 검사 동작을 활성화하여 프로그램의 정확성을 보장한다.
- 이 옵션을 켜면 아래의 모든 엄격 모드 옵션들을 활성화하는 것과 동일하며 그런 다음 필요에 따라 개별 엄격 모드 패밀리 검사를 해제할 수 있다.
   - `strictNullChecks` 
   - `strictBindCallApply` 
   - `strictFunctionTypes` 
   - `strictPropertyInitialization` 
   - `useUnknownInCatchVariable`

### strictNullChecks - true
- 위 `strict` 옵션으로 활성화 할수 있으며 null 이나 undefined 가 가능한 타입을 참조하는 경우 항상 optional chaining 같은 nullable 검증을 하도록 강제한다. 
- undefined 에러와 null 참조 에러를 최대한 막기위해 사용한다.

### strictPropertyInitialization - false
- 이 옵션을 true로 하게 되면 클래스 프로퍼티가 선언되었지만 생성자에서 설정되지 않은 경우 TypeScript는 오류를 발생시킨다.
```ts
class UserAccount {
  name: string;
  accountType = "user";
 
  email: string;
Property 'email' has no initializer and is not definitely assigned in the constructor.
  address: string | undefined;
 
  constructor(name: string) {
    this.name = name;
    // Note that this.email is not set
  }
}
```
- 하지만 entity 에서 required 필드의 기본값을 항상 적어주어야 하는 불편함으로 인해 false 로 변경하였다.
```ts
@Entity() // TypeORM이 테이블 <-> Object 변환 대상로 판별
export class Sample extends BaseTimeEntity {
  @Column()
  name: string; // TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.

}
```

### noImplicitAny - true
- typescript 의 typesafe 기능을 최대한 활용하기 위해 필수로 켜야하는 옵션이라고 생각한다. 
- 상황에 따라 명시적으로 any 를 써야하는 경우도 있지만 최대한 any 를 사용하지 않도록 강제한다.


### noUnusedLocals / noUnusedParameters - true
- 사용하지 않는 로컬변수와 파라미터를 항상 제거하도록 강제한다. 
- 이 구문은 import 문에도 적용되며 사용하지 않는 import 구문을 정리하도록 강제한다.

### noImplicitOverride - true
- 어떤 클래스를 상속하고 상속한 클래스의 프로퍼티를 override 하는 경우 override 키워드를 항상 넣도록 강제한다.
```ts
abstract class Foo {
  bar: string;
  abstract myFn(): number;
}

class Test extends Foo {
  override bar: string;
  override myFn(): number {
    return 3;
  }
}
```

### forceConsistentCasingInFileNames - true
- 이 옵션을 true로 하게 되면 파일 이름이 대소문자를 구분지어 작성되어야 한다.
- 하지만 운영체제에 따라 파일 이름이 대소문자를 구분하지 않는 경우가 있어서 false 로 변경하였다.

### noFallthroughCasesInSwitch - true
- 이 옵션을 true로 하게 되면 switch 문에서의 강제적인 case fall-through(케이스 진입 후 다음 케이스로의 전환)를 방지한다.
- switch 문에서의 강제적인 fall-through를 방지하고, 케이스 간의 명시적인 break나 return을 강제화하여 코드의 실수나 오류를 방지한다.

### useUnknownInCatchVariables = false
- typescript 4.4 버전에서 try / catch 구문에서 catch 의 파라미터 타입이 unknown 으로 변경되었다. 
  - 이 옵션을 false 로 하면 다시 any 로 변경된다. 
- unknown 으로 유지하는게 가장 좋은 방법이지만 기존 any 로 사용하던 코드가 상당히 있던 상태인 경우 false 변경한다.
