# Memory

### Allocation failed — process out of memory
- Node.js 메모리 부족으로 인해 발생하는 이슈
- Node.js 버전별로 기본 heap 메모리 사이즈가 다르다.
```
Node.js Version   Limit
----------------- -------
20.x             4.0 GB
19.x             4.0 GB
18.x             4.0 GB
17.x             4.0 GB
16.x             4.0 GB
15.x             4.0 GB  
14.x             4.0 GB  
13.x             2.0 GB  
12.x             2.0 GB  
11.x             1.4 GB  
10.x             1.4 GB  
9.x              1.4 GB.
```
- [참고글](https://medium.com/geekculture/node-js-default-memory-settings-3c0fe8a9ba1)
- heap 메모리 사이즈를 확인하는 방법
```bash
$ node

> v8.getHeapStatistics()
{
  ....
  heap_size_limit: ,
}
```
- heap 메모리 사이즈를 늘리는 방법
```bash
NODE_OPTIONS=--max_old_space_size=xxx 
```

- [참고글](https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js)
