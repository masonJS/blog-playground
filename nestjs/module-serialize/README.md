# NestJS module 직렬화 경고 이슈

## 문제 발견
NestJS 애플리케이션을 실행하던 중 다음과 같은 경고 메시지를 마주했다.

```
The module "MongooseModule" is taking 60.54ms to serialize, 
this may be caused by larger objects statically assigned to the module. 
More details: https://github.com/nestjs/nest/issues/12738
```

---
## NestJS 모듈 직렬화란?

### 모듈 직렬화의 목적

NestJS는 의존성 주입(DI) 컨테이너를 구성할 때 각 모듈을 고유하게 식별해야 한다. 이를 위해 **모듈 토큰(Module Token)**을 생성하는데, 이 과정에서 모듈의 메타데이터를 **문자열로 직렬화(Serialize)**한다.

```typescript
// nest/packages/core/injector/module-token-factory.ts
const opaqueToken = {
  id: moduleId,
  module: this.getModuleName(metatype),
  dynamic: dynamicModuleMetadata,  // 👈 동적 모듈 메타데이터
};
const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken);
return this.hashString(opaqueTokenString);
```

### 왜 직렬화가 필요한가?

1. **모듈 캐싱**: 동일한 설정의 모듈이 여러 번 import되어도 한 번만 인스턴스화
2. **순환 참조 방지**: 모듈 그래프에서 중복 등록 방지
3. **디버깅 지원**: 모듈 식별자를 통한 문제 추적

### 동적 모듈과 정적 모듈의 차이

```typescript
// 정적 모듈 - 직렬화할 동적 메타데이터 없음
@Module({
  providers: [{ provide: 'TOKEN', useValue: complexObject }],
})
class StaticModule {}

// 동적 모듈 - forRoot()가 반환하는 객체 전체를 직렬화
@Module({})
class DynamicModule {
  static forRoot() {
    return {
      module: DynamicModule,
      providers: [
        { provide: 'TOKEN', useValue: complexObject },  // 👈 이 객체가 직렬화됨
      ],
    };
  }
}
```

동적 모듈에서 `useValue`로 복잡한 객체를 제공하면, 해당 객체가 통째로 직렬화되어 성능 저하가 발생한다.

---

## 환경 분석

문제가 발생한 모듈 구조는 다음과 같았다.

```typescript
@Global()
@Module({
  imports: [
    MongooseModule.forFeature(schemas),  // 👈 120개+ 스키마
  ],
  providers: [],
  exports: [MongooseModule.forFeature(schemas), ...],
})
export class MongoDBConfigModule {}
```

`schemas` 배열을 확인해보니 **120개 이상의 스키마**가 등록되어 있었다.

---

## 원인 분석

### GitHub 이슈 #12738의 발견

해당 경고 메시지의 출처인 GitHub 이슈를 확인했다. 이슈 제목은 다음과 같았다:

> **"Extremely slow startup performance when a dynamic module provides a complex object using useValue"**

### 핵심 원인: useValue vs useFactory

NestJS 메인테이너 **jmcdo29**의 분석에 따르면:

> `useValue` provider는 `InstanceWrapper`를 생성할 때 값을 **즉시 참조**해야 하지만, `useFactory` provider는 팩토리 함수를 **metatype으로 참조**하여 실제 값 접근을 부트스트래핑 후반으로 **지연**시킬 수 있다.

```typescript
// useValue - 값에 의한 접근 (직렬화 필요)
{ provide: 'SCHEMA', useValue: complexSchema }

// useFactory - 참조에 의한 접근 (직렬화 불필요)  
{ provide: 'SCHEMA', useFactory: () => complexSchema }
```


---

## 해결 방법

### 방법 1: useFactory 사용 (GitHub 이슈 권장)

이슈에서 가장 많이 추천된 방법이다. `useValue` 대신 `useFactory`를 사용하면 복잡한 객체가 직렬화되지 않는다.

```typescript
// Before - 느림
{ provide: 'SCHEMA', useValue: schema }

// After - 빠름
{ provide: 'SCHEMA', useFactory: () => schema }
```

**MongooseModule의 경우**, 내부적으로 `useValue`를 사용하기 때문에 직접 수정할 수 없다. 따라서 다른 방법을 고려해야 한다.

### 방법 2: 경고 무시 (현실적 선택)

60ms의 직렬화 시간은 애플리케이션 **시작 시 한 번만** 발생한다. 런타임 성능에는 영향이 없으므로, 대규모 프로젝트에서는 수용 가능한 수준이다.

```typescript
// 커스텀 로거로 특정 경고 필터링
const app = await NestFactory.create(AppModule, {
  logger: new CustomLogger(), // 특정 경고 무시
});
```

### 방법 3: MongooseModule re-export 방식 변경

`exports`에서 `forFeature()`를 직접 호출하는 대신 `MongooseModule`만 re-export한다.

```typescript
@Global()
@Module({
  imports: [
    MongooseModule.forFeature(adminSchemas),
  ],
  providers: [],
  exports: [MongooseModule, ...],  // 변경
})
export class MongoDBConfigModule {}
```

### 방법 4: 모듈 분리

하나의 거대한 DB 모듈 대신 도메인별로 분리한다.

```typescript
// user-db.module.ts
@Module({
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
  ])],
  exports: [MongooseModule],
})
export class UserDBModule {}

// product-db.module.ts  
@Module({
  imports: [MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema },
  ])],
  exports: [MongooseModule],
})
export class ProductDBModule {}
```

**장점**: 각 모듈의 직렬화 시간이 분산되고, 필요한 모듈만 import 가능

**단점**: 기존 코드 수정이 많이 필요

### 방법 5: NestJS 업데이트 

GitHub PR [#13336](https://github.com/nestjs/nest/pull/13336)에서 NestJS 창시자 Kamil이 직렬화 성능 개선 작업을 진행했고 11 버전에서 근본적인 해결이 이루어지는 것으로 확인이 된다.

---

## 참고 자료

- [GitHub Issue #12738](https://github.com/nestjs/nest/issues/12738)
- [GitHub PR #12739 - Warning 추가](https://github.com/nestjs/nest/pull/12739)
- [GitHub PR #13336 - 성능 개선 작업](https://github.com/nestjs/nest/pull/13336)
