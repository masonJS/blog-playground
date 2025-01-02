# Intro.
좋은 소프트웨어 설계를 위해 좋은 코드를 위해 우리는 테스트 코드를 작성해야된다는 글을 봐왔을 것이다.  
하지만 **몇몇 개발자**는 테스트 코드를 작성하는것에 공감을 못하기도 하면서 테스트를 막상 작성한다고 하더라도 효과를 보지 못하는 경우들이 있다.

몇몇 개발자중 한명이 바로 필자 였다.  
처음 신입 개발자로 개발 전선을 들어왔을때 기능 개발에만 초점을 맞추고 테스트는 코드로 하는 것이 아닌 내 코드에 대한 믿음(?)으로 하는 것이라는 이상한 생각을 가졌다.

![believe.png](believe.png)
<center>[데브경수]- 민간신앙></center>

실제로 신입시절 회사에 새로 오신 시니어 개발자분이 필자에게 해당 기능에 대한 테스트는 어떻게 하는지 여쭤봤고  
필자는 “테스트 코드가 필요하지 않게 완벽하게 기능 개발을 하고 있다.”라는 말을 했다.

두번째 회사로 들어왔을때 테스트 코드를 도입하기 위해 노력해봤지만 http api를 테스트하는 수준 정도의 효과 밖에 보지 못해 이점보다는 부차적인 비용만 들었던 적도 있다.

경험을 하고 지금에서야 생각이 드는 건 **“내가 지금까지 테스트 코드를 작성해야되는 이유와 잘 작성하는 방법을 몰랐구나."** 라는 것이다.
그래서 이번 글은 테스트 코드를 왜 작성해야 되고 잘 작성하는 방법에 대해서 내가 조언받았고 배웠던 내용들을 정리해보려고 한다.